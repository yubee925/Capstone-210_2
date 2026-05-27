# Project Context

## 프로젝트 목적
- 성수동 일대만 보는 것이 아니라, 성수동에서 성동구 인접 지역으로 확산되는 젠트리피케이션 전조를 탐지한다.
- 최종 위험도 점수는 절대 규모가 아니라 성동구 내부 상대 비교용 전조 탐지 점수다.
- 실제 값의 크기 차이는 보조 강도 점수로 따로 해석한다.

## 핵심 데이터
- 영업기간 데이터: `성동구_상권_영업기간(년).xlsx`
- 인구 데이터: `성동구_인구.xlsx`
- 프랜차이즈 데이터: `성동구_2024_연평균_프랜차이즈비율 (1).xlsx`
- 유동인구 데이터: `유동인구.xlsx`
- 창폐업 데이터: `성동구_상권_회전율.xlsx`
- 소비성향 데이터: `성동구_소비비율_2024 (1).xlsx`
- 팝업 데이터: `팝업_비율.xlsx`, `팝업_강도.xlsx`, `성수_팝업.xlsx`
- 지도 데이터: `HangJeongDong_ver20241001.geojson`

## 중요한 데이터 매핑 규칙
- `성수2가2동`으로 표기된 값은 모두 `성수2가3동`으로 통일한다.
- `성수 1가 1동` 같은 띄어쓰기 표기는 `성수1가1동` 형식으로 정규화한다.
- `금호2.3가동`, `금호2?3가동`, `금호2ㆍ3가동`은 `금호2·3가동`으로 통일한다.

## 현재 점수 산식

### 1. 전조 탐지용 최종 위험도 점수
- 성동구 내부 상대 비교용 점수
- 인구, 소비성향 비율, 유동인구: `log1p(x)` 후 분위수 정규화
- 회전율, 프랜차이즈비율, 팝업비율, 팝업강도: 분위수 정규화
- 영업기간: 분위수 정규화 후 `1 - 값`으로 역지표 처리
- 최종 점수는 0~100점 환산

### 2. 보조 강도 점수
- 실제 규모 차이 해석용 점수
- 인구, 소비성향 비율, 유동인구: `log1p(x)` 후 Min-Max 정규화
- 회전율, 프랜차이즈비율, 팝업비율, 팝업강도: Min-Max 정규화
- 영업기간: Min-Max 정규화 후 `1 - 값`
- 최종 순위 결정에는 사용하지 않음

### 3. 가중치
- 성수1가1동, 성수1가2동, 성수2가1동, 성수2가3동:
  `P = 0.137A + 0.133B + 0.120C + 0.154D + 0.110E + 0.231F + 0.045G1 + 0.070G2`
- 그 외 행정동:
  `P = 0.137A + 0.133B + 0.170C + 0.154D + 0.175E + 0.231F`

### 4. 등급 기준
- 위험등급은 17개 동을 정확히 `상 4 / 중 9 / 하 4`로 분할
- 보조 강도 등급도 동일하게 `상 4 / 중 9 / 하 4`로 분할

## 현재 주요 코드
- 점수 계산 및 산출물 생성: `generate_risk_map.py`
- 기본 대시보드: `dashboard/index.html`
- 기본 대시보드 스크립트: `dashboard/app.js`
- 추천 질문 포함 LLM 상담형 대시보드: `dashboard/index_llm_recommend.html`
- 추천 질문 포함 LLM 상담형 스크립트: `dashboard/app_llm_recommend.js`
- LLM 상담형 추가 스타일: `dashboard/styles_llm_recommend.css`

## 현재 산출물
- 위험도 지도 PNG: `outputs/seongdong_gentrification_risk_map.png`
- 결과 CSV: `outputs/seongdong_gentrification_scores.csv`
- 결과 XLSX: `outputs/seongdong_gentrification_scores.xlsx`
- 대시보드 데이터 JS: `outputs/dashboard_data.js`

## 문서 및 백업 위치
- 대화 백업용 Markdown 파일은 앞으로 모두 `md/` 폴더에 저장한다.
- 이전 대화를 복원하거나 백업 내용을 확인해야 할 때는 `md/` 폴더 안의 `CONVERSATION_BACKUP_YYYY-MM-DD.md` 파일들을 우선 확인한다.
- `PROJECT_CONTEXT.md`는 루트에 유지하고, 대화 백업 파일과는 분리해서 관리한다.
- 사용자가 `md 파일 전부 읽고 백업해`라고 요청하면, `md/` 폴더 안의 모든 Markdown 파일을 읽어 이전 대화 백업 맥락을 복원한 뒤 새 백업 파일을 추가하는 방식으로 처리한다.

## 웹 대시보드 상태

### 기본 버전
- 파일: `dashboard/index.html`
- 기능: 지도, 거시/미시 모드, 선택 지역 요약, 지표 패널, 제한형 상담 UI

### 추천 질문 포함 버전
- 파일: `dashboard/index_llm_recommend.html`
- 기능:
  - 추천 질문 버튼 6개
  - 지역 선택 + 도움 분야 선택 + 질문 입력
  - 현재 Vercel 배포본에서는 Gemini API 연동 가능
  - 선택된 지역의 점수, 위험등급, 주요 기여 변수, 보조 강도 점수를 바탕으로 제한형 응답 생성
  - `위험도 랭킹`은 지도 아래 요약 카드 밑에 배치
  - 오른쪽 사이드바에는 `선택 지역 상세 패널`과 `LLM Agent`가 위치
- 답변 원칙:
  - 위험도 점수는 절대 위험이 아니라 성동구 내부 상대 비교 기반 전조 탐지 점수라고 설명
  - 성수동만 높게 만드는 모델이 아니라 주변 확산 전조를 탐지하는 모델이라고 설명
  - `소득` 대신 `소비성향 비율` 또는 `상업·소비 지출 비율`로 표현
  - 정책 대응은 임대료 안정, 소상공인 보호, 공실률 모니터링, 문화상권 관리, 팝업스토어 관리 관점으로 답변

### LLM Agent 모드 분리 상태
- 상담형 버전 파일: `dashboard/index_llm_recommend.html`
- 스크립트: `dashboard/app_llm_recommend.js`
- 스타일: `dashboard/styles_llm_recommend.css`
- 현재 모드:
  - `준비된 질문 모드`
    - 실제 동작 구현됨
    - 추천 질문 6개를 누르면 바로 답변 생성
    - 준비된 질문과 유사한 범주의 질문은 제한형으로 응답
  - `자유 질문 모드`
    - UI만 구현
    - 입력창과 버튼은 있으나 실제 응답 로직은 미구현
    - 화면에는 `준비 중` 상태로 보이게 되어 있음
- 추천 질문 목록:
  - `이 지역이 위험으로 나온 이유는?`
  - `성수동과 인접 지역의 차이는?`
  - `이 동에서 가장 큰 위험 요인은?`
  - `정책적으로 어떤 대응이 필요한가?`
  - `소상공인 관점에서 어떤 지원이 필요한가?`
  - `위험도 점수가 높지만 성수동이 아닌 이유는?`

## 현재 배포 상태

- 원본 프로젝트와 분리된 Vercel 배포용 복사본 위치:
  - `deploy/vercel/`
- 배포용 주요 파일:
  - `deploy/vercel/dashboard/index_llm_recommend.html`
  - `deploy/vercel/api/guided-answer.py`
  - `deploy/vercel/vercel.json`
- 현재 운영 중인 배포 주소:
  - `https://vercel-lac-eight-98.vercel.app`
- 대시보드 직접 주소:
  - `https://vercel-lac-eight-98.vercel.app/dashboard/index_llm_recommend.html`
- API 상태 확인 주소:
  - `https://vercel-lac-eight-98.vercel.app/api/guided-answer`
- 현재 배포본은 Gemini API가 연결된 상태다.

## 실행 방법

### 대시보드 열기
- 바로 열기:
  - `dashboard/index.html`
  - `dashboard/index_llm_recommend.html`
- 더 안정적인 방식:
```bash
python3 -m http.server 8000
```
- 접속:
  - `http://localhost:8000/dashboard/`
  - `http://localhost:8000/dashboard/index_llm_recommend.html`

### 배포용 복사본 로컬 확인

- 배포 복사본 미리보기 서버:
```bash
python3 deploy/vercel/dev_server.py
```
- 접속:
  - `http://127.0.0.1:8010/dashboard/index_llm_recommend.html`

### 산출물 다시 생성
```bash
python3 generate_risk_map.py
```

## 현재 UI 관련 메모
- 웹 대시보드에서는 약어 대신 풀네임을 사용하도록 수정함
- `위험도 점수 P` 표기는 `위험도 점수`로 변경함
- `성수권 상태` 카드는 제거하고 `선택 지역 요약` 카드로 교체함
- 상담형 버전에서는 `위험도 랭킹`을 지도 아래로 이동시킴
- 상담형 버전에서는 LLM 패널을 가로로 더 넓게 보이도록 조정함
- 자유 질문은 아직 실제 작동하지 않으며, 준비된 질문 모드만 동작함

## 다음 작업 추천
- 추천 질문 버튼 응답을 서버 기반으로 이전
- 자유 질문 모드 실제 구현
- 골목/상권 단위 미시 마커 추가
- 정책/지원 정보 근거 데이터 연결
- 할루시네이션 완화를 위한 답변 정책 문서 작성
- Vercel 배포본에 커스텀 도메인 연결
- 배포용 환경변수 관리 문서 정리

## 주의사항
- 기존 파일을 덮어쓰지 말고, 새 버전은 별도 파일로 추가하는 방식으로 진행한 적이 있음
- `outputs/` 파일이 다른 프로그램에서 열려 있으면 저장이 실패하거나 새 파일명으로 저장될 수 있음
- 결과 해석에서 `소득`이라고 단정하지 말고 `소비성향 비율 프록시`로 보는 것이 맞음
