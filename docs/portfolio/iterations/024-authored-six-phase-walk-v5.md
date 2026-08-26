# 024 · 고유 6단계 보행 v5

## 문제 재정의

`v4`는 발 영역 픽셀 차이 검사를 통과했지만 실제 플레이에서는 여전히 걷는
느낌이 약했다. 사용자 검토로 접지 자세 사이에 다리가 몸 아래를 통과하는
자세가 없다는 점을 확인했다. 코드 확인 결과 4개 생성 원본을
`0 → 1 → 2 → 3 → 2 → 1`로 복제해 6프레임으로 만들고 있었다.

따라서 문제는 프레임 재생 실패가 아니라 고유한 보행 단계가 부족한 자산과
파이프라인에 있었다.

## 해결 방식

1. 각 방향을 `왼발 접지 → 하강 → 오른발 통과 → 오른발 접지 → 하강 →
   왼발 통과`의 고유 6자세로 제작했다.
2. 생성 안정성을 위해 북·북동·동·남동·남 5방향만 직접 만들었다.
3. 남서·서·북서는 대응하는 오른쪽 방향을 결정적으로 좌우 반전했다.
4. `AuthoredSixFrameCycle`은 0~5번 프레임을 복제 없이 그대로 사용한다.
5. 태엽 군단과 고무줄 사수의 보행 배율만 `0.78`로 낮춰 통과 자세가
   화면에서 읽히는 시간을 확보했다.
6. 승인된 방패병·지휘관·공격 애니메이션·전투 논리는 변경하지 않았다.

## 사용 도구

- OpenAI 내장 이미지 생성 도구
- 모드: `precise-object-edit`
- 편집 기준: `v4` 생성 원본
- 생성 결과는 `artifacts/sprite-source`에 프로젝트 자산으로 보존

## 최종 생성 프롬프트

### 태엽 군단

```text
Use case: precise-object-edit
Asset type: production toy-strategy game walk-cycle source grid.
Input images: Image 1 is the exact clockwork toy soldier identity and rendering reference.
Primary request: Produce EXACTLY 30 sprites arranged as a strict 6-column by 5-row grid. There must be exactly five rows, no sixth row. Row directions from top to bottom: NORTH (back view), NORTHEAST (back-right three-quarter), EAST (right profile), SOUTHEAST (front-right three-quarter), SOUTH (front view). Left-facing directions will be mirrored later and must not appear.
Every row uses this exact six-pose sequence:
1 LEFT CONTACT: left boot far forward, right boot far back.
2 LEFT DOWN: both knees bent, rear right heel clearly lifted.
3 RIGHT PASSING: right knee and boot directly beneath torso, feet close together.
4 RIGHT CONTACT: right boot far forward, left boot far back.
5 RIGHT DOWN: both knees bent, rear left heel clearly lifted.
6 LEFT PASSING: left knee and boot directly beneath torso, feet close together.
All six poses must be unique. Columns 3 and 6 are essential narrow passing silhouettes between wide contact silhouettes. At 64px character height each boot must visibly travel by at least 6px between adjacent frames.
Invariants: preserve face, helmet, torso, arms, gloves, chest, wind-up key, proportions, palette, polished warm 3D toy materials, lighting, camera elevation and character identity. Lock head and torso to the same cell center. Change only hips, legs, knees and boots.
Composition: exact 6x5 grid, equal cell spacing, one complete character per cell, no crop, no grid lines.
Background: perfectly uniform pure magenta #FF00FF.
Avoid: more or fewer than 30 characters, sixth row, left-facing rows, duplicated poses, ping-pong copies, missing passing frames, static split legs, torso drift, arm movement, extra or missing limbs, text, labels, borders, scenery, shadows, logos, watermark.
```

### 고무줄 사수

```text
Use case: precise-object-edit
Asset type: production toy-strategy game walk-cycle source grid.
Input images: Image 1 is the exact rubber-band slingshot ranger identity and rendering reference.
Primary request: Produce EXACTLY 30 sprites arranged as a strict 6-column by 5-row grid. There must be exactly five rows, no sixth row. Row directions from top to bottom: NORTH (back view), NORTHEAST (back-right three-quarter), EAST (right profile), SOUTHEAST (front-right three-quarter), SOUTH (front view). Left-facing directions will be mirrored later and must not appear.
Every row uses this exact six-pose sequence:
1 LEFT CONTACT: left boot far forward, right boot far back.
2 LEFT DOWN: both knees bent, rear right heel clearly lifted.
3 RIGHT PASSING: right knee and boot directly beneath torso, feet close together.
4 RIGHT CONTACT: right boot far forward, left boot far back.
5 RIGHT DOWN: both knees bent, rear left heel clearly lifted.
6 LEFT PASSING: left knee and boot directly beneath torso, feet close together.
All six poses must be unique. Columns 3 and 6 are essential narrow passing silhouettes between wide contact silhouettes. At 70px character height each boot must visibly travel by at least 6px between adjacent frames.
Invariants: preserve face, hair, feathered cream hat, torso, arms, hands, backpack, rubber-band slingshot, clothing, proportions, palette, polished warm 3D toy materials, lighting, camera elevation and character identity. Lock head and torso to the same cell center. Change only hips, legs, knees and boots. The arms and slingshot must remain static and never aim, stretch or fire.
Composition: exact 6x5 grid, equal cell spacing, one complete character per cell, no crop, no grid lines.
Background: perfectly uniform pure magenta #FF00FF.
Avoid: more or fewer than 30 characters, sixth row, left-facing rows, duplicated poses, ping-pong copies, missing passing frames, static split legs, torso drift, slingshot motion, extra or missing limbs, text, labels, borders, scenery, shadows, logos, watermark.
```

## 자산 경로

- `artifacts/sprite-source/unit-windup-walk-grid-v5-magenta.png`
- `artifacts/sprite-source/unit-ranger-walk-grid-v5-magenta.png`
- `public/assets/sprites/tower-defense/unit-windup-walk-8way-v5.png`
- `public/assets/sprites/tower-defense/unit-ranger-walk-8way-v5.png`

## QA

- 8방향 × 6프레임, 총 48프레임씩 생성
- 모든 방향에서 6개 프레임이 서로 다른지 자동 검사
- 태엽 군단 64px: 최소 전체 프레임 차이 `6.66`, 최소 발 실루엣 변화 `25`
- 고무줄 사수 70px: 최소 전체 프레임 차이 `4.38`, 최소 발 실루엣 변화 `36`
- 태엽 군단 반대 접지 자세 발 변화: 방향별 최대 `185픽셀`
- 전체 75개 테스트 파일, 242개 테스트 통과
- ESLint, TypeScript, 프로덕션 빌드 통과
- 로컬 3라운드 방어에서 NPC 보행과 콘솔 오류 0건 확인

## 포트폴리오 포인트

자동 지표가 통과했는데도 사용자가 움직임을 느끼지 못한 사실을 오류로
인정하고, 픽셀 차이에서 보행 단계의 의미로 QA 기준을 바꿨다. 생성형 자산의
행·열 불확실성도 5방향 생성과 결정적 반전 파이프라인으로 제어했다.
