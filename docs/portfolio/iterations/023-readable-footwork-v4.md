# 023 · 실제 화면에서 읽히는 발동작 v4

## 목표

- 사용자 녹화 영상에서 확인된 태엽 군단·고무줄 사수의 미끄러지는 듯한 이동을 개선한다.
- 전체 이미지 차이가 아니라 실제 표시 크기의 발 실루엣으로 품질을 검증한다.
- 승인된 방패병 보행, 모든 공격 애니메이션과 전투 논리 좌표는 변경하지 않는다.

## 영상 기반 원인 분석

8.4초 플레이 영상을 약 0.14초 간격으로 확대 비교했다. 두 유닛 모두 좌표와
애니메이션 프레임은 정상적으로 진행됐지만 발 모양은 거의 유지됐다. 따라서
자산 누락이나 상태 머신 오류가 아니라 다음 세 요인이 겹친 문제였다.

1. `v3` 자세 차이가 실제 56px·62px에서 충분히 크지 않았다.
2. 태엽 군단 두 개체가 같은 경로에서 가까이 겹쳐 서로의 다리를 가렸다.
3. 기존 검증은 캐릭터 전체 픽셀 차이를 측정해 팔·몸통 변화만으로도 통과했다.

## 이미지 생성 협업

OpenAI 내장 이미지 생성 도구에서 `v3` 생성 원본을 정체성 기준으로 사용했다.
프롬프트의 핵심 제약은 다음과 같다.

### 태엽 군단

> Keep the same exact 4-column by 8-row clockwork toy soldier layout, but redraw only hips, legs, knees, and boots. At 56 pixels tall every adjacent lower-body silhouette must differ by at least 4 visible pixels. Contact poses need one full boot-width of separation; passing poses need clear pure-magenta space below the lifted boot. Preserve head, helmet, torso, arms, chest, wind-up key, lighting, material, camera, scale, cell centers, and direction. Keep the torso and head stable. Use a completely flat #FF00FF background. No subtle shuffling, hidden feet, body translation, duplicated limbs, text, grid, scenery, logo, or watermark.

### 고무줄 사수

> Keep the same exact 4-column by 8-row rubber-band ranger layout, but redraw only hips, legs, knees, and boots. At 62 pixels tall every adjacent lower-body silhouette must differ by at least 5 visible pixels. Contact poses need one full boot-width of separation; passing poses need clear pure-magenta space below the lifted boot. Preserve face, hair, feathered hat, torso, arms, backpack, slingshot, clothing, lighting, material, camera, scale, cell centers, and direction. The slingshot must never aim, rotate, stretch, fire, or change shape. Use a completely flat #FF00FF background. No subtle shuffling, hidden feet, body translation, duplicated limbs, text, grid, scenery, logo, or watermark.

생성 원본은 `artifacts/sprite-source`에 남기고 기존 크로마키·축 정렬 파이프라인으로
투명 8방향 × 6프레임 `v4` 시트를 만들었다.

## 구현

1. 태엽 군단·고무줄 사수 보행 자산만 `v4`로 연결했다.
2. `ReadableCombatantVisualSizePolicy`가 방패병 68px을 유지하면서 태엽 군단
   64px, 고무줄 사수 70px의 웹게임 가독성 크기를 제공한다.
3. `SwarmFormationOffsetPolicy`가 연속 태엽 개체를 위아래 4px로 분리한다.
   논리 좌표·경로 탐색·피격 판정에는 영향을 주지 않는 표현 전용 값이다.
4. `verify-walk-sprite-sheet.ps1`에 실제 표시 크기의 하단 25% 알파 실루엣
   변화량과 방향별 반대 접지 자세 비교를 추가했다.
5. 생성, 자산 선택, 크기 정책, 편대 간격 정책과 렌더링 책임을 분리했다.

## QA 기준

- 태엽 군단: 64px에서 최소 전체 프레임 차이 `14.06`, 발 실루엣 변화 `64픽셀`
- 고무줄 사수: 70px에서 최소 전체 프레임 차이 `10.04`, 발 실루엣 변화 `54픽셀`
- 모든 방향의 48프레임, 접지 `y=150`, 통과 `y=147`, 핑퐁 중복 프레임 검증
- 방패병 68px과 공격 자산 `v1` 경로 유지 테스트
- NPC·플레이어가 같은 크기·간격·애니메이션 정책을 사용
- 로컬 3라운드 방어에서 확대된 두 유닛, 분리된 태엽 개체와 기존 방패병 확인
- ESLint, TypeScript, 전체 75개 테스트 파일·241개 테스트 통과
- GitHub Pages·itch.io 프로덕션 빌드와 브라우저 콘솔 오류 0건 확인

## 포트폴리오 포인트

첫 자동 QA의 수치가 사용자 체감과 어긋난 사실을 숨기지 않고, 실제 플레이
영상으로 검증 단위를 다시 정의했다. 생성형 자산을 반복 제작하는 데서 끝내지
않고 발 영역 지표, 표현 전용 편대 정책과 브라우저 QA를 결합해 사용자에게
보이는 문제를 측정 가능한 품질 기준으로 전환했다.
