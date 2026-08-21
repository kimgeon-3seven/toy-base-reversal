create table if not exists public.leaderboard_entries (
  player_id uuid primary key,
  player_name varchar(24) not null check (char_length(btrim(player_name)) between 1 and 24),
  challenge_round integer not null check (challenge_round between 1 and 100000),
  attack_time_ms integer not null check (attack_time_ms between 1 and 90000),
  achieved_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_entries enable row level security;
revoke all on table public.leaderboard_entries from anon, authenticated;

create or replace function public.submit_leaderboard_entry(
  p_player_id uuid,
  p_player_name text,
  p_challenge_round integer,
  p_attack_time_ms integer,
  p_achieved_at timestamptz
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(btrim(p_player_name)) not between 1 and 24 then
    raise exception 'invalid player name';
  end if;
  if p_challenge_round not between 1 and 100000 then
    raise exception 'invalid challenge round';
  end if;
  if p_attack_time_ms not between 1 and 90000 then
    raise exception 'invalid attack time';
  end if;

  insert into public.leaderboard_entries (
    player_id,
    player_name,
    challenge_round,
    attack_time_ms,
    achieved_at,
    updated_at
  ) values (
    p_player_id,
    btrim(p_player_name),
    p_challenge_round,
    p_attack_time_ms,
    p_achieved_at,
    now()
  )
  on conflict (player_id) do update
  set
    player_name = excluded.player_name,
    challenge_round = excluded.challenge_round,
    attack_time_ms = excluded.attack_time_ms,
    achieved_at = excluded.achieved_at,
    updated_at = now()
  where
    excluded.challenge_round > public.leaderboard_entries.challenge_round
    or (
      excluded.challenge_round = public.leaderboard_entries.challenge_round
      and excluded.attack_time_ms < public.leaderboard_entries.attack_time_ms
    )
    or (
      excluded.challenge_round = public.leaderboard_entries.challenge_round
      and excluded.attack_time_ms = public.leaderboard_entries.attack_time_ms
      and excluded.achieved_at < public.leaderboard_entries.achieved_at
    );

  update public.leaderboard_entries
  set player_name = btrim(p_player_name), updated_at = now()
  where player_id = p_player_id and player_name <> btrim(p_player_name);
end;
$$;

create or replace function public.get_leaderboard(
  p_player_id uuid,
  p_limit integer default 10
) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      player_id,
      player_name,
      challenge_round,
      attack_time_ms,
      achieved_at,
      row_number() over (
        order by challenge_round desc, attack_time_ms asc, achieved_at asc, player_name asc
      )::integer as rank
    from public.leaderboard_entries
  ),
  top_entries as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'playerId', player_id::text,
      'playerName', player_name,
      'challengeRound', challenge_round,
      'attackTimeMs', attack_time_ms,
      'achievedAt', achieved_at,
      'rank', rank
    ) order by rank), '[]'::jsonb) as entries
    from (select * from ranked order by rank limit greatest(1, least(p_limit, 100))) limited
  ),
  current_player as (
    select jsonb_build_object(
      'playerId', player_id::text,
      'playerName', player_name,
      'challengeRound', challenge_round,
      'attackTimeMs', attack_time_ms,
      'achievedAt', achieved_at,
      'rank', rank
    ) as entry
    from ranked
    where player_id = p_player_id
  )
  select jsonb_build_object(
    'topEntries', top_entries.entries,
    'currentPlayerEntry', current_player.entry
  )
  from top_entries
  left join current_player on true;
$$;

revoke all on function public.submit_leaderboard_entry(uuid, text, integer, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.get_leaderboard(uuid, integer) from public, anon, authenticated;
grant execute on function public.submit_leaderboard_entry(uuid, text, integer, integer, timestamptz) to service_role;
grant execute on function public.get_leaderboard(uuid, integer) to service_role;
