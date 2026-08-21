import { createClient } from 'npm:@supabase/supabase-js@2';

interface SubmissionBody {
  readonly playerId: string;
  readonly playerName: string;
  readonly challengeRound: number;
  readonly attackTimeMs: number;
  readonly achievedAt: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function configuredKey(variableName: string, legacyName: string): string {
  const current = Deno.env.get(variableName);
  if (current !== undefined) {
    const parsed = JSON.parse(current) as Record<string, unknown>;
    const defaultKey = parsed.default;
    if (typeof defaultKey === 'string') return defaultKey;
  }
  const legacy = Deno.env.get(legacyName);
  if (legacy === undefined) throw new Error(`${variableName} is not configured.`);
  return legacy;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
if (supabaseUrl === undefined) throw new Error('SUPABASE_URL is not configured.');
const publishableKey = configuredKey(
  'SUPABASE_PUBLISHABLE_KEYS',
  'SUPABASE_ANON_KEY',
);
const secretKey = configuredKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false },
});

function corsHeaders(request: Request): HeadersInit {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
  const requestOrigin = request.headers.get('origin') ?? '';
  const origin = allowedOrigin === '*' ? '*' : requestOrigin === allowedOrigin ? requestOrigin : 'null';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'apikey, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'content-type': 'application/json; charset=utf-8',
    vary: 'Origin',
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request),
  });
}

function isValidSubmission(value: unknown): value is SubmissionBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Partial<SubmissionBody>;
  return (
    typeof body.playerId === 'string' &&
    UUID_PATTERN.test(body.playerId) &&
    typeof body.playerName === 'string' &&
    body.playerName.trim().length >= 1 &&
    body.playerName.trim().length <= 24 &&
    Number.isInteger(body.challengeRound) &&
    (body.challengeRound ?? 0) >= 1 &&
    (body.challengeRound ?? 0) <= 100000 &&
    Number.isInteger(body.attackTimeMs) &&
    (body.attackTimeMs ?? 0) >= 1 &&
    (body.attackTimeMs ?? 0) <= 90000 &&
    typeof body.achievedAt === 'string' &&
    !Number.isNaN(Date.parse(body.achievedAt))
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.headers.get('apikey') !== publishableKey) {
    return json(request, { error: 'unauthorized' }, 401);
  }

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const playerId = url.searchParams.get('playerId') ?? '';
      const requestedLimit = Number(url.searchParams.get('limit') ?? '10');
      if (!UUID_PATTERN.test(playerId) || !Number.isInteger(requestedLimit)) {
        return json(request, { error: 'invalid query' }, 400);
      }
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_player_id: playerId,
        p_limit: Math.max(1, Math.min(requestedLimit, 100)),
      });
      if (error !== null) throw error;
      return json(request, data);
    }

    if (request.method === 'POST') {
      const body: unknown = await request.json();
      if (!isValidSubmission(body)) {
        return json(request, { error: 'invalid submission' }, 400);
      }
      const { error } = await supabase.rpc('submit_leaderboard_entry', {
        p_player_id: body.playerId,
        p_player_name: body.playerName.trim(),
        p_challenge_round: body.challengeRound,
        p_attack_time_ms: body.attackTimeMs,
        p_achieved_at: body.achievedAt,
      });
      if (error !== null) throw error;
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    return json(request, { error: 'method not allowed' }, 405);
  } catch {
    return json(request, { error: 'leaderboard unavailable' }, 503);
  }
});
