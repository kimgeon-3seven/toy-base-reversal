# 022 · 태엽 군단·고무줄 사수 보행 자세 재제작

## 목표

- 사용자 QA에서 거의 정지해 보인 태엽 군단의 보행을 작은 화면에서도 읽히게 만든다.
- 고무줄 사수의 걷기 자세 변화를 명확하게 하되 무기 조준·공격 동작은 바꾸지 않는다.
- 이미 승인된 방패병 보행, 두 유닛의 공격 애니메이션과 전투 로직은 그대로 유지한다.

## 원인 분석

`v2`는 기존 그림을 `접지 → 통과 → 반대 접지 → 통과`로 재배열해 루프 경계는
안정화했지만, 태엽 군단 원본의 다리 차이가 56px 실제 표시 크기에서 너무 작았다.
고무줄 사수도 프레임 사이 중심축과 자세 변화량이 고르지 않아 이동보다 그림이
흔들리는 인상이 남았다. 재생 속도만 바꾸어서는 해결할 수 없는 원본 자세 문제였다.

## Codex·이미지 생성 협업

OpenAI 내장 이미지 생성 도구에 기존 캐릭터를 정체성·방향 기준으로 제공하고,
8방향마다 네 가지 보행 자세를 다시 만들었다. 생성 결과는 마젠타 원본으로
보존하고 Codex가 작성한 스크립트로 투명화, 셀 추론, 공통 배율·발 기준선 정렬,
6프레임 핑퐁 루프 생성을 결정론적으로 처리했다.

### 태엽 군단 프롬프트

> Use case: precise-object-edit. Asset type: production top-down game character walk sprite sheet for later chroma-key extraction. Input image: Image 1 is the exact character-identity and direction reference. Rebuild the same clockwork toy soldier as an exact 4-column by 8-row walk sprite sheet. Row order: north, northeast, east, southeast, south, southwest, west, northwest. Each row: left-foot contact, passing pose, right-foot contact, passing pose. Make the east-facing row's foot alternation and knee swing clearly readable at 56 pixels tall. Preserve the original warm polished 3D toy style, brown-and-cream helmet, simple face, chest details, gloves, boots, brass rear wind-up key, proportions, lighting, materials, and palette. Exactly one full-body sprite per cell, consistent centered scale, equal spacing, shared foot baseline within each row. Use a completely flat, uniform, vivid pure magenta #FF00FF background, including between and behind every sprite, with no gradient, texture, glow, or shadow. Change only limb poses needed for walking. Keep head, torso, helmet, chest, wind-up key, camera angle, scale, and facing direction stable. No cell borders, grid lines, labels, text, scenery, extra objects, duplicated limbs, cropping, zoom changes, body resizing, or direction changes.

### 고무줄 사수 프롬프트

> Use case: precise-object-edit. Asset type: production top-down game character walk sprite sheet for later chroma-key extraction. Input image: Image 1 is the exact character-identity and direction reference. Rebuild the same toy rubber-band slingshot ranger as an exact 4-column by 8-row walk sprite sheet. Row order: north, northeast, east, southeast, south, southwest, west, northwest. Each row: left-foot contact, passing pose, right-foot contact, passing pose. Walking must read clearly at 62 pixels tall. Preserve the original polished warm 3D toy style, cream feathered hat, brown-and-cream clothing, backpack, rubber-band slingshot, proportions, lighting, materials, and palette. Exactly one full-body sprite per cell, consistent centered scale, equal spacing, shared foot baseline within each row. Use a completely flat, uniform, vivid pure magenta #FF00FF background, including between and behind every sprite, with no gradient, texture, glow, or shadow. Change only leg and free-arm poses needed for walking. The head, torso, hat, face, backpack, and slingshot must remain stable with identical size and orientation between frames; the slingshot must not aim, rotate, stretch, or change shape while walking. No cell borders, grid lines, labels, text, scenery, extra objects, duplicated limbs, cropping, zoom changes, body resizing, or direction changes.

## 구현

1. 생성 원본 두 장을 `artifacts/sprite-source`에 보존했다.
2. `stabilize-walk-sprite-sheet.ps1`에 마젠타 크로마키, 불규칙 생성 셀의
   가중 군집 경계 추론, `0 → 1 → 2 → 3 → 2 → 1` 핑퐁 루프를 추가했다.
3. 접지 프레임은 셀 `y=150`, 통과 프레임은 `y=147`에 정렬해 3px의 절제된
   수직 리듬을 만들었다.
4. `DirectionalAnimationProfile`이 유닛별 보행 열 수를 소유하게 해 방패병은
   기존 4프레임, 태엽 군단·고무줄 사수만 6프레임을 사용한다.
5. 보행 자산만 `v3`로 연결했다. 방패병 `v2`와 공격 시트 `v1`은 변경하지 않았다.

## 구조

원본 변환은 `stabilize-walk-sprite-sheet.ps1`, 품질 기준은
`verify-walk-sprite-sheet.ps1`, 자산 선택은 `GameAssets`, 방향·프레임 정책은
`DirectionalAnimationCatalog`, 화면 표시는 `BattlefieldSpriteView`가 맡는다.
생성, 검증, 정책과 렌더링의 책임을 분리해 특정 유닛만 다시 제작할 수 있다.

## QA

- 두 `v3` 시트 모두 `960×1280`, 8방향 × 6프레임, 투명 배경 확인
- 태엽 군단 56px 표시 크기에서 최소 인접 프레임 평균 차이 `15.85`
- 고무줄 사수 62px 표시 크기에서 최소 인접 프레임 평균 차이 `10.21`
- 모든 방향의 접지/통과 기준선과 핑퐁 중복 프레임 자동 검증 통과
- 자산 경로와 4/6프레임 프로필 회귀 테스트 통과
- ESLint, TypeScript, 전체 73개 테스트 파일·236개 테스트 통과
- GitHub Pages·itch.io 프로덕션 빌드 통과
- 로컬 3라운드 방어에서 NPC 태엽 군단·고무줄 사수 연속 보행과 기존 방패병 표시 확인

## 포트폴리오 포인트

첫 보정이 루프 연결은 개선했지만 자세 자체가 약하다는 사용자 QA를 받아들여,
속도 조절이 아니라 원본 프레임 재제작으로 원인을 좁혔다. 생성형 이미지 결과를
그대로 넣지 않고 원본·프롬프트·결정론적 변환·실표시 크기 정량 검증·브라우저
QA를 하나의 재현 가능한 자산 파이프라인으로 남겼다.
