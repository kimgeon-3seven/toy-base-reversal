# Supabase 온라인 순위표 연결

게임 클라이언트는 Supabase 공개용 키만 사용합니다. 데이터베이스 비밀 키는 Edge Function 내부에서만 사용하며 브라우저 번들 또는 Git 저장소에 추가하지 않습니다.

## 포함된 구성

- `supabase/migrations/202608210001_create_leaderboard.sql`: 순위 테이블, 최고 기록 갱신 함수, 순위 조회 함수
- `supabase/functions/leaderboard/index.ts`: 공개 요청 검증, 기록 제출과 조회 API
- `.env.example`: Vite 클라이언트 환경변수 예시

## 연결 순서

1. Supabase에서 새 프로젝트를 만든다.
2. Supabase CLI로 이 저장소를 프로젝트에 연결한다.
3. 데이터베이스 마이그레이션을 적용한다.
4. 배포할 게임 주소를 Edge Function의 `ALLOWED_ORIGIN` 비밀값으로 설정한다. 로컬 확인 중에는 `http://127.0.0.1:5173`을 사용한다.
5. `leaderboard` Edge Function을 `verify_jwt=false` 설정으로 배포한다.
6. 프로젝트의 Connect 화면에서 Project URL과 `sb_publishable_...` 공개용 키를 확인한다.
7. `.env.example`을 참고해 `.env.local`을 만들고 다음 값을 설정한다.

```dotenv
VITE_LEADERBOARD_ENDPOINT=https://PROJECT_REF.supabase.co/functions/v1/leaderboard
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

대표 CLI 명령은 다음과 같다.

```bash
supabase link --project-ref PROJECT_REF
supabase db push
supabase secrets set ALLOWED_ORIGIN=http://127.0.0.1:5173
supabase functions deploy leaderboard --no-verify-jwt
```

`.env.local`은 `.gitignore`의 `*.local` 규칙으로 Git에 포함되지 않습니다.

## 보안 범위

- `anon`, `authenticated` 역할은 순위 테이블과 DB 함수에 직접 접근할 수 없습니다.
- Edge Function은 공개용 키를 확인한 다음 UUID, 닉네임 길이, 라운드와 공격시간 범위를 다시 검증합니다.
- 데이터베이스는 플레이어별 더 높은 라운드 또는 같은 라운드의 더 짧은 기록만 갱신합니다.
- 현재 프로토타입은 클라이언트에서 게임이 실행되므로 조작된 플레이 자체를 완전히 증명할 수 없습니다. 실제 상용 수준의 부정행위 방지는 서버 권위형 전투 검증 또는 리플레이 검증이 추가로 필요합니다.

공식 참고 문서: [Supabase API 키](https://supabase.com/docs/guides/getting-started/api-keys), [API 보안](https://supabase.com/docs/guides/api/securing-your-api), [Edge Functions](https://supabase.com/docs/guides/functions)
