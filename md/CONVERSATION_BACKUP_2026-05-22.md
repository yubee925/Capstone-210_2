# Conversation Backup

작성일: 2026-05-22
프로젝트: 성동구 젠트리피케이션 전조 탐지 대시보드

## 1. Markdown 전체 확인

사용자 요청에 따라 현재 작업공간의 Markdown 파일을 모두 읽고 백업 맥락을 복원함.

확인한 파일:

- `PROJECT_CONTEXT.md`
- `md/CONVERSATION_BACKUP_2026-05-07.md`
- `md/CONVERSATION_BACKUP_2026-05-08.md`
- `md/CONVERSATION_BACKUP_2026-05-17.md`
- `deploy/vercel/README.md`
- `metro-flow-chat/README.md`

## 2. 현재 복원된 핵심 맥락

- 프로젝트 목적은 성수동 단일 지역이 아니라 성동구 인접 지역으로 확산되는 젠트리피케이션 전조를 탐지하는 것임.
- 최종 위험도 점수는 성동구 내부 상대 비교용 점수이며, 실제 규모 차이는 보조 강도 점수로 해석함.
- 결과 해석에서 `소득`이라고 단정하지 않고 `소비성향 비율` 또는 `상업·소비 지출 비율` 프록시로 설명해야 함.
- 주요 대시보드 파일은 `dashboard/index_llm_recommend.html`, `dashboard/app_llm_recommend.js`, `dashboard/styles_llm_recommend.css`임.
- 배포용 복사본은 `deploy/vercel/` 아래에서 별도로 관리함.

## 3. 기존 백업 기준 정리

- 가장 오래된 작업 백업: `md/CONVERSATION_BACKUP_2026-05-07.md`
- 점수 설명과 보조 강도 UI 반영 기록: `md/CONVERSATION_BACKUP_2026-05-08.md`
- Markdown 전체 확인, 배포 상태, Kakao API 연동 구조 기록: `md/CONVERSATION_BACKUP_2026-05-17.md`

## 4. 참고 메모

- `deploy/vercel/README.md`에는 Vercel 배포 복사본 구조와 `OPENAI`, `GEMINI`, `KAKAO`, `generic` provider 환경변수 구성이 정리되어 있음.
- `metro-flow-chat/README.md`는 별도의 React + Vite 템플릿 안내 문서이며, 현재 성동구 대시보드 핵심 맥락과는 직접 관련이 크지 않음.

## 5. 이번 요청 처리 기록

- 작업공간의 Markdown 파일을 읽어 이전 대화 및 프로젝트 맥락을 복원함.
- 기존 백업 파일은 수정하지 않았음.
- 오늘자 복원 기록을 `md/CONVERSATION_BACKUP_2026-05-22.md`로 새로 추가함.
