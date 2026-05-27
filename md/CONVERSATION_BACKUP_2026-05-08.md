# Conversation Backup

작성일: 2026-05-08
프로젝트: 성동구 젠트리피케이션 전조 탐지 대시보드

## 1. 컨텍스트 복원

- `PROJECT_CONTEXT.md`를 읽어 현재 프로젝트 목적, 점수 산식, 대시보드 파일 구조를 복원함.
- 이전 대화 백업 파일 `CONVERSATION_BACKUP_2026-05-07.md`를 확인해 직전 작업 맥락을 이어받음.
- 직전 상태 요약:
  - 상담형 대시보드 메인 파일은 `dashboard/index_llm_recommend.html`
  - 스크립트는 `dashboard/app_llm_recommend.js`
  - 미시적 모드는 Leaflet + OpenStreetMap + 100m 격자 기반
  - 준비된 질문 모드는 실제 LLM 프록시 경유 가능

## 2. 점수 체계 설명 정리

### 사용자 요청

- 최종 점수, 위험도 점수, 보조 강도 점수를 이해하기 쉽게 정의
- 점수 해석 기준을 간단히 설명
- 변수와 정규화 방법을 설명
- 각 점수를 어떻게 구했는지 설명

### 정리한 내용

- `최종 점수 = 위험도 점수`로 설명
- 위험도 점수:
  - 성동구 내부 상대 비교용 전조 탐지 점수
  - 순위와 등급 산정 기준
- 보조 강도 점수:
  - 실제 규모 차이 해석용 보조 점수
  - 순위 결정용은 아님
- 사용 변수 8개:
  - 인구
  - 소비성향 비율
  - 유동인구
  - 회전율
  - 프랜차이즈 비율
  - 영업기간
  - 팝업 비율
  - 팝업 강도
- 위험도 점수용 정규화:
  - 인구, 소비성향 비율, 유동인구: `log1p(x)` 후 분위수 정규화
  - 회전율, 프랜차이즈 비율, 팝업 비율, 팝업 강도: 분위수 정규화
  - 영업기간: 분위수 정규화 후 `1 - 값`
- 보조 강도 점수용 정규화:
  - 인구, 소비성향 비율, 유동인구: `log1p(x)` 후 Min-Max 정규화
  - 회전율, 프랜차이즈 비율, 팝업 비율, 팝업 강도: Min-Max 정규화
  - 영업기간: Min-Max 정규화 후 `1 - 값`
- 점수 계산 방식:
  - 변수별 정규화
  - 가중치 적용
  - 가중합 후 0~100 점수화
  - 17개 동을 `상 4 / 중 9 / 하 4`로 구분

## 3. Selected Area 변수 점수 해석 확인

### 사용자 질문

- `Selected Area`는 보조 점수를 보여주는지 질문
- 각 변수 점수가 보조 강도 점수용 값인지 질문

### 확인 결과

- `Selected Area` 상단에는 두 종합 점수를 함께 표시:
  - 위험도 점수
  - 보조 강도 점수
- 그러나 변수별 표는 보조 강도용이 아니라 위험도 점수용 정규화 값만 표시하고 있었음.
- 코드 확인 결과:
  - `dashboard/app_llm_recommend.js`의 변수 표는 `record.metrics` 사용
  - `generate_risk_map.py`의 `export_dashboard_data()`에서 `metrics`는 모두 `*_risk_norm`으로 내보내고 있었음

### 정리한 판단

- 계산 논리상 틀린 구조는 아니지만, UI 해석 측면에서는 혼동 가능성이 큼
- 이유:
  - 상단에는 위험도 점수와 보조 강도 점수를 함께 보여줌
  - 하단 변수 표는 위험도 점수용 값만 보여줌
  - 사용자는 보조 강도 점수가 어떤 변수 때문에 높아졌는지 궁금해질 수 있음

## 4. 보조 강도 표시 방식 논의

### 사용자 요청

- 보조 강도 점수에 대해 각 변수값을 전부 보여주는 것과
  상위 2개 변수만 보여주고 설명을 붙이는 것 중 어떤 방식이 나은지 질문

### 정리한 판단

- 현재 대시보드 목적상 `상위 2개 변수 + 간단한 설명`이 더 적절하다고 판단
- 이유:
  - 보조 강도 점수는 순위 결정용이 아니라 실제 규모 차이 해석용
  - 전체 변수값을 모두 나열하면 핵심 해석보다 숫자 밀도만 높아질 수 있음
  - 위험도 점수용 변수 표가 이미 있어서 중복이 커질 수 있음

## 5. 보조 강도 해석 UI 추가

### 사용자 요청

- 위 내용을 실제 HTML에 반영 요청

### 수행 내용

- `Selected Area`에 보조 강도용 별도 요약 블록 추가
- 위험도 변수 표는 유지
- 보조 강도는 별도 설명 영역으로 분리

### 수정 파일

- `dashboard/index_llm_recommend.html`
- `dashboard/app_llm_recommend.js`
- `dashboard/styles_llm_recommend.css`
- `generate_risk_map.py`
- `outputs/dashboard_data.js` 재생성

### 구현 내용

- `generate_risk_map.py`
  - `intensity_metrics`를 대시보드 데이터에 추가
  - 보조 강도 기준 상위 기여 변수 `intensity_top2_drivers`를 계산해 내보내도록 수정
- `dashboard/index_llm_recommend.html`
  - `Selected Area`에 보조 강도 해석 블록 추가
- `dashboard/app_llm_recommend.js`
  - 선택 지역 변경 시 보조 강도 핵심 변수와 설명문을 렌더링하도록 연결
- `dashboard/styles_llm_recommend.css`
  - 신규 블록 스타일 추가

## 6. 보조 강도 표시 조건 개선

### 사용자 요청

- 다른 변수와 비교해 유독 큰 값을 가지는 경우에만 나오게 할지 질문
- 이어서 그렇게 수정 요청

### 적용한 기준

- 보조 강도 변수는 `intensity_metrics` 기준으로 정렬
- 다음 조건을 만족할 때만 두드러진 변수로 표시:
  - 절대 기준: `0.65 이상`
  - 상대 기준: 아래 변수와 `0.08 이상` 차이
- 결과 표시 방식:
  - 조건 충족 시 2개 표시
  - 경우에 따라 1개만 표시
  - 조건 불충분 시 특정 단일 변수 대신 복합 영향으로 설명

### UI 문구 변경

- 기존 `보조 강도 핵심 변수 TOP 2`를
  `보조 강도 두드러진 변수`로 변경
- 두드러진 단일 변수가 없을 때는
  `두드러진 단일 변수 없음` 대신 복합 영향 중심 설명을 보여주도록 정리

## 7. 보조 강도 영역 설명 문구 개선

### 사용자 요청

- 보조 강도 영역이 무엇인지 먼저 보이고
- 이어서 “이 지역은 이런 점이 두드러진다”라는 설명이 보이게 수정 요청

### 수행 내용

- 블록 제목을 `보조 강도 해석`으로 변경
- 설명문을 두 층으로 분리:
  - 상단 안내문:
    - `보조 강도는 실제 규모 차이를 읽기 위한 참고 지표입니다.`
  - 지역별 해석문:
    - 두드러진 변수가 있으면
      - `이 지역은 유동인구 규모가 다른 변수와 비교해 두드러지는 편입니다.`
      - 또는 `이 지역은 유동인구와 소비성향 규모가 다른 변수와 비교해 특히 두드러집니다.`
    - 두드러진 단일 변수가 없으면
      - `이 지역은 특정 변수 하나보다 여러 변수의 실제 규모가 함께 반영되는 특징을 보입니다.`

### 관련 파일

- `dashboard/index_llm_recommend.html`
- `dashboard/app_llm_recommend.js`
- `dashboard/styles_llm_recommend.css`

## 8. 검증

- `python3 generate_risk_map.py` 실행
- 산출물 재생성 확인:
  - `outputs/seongdong_gentrification_risk_map.png`
  - `outputs/seongdong_gentrification_scores.csv`
  - `outputs/seongdong_gentrification_scores.xlsx`
  - `outputs/dashboard_data.js`

## 9. 현재 상태 요약

- 위험도 점수 설명과 보조 강도 점수 설명을 구분해서 정리함
- `Selected Area`의 변수 표는 위험도 점수용 값이라는 점을 확인함
- `Selected Area`에 보조 강도 해석 전용 블록을 추가함
- 보조 강도는 항상 `TOP 2`를 보여주지 않고, 실제로 두드러질 때만 1개 또는 2개를 표시하도록 개선함
- 보조 강도 블록에는 영역 정의와 지역별 해석 문장이 함께 보이도록 정리함

## 10. Markdown 전체 확인 및 백업 복원 기록

### 사용자 요청

- 작업공간의 모든 Markdown 파일을 읽고 이전 대화를 백업해 달라고 요청함

### 확인한 파일

- `PROJECT_CONTEXT.md`
- `md/CONVERSATION_BACKUP_2026-05-07.md`
- `md/CONVERSATION_BACKUP_2026-05-08.md`

### 수행 내용

- 루트의 `PROJECT_CONTEXT.md`를 다시 읽어 프로젝트 목적, 데이터 규칙, 백업 정책을 재확인함
- `md/` 폴더의 기존 백업 2개를 읽어 직전 대화 맥락을 복원함
- 오늘자 백업 파일이 이미 존재하므로 새 파일을 중복 생성하지 않고, 현재 요청 처리 내역을 같은 문서에 추가 기록함

### 현재 백업 상태

- 이전 대화 복원 기준 문서:
  - `md/CONVERSATION_BACKUP_2026-05-07.md`
  - `md/CONVERSATION_BACKUP_2026-05-08.md`
- 현재 세션의 복원 작업 기록:
  - 본 문서의 `10. Markdown 전체 확인 및 백업 복원 기록` 섹션에 반영됨

## 11. Vercel 배포 및 Gemini API 연결

### 사용자 요청

- GitHub Pages 대신 현재 프로젝트 형태에 더 잘 맞는 도구로 웹 호스팅하고 싶다고 요청함
- 원본 파일은 수정하지 말고, 별도 폴더를 만들어 복사본만 수정해서 배포용 파일을 정리해 달라고 요청함
- 이후 API를 실제로 연결해 웹 호스팅까지 완료하고, 바로 볼 수 있게 해 달라고 요청함

### 배포 방식 판단

- 현재 프로젝트는 정적 프론트엔드와 Python 기반 API 프록시 구조이므로 `Vercel`이 가장 적합하다고 판단함
- 이유:
  - 정적 파일 호스팅 가능
  - Python 서버 로직을 `Vercel Functions`로 옮기기 쉬움
  - 기존 `/api/guided-answer` 호출 구조를 거의 유지 가능

### 배포용 복사본 구성

- 원본 프로젝트는 유지하고, `deploy/vercel/` 폴더를 새로 만들어 배포용 복사본을 분리함
- 복사 및 추가한 주요 파일:
  - `deploy/vercel/dashboard/index_llm_recommend.html`
  - `deploy/vercel/dashboard/app_llm_recommend.js`
  - `deploy/vercel/dashboard/styles.css`
  - `deploy/vercel/dashboard/styles_llm_recommend.css`
  - `deploy/vercel/outputs/dashboard_data.js`
  - `deploy/vercel/outputs/micro_map_data.js`
  - `deploy/vercel/api/guided-answer.py`
  - `deploy/vercel/api/guided_answer.py`
  - `deploy/vercel/index.html`
  - `deploy/vercel/vercel.json`
  - `deploy/vercel/dev_server.py`
  - `deploy/vercel/README.md`

### 구현 내용

- `serve_dashboard.py`의 핵심 상담 API 로직을 원본과 분리된 `Vercel Python Function`으로 이식함
- `/api/guided-answer` 경로를 유지하도록 구성함
- 로컬 확인용 `dev_server.py`를 별도 추가해 배포 복사본만으로 미리보기 가능하게 구성함
- 배포 루트 진입 시 `dashboard/index_llm_recommend.html`로 이동하도록 `index.html`을 추가함

### Vercel 배포 과정

- `vercel` CLI를 설치함
- Vercel 디바이스 로그인 절차를 진행함
- `deploy/vercel` 폴더를 기준으로 Production 배포를 수행함
- 배포 완료 후 실제 접속 URL을 확보함

### Gemini 환경변수 연결

- 사용자가 `Gemini`를 사용하겠다고 결정함
- Vercel 프로젝트 환경변수에 다음 값이 등록된 것을 확인함:
  - `GEMINI_API_KEY`
  - `LLM_PROVIDER`
  - `GEMINI_MODEL`
  - `GEMINI_FALLBACK_MODELS`
- 초기에는 환경변수 등록 후 재배포가 되지 않아 `has_gemini_key: false` 상태였음
- 원인을 확인한 뒤 Production을 다시 배포해 환경변수를 반영함

### 검증 결과

- 배포된 API 상태 확인 결과:
  - `provider_mode: gemini`
  - `has_gemini_key: true`
- 실제 `POST /api/guided-answer` 테스트를 수행했고, 정상적으로 Gemini 응답을 반환함
- 응답 모델:
  - `gemini-2.5-flash`

### 최종 배포 주소

- 사이트:
  - `https://vercel-lac-eight-98.vercel.app`
- 대시보드 직접 주소:
  - `https://vercel-lac-eight-98.vercel.app/dashboard/index_llm_recommend.html`
- API 상태 확인 주소:
  - `https://vercel-lac-eight-98.vercel.app/api/guided-answer`

### 현재 상태 요약

- 원본 프로젝트는 수정하지 않고 유지함
- `deploy/vercel/`에 배포용 복사본을 분리해 관리함
- Vercel Production 배포가 완료됨
- Gemini API 키가 연결되어 실제 상담 응답이 동작함
