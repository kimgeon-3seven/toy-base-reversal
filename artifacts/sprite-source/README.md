# 보행 스프라이트 생성 원본

이 폴더에는 2026-08-26 OpenAI 내장 이미지 생성 도구로 만든 프로젝트 소유
원본을 보관한다. 원본은 생성 결과의 불규칙한 여백을 안전하게 분리하기 위해
단색 마젠타 배경을 사용한다.

- `unit-windup-walk-grid-v3-magenta.png`: 태엽 군단 8방향 × 4자세
- `unit-ranger-walk-grid-v3-magenta.png`: 고무줄 사수 8방향 × 4자세

게임용 투명 8방향 × 6프레임 시트는 다음 명령으로 재생성한다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stabilize-walk-sprite-sheet.ps1 `
  -InputPath artifacts/sprite-source/unit-windup-walk-grid-v3-magenta.png `
  -OutputPath public/assets/sprites/tower-defense/unit-windup-walk-8way-v3.png `
  -PingPongCycle -MagentaChromaKey -PassingLiftPixels 3

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stabilize-walk-sprite-sheet.ps1 `
  -InputPath artifacts/sprite-source/unit-ranger-walk-grid-v3-magenta.png `
  -OutputPath public/assets/sprites/tower-defense/unit-ranger-walk-8way-v3.png `
  -PingPongCycle -MagentaChromaKey -PassingLiftPixels 3
```

실제 게임 표시 크기 기준 검증:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-walk-sprite-sheet.ps1 `
  -InputPath public/assets/sprites/tower-defense/unit-windup-walk-8way-v3.png `
  -RenderedSize 56

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-walk-sprite-sheet.ps1 `
  -InputPath public/assets/sprites/tower-defense/unit-ranger-walk-8way-v3.png `
  -RenderedSize 62
```

정확한 생성 프롬프트와 QA 결과는
`docs/portfolio/iterations/022-windup-ranger-gait-v3.md`에 기록한다.
