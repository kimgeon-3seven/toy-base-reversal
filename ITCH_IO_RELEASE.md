# itch.io 배포 안내

GitHub Pages 배포는 기존 `pnpm build`를 사용하고, itch.io 업로드 파일은 별도의 상대 경로 빌드를 사용합니다.

## 1. itch.io용 빌드

```powershell
pnpm build:itch
```

`dist-itch` 폴더 안에 `index.html`과 `assets`가 생성됩니다.

## 2. ZIP 만들기

`dist-itch` 폴더 자체가 아니라 **폴더 안의 파일들**을 압축합니다. 압축파일을 열었을 때 최상단에 `index.html`이 보여야 합니다.

권장 파일명: `toy-base-reversal-itch.zip`

빌드와 압축 구조 검증을 한 번에 실행하려면 다음 명령을 사용합니다.

```powershell
pnpm package:itch
```

패키징 스크립트는 최상단 `index.html`, `dist-itch/` 접두사 부재와 HTML에서
참조하는 상대 자산의 ZIP 포함 여부를 확인하고 SHA-256 해시를 출력합니다.

## 3. itch.io 프로젝트 설정

- Kind of project: `HTML`
- 실행 방식: `Click to launch in fullscreen`
- Mobile Friendly: 모바일 조작을 구현하기 전까지 끔
- Pricing: 무료 또는 기부 허용
- 공개 전 단계: Draft에서 먼저 실행 확인

## 4. 페이지에 넣을 내용

- 완성 문안: `ITCH_IO_PAGE_CONTENT.md`에서 복사
- 한 줄 소개: `내가 만든 방어선을, 이번에는 내가 뚫는다.`
- 핵심 흐름: `설계 → 방어 → 역할 반전 → 공략`
- 조작법: 마우스, Space, WASD, Q, E, Esc
- 커버 이미지: 630×500 권장
- 스크린샷: 방어 준비, 방어 결과, 역할 반전, 공격 전투를 포함해 3~5장
- 라이선스: `THIRD_PARTY_ASSETS.md` 내용을 요약해 표기

## 5. 공개 전 QA

- 첫 실행에서 모든 이미지와 사운드가 로드되는지 확인
- 게임 화면을 한 번 클릭한 뒤 키보드 입력과 BGM이 작동하는지 확인
- 전체 화면에서 16:10 화면이 잘리지 않는지 확인
- 일시정지의 `조작법`이 방어 설계·방어 전투·공격 준비·공격 전투 단계에 맞게 바뀌는지 확인
- GitHub Pages와 itch.io는 저장 출처가 달라 개인 기록과 음량 설정이 서로 공유되지 않는다는 점 확인
- 온라인 순위표를 사용할 경우 itch.io 주소에서도 HTTPS API와 CORS가 허용되는지 확인

## 6. 최신 로컬 패키지

- 생성일: 2026-08-26
- 파일: `toy-base-reversal-itch.zip`
- 압축 최상단 항목: 63개
- 크기: 약 27.49MB
- SHA-256: `F8DB1B02823107010FB0CF0FBD8EDA2C91E2A4636BF07D76E775E62D66C1E91D`
- 포함 기능: 일반 모드 1~5라운드, 챌린지, 로컬 기록, 일반 모드 이어하기
