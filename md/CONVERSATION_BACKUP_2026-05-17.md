# Conversation Backup

작성일: 2026-05-17
프로젝트: 성동구 젠트리피케이션 전조 탐지 대시보드

## 1. Markdown 전체 확인

사용자 요청에 따라 현재 작업공간의 Markdown 파일을 모두 확인함.

확인한 파일:

- `PROJECT_CONTEXT.md`
- `md/CONVERSATION_BACKUP_2026-05-07.md`
- `md/CONVERSATION_BACKUP_2026-05-08.md`
- `deploy/vercel/README.md`

## 2. 프로젝트 핵심 목적

- 성수동 일대만 보는 것이 아니라, 성수동에서 성동구 인접 지역으로 확산되는 젠트리피케이션 전조를 탐지하는 대시보드임.
- 최종 위험도 점수는 절대 규모가 아니라 성동구 내부 상대 비교용 전조 탐지 점수임.
- 실제 값의 크기 차이는 별도의 보조 강도 점수로 해석함.
- 결과 해석에서 `소득`이라고 단정하지 않고, `소비성향 비율` 또는 `상업·소비 지출 비율` 성격의 프록시로 설명해야 함.

## 3. 핵심 데이터와 매핑 규칙

주요 원천 데이터:

- `성동구_상권_영업기간(년).xlsx`
- `성동구_인구.xlsx`
- `성동구_2024_연평균_프랜차이즈비율 (1).xlsx`
- `유동인구.xlsx`
- `성동구_상권_회전율.xlsx`
- `성동구_소비비율_2024 (1).xlsx`
- `팝업_비율.xlsx`
- `팝업_강도.xlsx`
- `성수_팝업.xlsx`
- `HangJeongDong_ver20241001.geojson`

중요 정규화 규칙:

- `성수2가2동`은 `성수2가3동`으로 통일함.
- `성수 1가 1동` 같은 띄어쓰기 표기는 `성수1가1동` 형식으로 정규화함.
- `금호2.3가동`, `금호2?3가동`, `금호2ㆍ3가동`은 `금호2·3가동`으로 통일함.

## 4. 점수 체계

### 위험도 점수

- 성동구 내부 상대 비교용 전조 탐지 점수임.
- 인구, 소비성향 비율, 유동인구는 `log1p(x)` 후 분위수 정규화함.
- 회전율, 프랜차이즈비율, 팝업비율, 팝업강도는 분위수 정규화함.
- 영업기간은 분위수 정규화 후 `1 - 값`으로 역지표 처리함.
- 최종 점수는 0~100점으로 환산함.
- 위험등급은 17개 동을 `상 4 / 중 9 / 하 4`로 나눔.

### 보조 강도 점수

- 실제 규모 차이를 읽기 위한 참고 지표임.
- 인구, 소비성향 비율, 유동인구는 `log1p(x)` 후 Min-Max 정규화함.
- 회전율, 프랜차이즈비율, 팝업비율, 팝업강도는 Min-Max 정규화함.
- 영업기간은 Min-Max 정규화 후 `1 - 값`으로 역지표 처리함.
- 최종 순위 결정에는 사용하지 않음.
- 보조 강도 등급도 17개 동을 `상 4 / 중 9 / 하 4`로 나눔.

## 5. 대시보드 상태

주요 코드:

- 점수 계산 및 산출물 생성: `generate_risk_map.py`
- 기본 대시보드: `dashboard/index.html`
- 기본 대시보드 스크립트: `dashboard/app.js`
- 추천 질문 포함 LLM 상담형 대시보드: `dashboard/index_llm_recommend.html`
- 추천 질문 포함 LLM 상담형 스크립트: `dashboard/app_llm_recommend.js`
- 상담형 추가 스타일: `dashboard/styles_llm_recommend.css`

주요 산출물:

- `outputs/seongdong_gentrification_risk_map.png`
- `outputs/seongdong_gentrification_scores.csv`
- `outputs/seongdong_gentrification_scores.xlsx`
- `outputs/dashboard_data.js`
- `outputs/micro_map_data.js`

현재 UI 상태:

- 웹 대시보드에서는 약어 대신 풀네임을 사용함.
- `위험도 점수 P` 표기는 `위험도 점수`로 변경됨.
- `성수권 상태` 카드는 제거되고 `선택 지역 요약` 카드로 교체됨.
- 상담형 버전에서는 `위험도 랭킹`이 지도 아래에 배치됨.
- 상담형 버전에서는 LLM 패널을 가로로 더 넓게 보이도록 조정됨.
- 자유 질문 모드는 UI만 있고 실제 응답 로직은 아직 미구현 상태임.

## 6. 미시적 모드 작업 이력

- 거시적 모드는 기존 행정동 단위 지도를 유지함.
- 미시적 모드는 100m 격자 기반 위험도 시각화로 전환됨.
- `sig.shp`와 `HangJeongDong_ver20241001.geojson`을 활용해 성동구 및 주변 경계와 행정동 매핑을 처리함.
- 이후 외부 베이스맵 요청에 따라 Leaflet + OpenStreetMap 기반으로 전환됨.
- 격자 hover 시 행정동, `W`, `S`, `P`, `R_sub`, `R_road` 정보를 표시함.
- 격자 click 시 해당 행정동을 `Selected Area`에 반영함.
- 모드 명칭은 `거시 모드`/`미시 모드`에서 `거시적 모드`/`미시적 모드`로 변경됨.

## 7. LLM 상담 기능 작업 이력

- 준비된 질문 모드는 실제 동작하도록 구현됨.
- 추천 질문 6개를 누르면 현재 선택 지역 기준으로 답변이 생성됨.
- OpenAI Responses API와 Gemini REST `generateContent` 경로를 모두 지원하도록 로컬 프록시 서버가 추가됨.
- 브라우저에 API 키를 직접 넣지 않도록 `serve_dashboard.py`가 프록시 역할을 수행함.
- Gemini 503, 429 상황에 대한 재시도와 대체 모델 폴백이 추가됨.
- 외부 호출 실패 시 로컬 템플릿 답변으로 폴백함.
- Gemini 응답이 중간에서 끊기는 문제를 줄이기 위해 `parts[]` 전체 결합, 완결형 문장 검사, 재질문, 로컬 완결형 템플릿 대체 로직이 추가됨.
- 프론트는 `innerHTML` 대신 DOM 노드와 `textContent`를 사용해 응답 렌더링 파손을 방지함.
- 반복되는 공통 서두를 줄이고, 질문별 본론이 바로 나오도록 프롬프트와 로컬 폴백 문구를 정리함.

## 8. 보조 강도 해석 UI 작업 이력

- `Selected Area` 상단에는 위험도 점수와 보조 강도 점수가 함께 표시됨.
- 변수별 표는 위험도 점수용 정규화 값이라는 점을 확인함.
- 혼동을 줄이기 위해 보조 강도 해석 전용 블록을 추가함.
- `generate_risk_map.py`에서 `intensity_metrics`와 `intensity_top2_drivers`를 대시보드 데이터에 추가함.
- 보조 강도는 항상 TOP 2를 보여주지 않고, 다음 기준을 만족할 때만 두드러진 변수로 표시함:
  - 절대 기준: `0.65 이상`
  - 상대 기준: 아래 변수와 `0.08 이상` 차이
- 조건 불충분 시 특정 단일 변수 대신 여러 변수의 복합 영향으로 설명함.
- 보조 강도 블록은 정의 문장과 지역별 해석 문장을 함께 보여주도록 정리됨.

## 9. 배포 상태

- 원본 프로젝트와 분리된 Vercel 배포용 복사본이 `deploy/vercel/`에 있음.
- 배포용 복사본은 원본 파일을 수정하지 않고 별도 폴더에서 관리함.
- 주요 배포 파일:
  - `deploy/vercel/dashboard/index_llm_recommend.html`
  - `deploy/vercel/api/guided-answer.py`
  - `deploy/vercel/api/guided_answer.py`
  - `deploy/vercel/vercel.json`
  - `deploy/vercel/index.html`
  - `deploy/vercel/dev_server.py`
  - `deploy/vercel/README.md`
- Vercel Production 배포가 완료된 상태로 기록되어 있음.
- 현재 운영 중인 배포 주소:
  - `https://vercel-lac-eight-98.vercel.app`
- 대시보드 직접 주소:
  - `https://vercel-lac-eight-98.vercel.app/dashboard/index_llm_recommend.html`
- API 상태 확인 주소:
  - `https://vercel-lac-eight-98.vercel.app/api/guided-answer`
- 배포본은 Gemini API가 연결된 상태로 기록되어 있음.

## 10. 실행 방법

일반 대시보드 실행:

```bash
python3 -m http.server 8000
```

접속:

```text
http://localhost:8000/dashboard/
http://localhost:8000/dashboard/index_llm_recommend.html
```

배포 복사본 로컬 확인:

```bash
python3 deploy/vercel/dev_server.py
```

접속:

```text
http://127.0.0.1:8010/dashboard/index_llm_recommend.html
```

산출물 재생성:

```bash
python3 generate_risk_map.py
```

## 11. 다음 작업 후보

- 추천 질문 버튼 응답을 서버 기반으로 더 안정화
- 자유 질문 모드 실제 구현
- 골목/상권 단위 미시 마커 추가
- 정책/지원 정보 근거 데이터 연결
- 할루시네이션 완화를 위한 답변 정책 문서 작성
- Vercel 배포본에 커스텀 도메인 연결
- 배포용 환경변수 관리 문서 정리
- Gemini 폴백 답변 문구 자연스럽게 다듬기
- 추천 질문 6개별 답변 문체와 길이 통일
- 답변에 `AI 답변` / `제한형 답변` / `폴백 답변` 표시 배지 추가
- `.env` 파일 기반 키 관리 구조 도입

## 12. 이번 요청 처리 기록

- 현재 작업공간의 Markdown 파일 4개를 모두 읽고 맥락을 복원함.
- 기존 백업 문서와 프로젝트 컨텍스트를 바탕으로 오늘자 백업 파일을 새로 추가함.
- 기존 파일은 수정하지 않았고, 새 백업 파일만 추가함.

## 13. Kakao API 연동 구조 추가

### 사용자 요청

- 기존 프로젝트가 OpenAI와 Google Gemini API 키만 사용할 수 있도록 작성되어 있으므로, Kakao API 키를 입력받고 Kakao 모델 또는 Kakao 서비스와 통신할 수 있도록 수정 요청함.
- 대시보드 코드와 백엔드 코드에서 어떤 파일의 어느 부분을 수정해야 하는지도 설명해 달라고 요청함.

### 확인 사항

- 2026년 현재 Kakao Developers 공식/공지 문서 기준으로 KoGPT/Karlo 공개 생성형 API는 2024년 9월 30일 종료된 것으로 확인함.
- 따라서 특정 KoGPT 고정 엔드포인트를 하드코딩하지 않고, `KAKAO_API_URL`로 지정한 Kakao 또는 Kakao 호환 텍스트 생성 엔드포인트에 요청을 보내는 구조로 구현함.
- 기본 인증 헤더는 Kakao REST API 방식인 `Authorization: KakaoAK {REST_API_KEY}`를 사용하도록 구성함.

### 수정 파일

- `serve_dashboard.py`
- `deploy/vercel/api/guided-answer.py`
- `run_dashboard.sh`
- `run_dashboard.bat`
- `deploy/vercel/README.md`

### 구현 내용

- 환경변수 추가:
  - `KAKAO_API_KEY`
  - `KAKAO_REST_API_KEY`
  - `KAKAO_API_URL`
  - `KAKAO_MODEL`
  - `KAKAO_AUTH_SCHEME`
  - `KAKAO_API_FORMAT`
- `LLM_PROVIDER=kakao`일 때 Kakao provider를 우선 사용하도록 `call_guided_answer()`에 분기 추가.
- `LLM_PROVIDER`가 미설정인 auto 모드에서도 OpenAI, Gemini 다음으로 Kakao 키가 있으면 Kakao provider를 사용하도록 추가.
- Kakao 응답 파싱은 여러 응답 형식을 받을 수 있게 설계함:
  - `text`
  - `answer`
  - `output`
  - `generated_text`
  - `generations[].text`
  - `choices[].message.content`
  - `choices[].text`
  - `candidates[].text`
- 요청 body 형식은 `KAKAO_API_FORMAT`에 따라 두 가지 지원:
  - `messages`: OpenAI Chat Completions 유사 형식
  - `prompt`: 단일 prompt 형식
- 프론트엔드는 API 키를 직접 받지 않고 기존처럼 `/api/guided-answer`만 호출하도록 유지함. API 키는 서버 환경변수로만 사용됨.

### 검증

- `python3 -m py_compile serve_dashboard.py deploy/vercel/api/guided-answer.py deploy/vercel/api/guided_answer.py deploy/vercel/dev_server.py` 통과.
- `bash -n run_dashboard.sh` 통과.
- 로컬 백엔드와 Vercel Function 양쪽 모두 mock `urlopen` 기반으로 Kakao provider 라우팅과 응답 파싱을 검증함.

## 14. 미시적 모드 변수 정의 및 시각화 구현

### 사용자 요청

- 업로드된 `성동구 격자 최종(2).csv` 데이터와 미시적 변수 정의를 바탕으로 대시보드의 `미시적 모드` 기능을 상세 구현해 달라고 요청함.
- 격자 선택 시 `id` 또는 `row_index`, `col_index`를 기반으로 다음 변수를 매핑해야 한다고 요청함:
  - 최종 지수 `W`: `최종지수`
  - 상가밀도 점수 `S`: `상가밀도점수`
  - 팝업 점수 `P`: `팝업 점수`
  - 역세권 점수 `Rsub`: `역 점수`
  - 대로변 점수 `Rroad`: `대로변 점수`
- 선택 격자의 위험 등급을 텍스트와 색상으로 표시하고, 세부 점수를 차트로 보여주며, 역명/역 거리/대로변 거리/상가수 요약 카드와 텍스트 리포트를 제공해야 한다고 요청함.

### 확인한 CSV 컬럼

- `id`
- `left`
- `top`
- `right`
- `bottom`
- `row_index`
- `col_index`
- `상가수`
- `역명`
- `역 거리`
- `대로변`
- `대로변 거리`
- `일수_sum`
- `상가밀도점수`
- `팝업 점수`
- `역 점수`
- `대로변 점수`
- `최종지수`

### 위험 등급 기준

- `W <= 0.3`: `저위험`
- `0.4 ~ 0.6`: `중위험`
- `W >= 0.7`: `고위험`
- 실제 구현에서는 값의 연속성을 고려해 `0.3 초과 ~ 0.7 미만`을 `중위험`으로 처리함.

### 수정 파일

- `generate_micro_map_assets.py`
- `outputs/micro_map_data.js`
- `dashboard/index_llm_recommend.html`
- `dashboard/app_llm_recommend.js`
- `dashboard/styles.css`
- `serve_dashboard.py`
- `deploy/vercel/api/guided-answer.py`
- `deploy/vercel/dashboard/index_llm_recommend.html`
- `deploy/vercel/dashboard/app_llm_recommend.js`
- `deploy/vercel/dashboard/styles.css`
- `deploy/vercel/outputs/micro_map_data.js`

### 데이터 생성 및 매핑

- `generate_micro_map_assets.py`에 다음 helper를 추가함:
  - `to_float()`
  - `to_int()`
  - `classify_micro_risk()`
- `build_grid_data()`에서 각 격자에 다음 필드를 추가하도록 수정함:
  - `row_index`
  - `col_index`
  - `W`
  - `S`
  - `P`
  - `R_sub`
  - `R_road`
  - `risk_level`
  - `station_name`
  - `station_distance_m`
  - `road_id`
  - `road_distance_m`
  - `store_count`
  - `popup_days_sum`
- 현재 실행 환경에는 `pyproj`가 없어 원래 생성 스크립트 전체 실행은 실패했음.
- 대신 기존 `outputs/micro_map_data.js`의 격자 geometry를 유지하고, CSV를 `id` 기준으로 읽어 새 속성값만 병합해 산출물을 갱신함.
- 갱신 결과 `outputs/micro_map_data.js`와 `deploy/vercel/outputs/micro_map_data.js`에 1,833개 격자 데이터가 반영됨.

### 프론트엔드 UI 구현

- `dashboard/index_llm_recommend.html`에 `microSelectedPanel` 추가.
- 미시적 모드에서만 `선택 격자 리포트` 블록이 표시됨.
- 격자 선택 전에는 “격자를 선택하세요” 상태로 표시됨.
- 격자 클릭 후 다음 정보 표시:
  - 격자 ID
  - 행/열 인덱스
  - 위험 등급과 `W`
  - 위험 등급 설명문
  - 인접 역
  - 역 거리
  - 대로변 거리
  - 상가수
  - `S`, `P`, `Rsub`, `Rroad` 바 차트
  - 자동 생성 텍스트 리포트
- 위험 등급 색상:
  - 저위험: 초록
  - 중위험: 노랑/주황
  - 고위험: 빨강

### 프론트엔드 로직 구현

- `dashboard/app_llm_recommend.js`에 `selectedMicroCell` 상태 추가.
- Leaflet 격자 클릭 시:
  - 선택 격자 레이어 강조
  - `state.selectedMicroCell`에 cell 저장
  - `renderMicroSelection(cell)` 실행
  - 행정동 매핑값이 있으면 기존 `updateSelection(cell.dong)`과 연결
- 추가 함수:
  - `renderMicroSelection(cell)`
  - `renderMicroScoreChart(cell)`
  - `microRiskClass(level)`
  - `microRiskDescription(cell)`
  - `buildMicroReport(cell)`
  - `formatMicroValue(value)`
  - `formatDistance(value)`
- 기존 tooltip의 위험 등급도 `High Risk / Medium Risk / Low Risk`에서 `고위험 / 중위험 / 저위험`으로 바뀐 데이터를 표시하도록 정리함.

### 백엔드 연동

- 프론트에서 준비된 질문 API 요청 시 `micro_cell`을 함께 보내도록 수정함.
- `serve_dashboard.py`와 `deploy/vercel/api/guided-answer.py`의 `build_guided_prompt()`에 `선택 미시 격자 정보` 섹션을 추가함.
- LLM 프롬프트에 다음 값이 포함됨:
  - 격자 ID
  - 행/열 인덱스
  - 최종 지수 W
  - 미시 위험 등급
  - S/P/Rsub/Rroad
  - 인접 역명
  - 역 거리
  - 대로변 거리
  - 상가수

### 검증

- `node --check dashboard/app_llm_recommend.js` 통과.
- `node --check deploy/vercel/dashboard/app_llm_recommend.js` 통과.
- `python3 -m py_compile serve_dashboard.py deploy/vercel/api/guided-answer.py` 통과.
- `outputs/micro_map_data.js` 데이터 확인:
  - 격자 수: 1,833개
  - 예시 필드: `id`, `row_index`, `col_index`, `W`, `S`, `P`, `R_sub`, `R_road`, `risk_level`, `station_name`, `station_distance_m`, `road_distance_m`, `store_count`
  - 위험 등급 집합: `고위험`, `저위험`, `중위험`
- 로컬 HTTP 서버와 Codex in-app browser로 실제 화면 검증 완료.
- 미시적 모드에서 격자 클릭 후 예시 결과:
  - `ID 1964 · 행 2, 열 37`
  - `중위험 · W 0.382`
  - 행정동: `용답동`
  - 인접 역: `신답역`
  - 역 거리: `382.6m`
  - 대로변 거리: `998.4m`
  - 상가수: `0개`
  - 세부 점수 차트 및 리포트 정상 표시.

## 15. 현재 주의사항

- `generate_micro_map_assets.py`는 전체 재생성 시 `pyproj`, `pyshp` 의존성이 필요함.
- 현재 환경에서는 `pyproj`가 없어 전체 재생성 대신 기존 geometry JS에 CSV 속성값을 병합하는 방식으로 갱신했음.
- 배포본에 반영하려면 `deploy/vercel/` 복사본을 기준으로 재배포가 필요함.

## 16. 미시적 모드 색상 의미 재정의 및 격자 위험도 공식 반영

### 사용자 질문 및 정리

- 사용자가 미시적 모드의 시각화 색깔이 바뀌었는데, 이전에는 무엇을 나타냈고 지금은 무엇을 나타내는지 질문함.
- 기존에는 `최종지수 W` 자체를 기준으로 고정 구간 등급을 표시했음:
  - `W <= 0.3`: 저위험
  - `0.3 < W < 0.7`: 중위험
  - `W >= 0.7`: 고위험
- 이후 사용자가 실제 격자 위험도는 다음 공식이라고 정정함:

```text
격자 위험도 = 동위험도 × (격자 가중치 W / 동 전체 가중치 W 합계)
```

### 반영 방향

- `W`는 최종 색상값이 아니라 격자 가중치로 다시 해석함.
- 미시 지도 색상은 `grid_risk_score` 기준으로 표시하도록 변경함.
- 격자 위험도는 동별로 합산했을 때 원래 행정동 위험도와 일치하도록 계산함.
- 지도 색상 등급은 `grid_risk_score`의 분포를 기준으로 `상 / 중 / 하`로 나눔.

### 수정 파일

- `generate_micro_map_assets.py`
- `outputs/micro_map_data.js`
- `dashboard/index_llm_recommend.html`
- `dashboard/app_llm_recommend.js`
- `serve_dashboard.py`
- `deploy/vercel/api/guided-answer.py`
- `deploy/vercel/dashboard/index_llm_recommend.html`
- `deploy/vercel/dashboard/app_llm_recommend.js`
- `deploy/vercel/dashboard/styles.css`
- `deploy/vercel/outputs/micro_map_data.js`

### 추가된 데이터 필드

- `weight_level`: 기존 W 기준 저/중/고 등급
- `dong_risk_score`: 해당 행정동 위험도
- `dong_weight_sum`: 해당 동 전체 격자 W 합계
- `grid_weight_share`: `W / dong_weight_sum`
- `grid_risk_score`: `dong_risk_score * grid_weight_share`
- `grid_risk_level`: 격자 위험도 기준 `상 / 중 / 하`
- `gridRiskFormula`: `grid_risk_score = dong_risk_score * (W / dong_weight_sum)`
- `gridRiskCuts`: 격자 위험도 상/중/하 분류 기준값

### UI 변경

- 미시적 모드 설명 문구를 다음 의미로 변경:
  - `각 격자 색상은 행정동 위험도에 격자 가중치 비율을 곱한 값, 즉 동 위험도 × (격자 W / 동 전체 W 합계)를 기준으로 시각화되었습니다.`
- 선택 격자 리포트 배지는 `격자위험도 상/중/하`와 `grid_risk_score`를 표시함.
- 리포트 문장에 공식이 직접 표시되도록 변경:

```text
격자 위험도는 동위험도 × (격자 W / 동 전체 W 합계) = grid_risk_score 입니다.
```

- tooltip도 다음 정보를 표시하도록 변경:
  - 격자 위험도
  - 계산식
  - S/P/Rsub/Rroad

### 검증

- `node --check dashboard/app_llm_recommend.js` 통과.
- `node --check deploy/vercel/dashboard/app_llm_recommend.js` 통과.
- `python3 -m py_compile serve_dashboard.py deploy/vercel/api/guided-answer.py` 통과.
- 각 동별 격자 위험도 합계가 원래 동 위험도와 일치하는지 확인함.
- 예시:
  - `행당1동`: 격자 합계 `78.082`, 동 위험도 `78.082`
  - `왕십리도선동`: 격자 합계 `74.959`, 동 위험도 `74.959`
  - `사근동`: 격자 합계 `73.471`, 동 위험도 `73.471`
- 브라우저 검증 예시:
  - `격자위험도 상 · 0.735`
  - `69.7 × (0.497 / 47.133) = 0.735`

## 17. 자유 질문 모드 실제 동작 및 Kakao provider 보완

### 사용자 요청

- 기존에는 `준비된 질문 모드`의 추천 질문을 클릭했을 때만 AI가 응답하므로, `자유 질문 모드`에서도 직접 입력한 질문에 답변하도록 확장 요청함.
- 자유 질문 시 선택된 `상담 지역`, `도움 분야`, 클릭된 미시 격자 정보까지 LLM 컨텍스트에 포함하도록 요청함.
- Kakao API를 사용할 수 있도록 백엔드/프론트엔드/환경 설정 코드를 수정해 달라고 요청함.

### 수정 파일

- `dashboard/index_llm_recommend.html`
- `dashboard/app_llm_recommend.js`
- `serve_dashboard.py`
- `deploy/vercel/api/guided-answer.py`
- `deploy/vercel/README.md`
- `deploy/vercel/dashboard/index_llm_recommend.html`
- `deploy/vercel/dashboard/app_llm_recommend.js`
- `deploy/vercel/dashboard/styles.css`

### 자유 질문 UI 변경

- `자유 질문 준비 중` 문구를 제거함.
- `자유 질문 상담` 설명으로 변경함.
- `freeAgentMessages` 대화 영역을 추가함.
- `freeAgentInput`과 `freeAgentSendButton`을 실제 작동 상태로 변경함.
- 버튼 텍스트는 `준비 중`에서 `질문하기`로 변경함.

### 프론트엔드 로직 변경

- `handleFreeAgentSend()` 추가.
- 자유 질문 입력창에서 Enter를 누르면 질문이 전송되도록 연결함.
- 준비된 질문과 자유 질문이 공통으로 `askAgentQuestion(question, responseMode)`를 사용하도록 정리함.
- `response_mode`를 API payload에 추가함:
  - `guided`: 준비된 질문 모드
  - `free`: 자유 질문 모드
- `topic_label`도 API payload에 추가함.
- 자유 질문 모드에서도 다음 컨텍스트를 함께 전송함:
  - 선택 상담 지역 `record`
  - 도움 분야 `topic`
  - 도움 분야 라벨 `topic_label`
  - 미시적 모드에서 클릭된 `micro_cell`
  - 성수권 benchmark
  - 상위 위험도 ranking

### 백엔드 프롬프트 변경

- `serve_dashboard.py`와 `deploy/vercel/api/guided-answer.py`의 `build_guided_prompt()`에 다음 값을 추가함:
  - `response_mode`
  - `topic_label`
- 응답 모드별 지침을 분리함:
  - `guided`: 추천 질문 의도에 바로 답하고 3~5문장으로 압축
  - `free`: 사용자 질문 의도를 해석하고 선택 지역/도움 분야에 맞춰 5~8문장으로 더 구체적으로 답변
- 자유 질문이 창업, 입지, 정책, 비교, 소상공인 지원을 묻더라도 데이터 범위 내에서 실무적으로 설명하도록 지시함.
- 선택 미시 격자 정보가 있으면 `S`, `P`, `Rsub`, `Rroad`, 격자 위험도, 격자 가중치 비율을 자연스럽게 답변에 반영하도록 지시함.

### Kakao provider 보완

- 기존 Kakao provider 구조는 유지함:
  - `KAKAO_API_KEY`
  - `KAKAO_REST_API_KEY`
  - `KAKAO_API_URL`
  - `KAKAO_MODEL`
  - `KAKAO_AUTH_SCHEME`
  - `KAKAO_API_FORMAT`
  - `LLM_PROVIDER=kakao`
- `serve_dashboard.py`에 `GET /api/guided-answer` 상태 확인 응답을 추가함.
- 로컬 서버와 Vercel Function 모두 다음 상태값을 확인할 수 있게 함:
  - `provider_mode`
  - `has_openai_key`
  - `has_gemini_key`
  - `has_kakao_key`
  - `has_kakao_api_url`
  - `kakao_model`
  - `kakao_api_format`
  - `kakao_auth_scheme`
- `deploy/vercel/README.md`에 준비된 질문 모드와 자유 질문 모드가 모두 `/api/guided-answer`를 호출한다고 문서화함.
- Kakao API 키는 프론트엔드에 노출하지 않고 서버 환경변수로만 사용함.

### 검증

- `node --check dashboard/app_llm_recommend.js` 통과.
- `node --check deploy/vercel/dashboard/app_llm_recommend.js` 통과.
- `python3 -m py_compile serve_dashboard.py deploy/vercel/api/guided-answer.py deploy/vercel/api/guided_answer.py` 통과.
- Python으로 `build_guided_prompt()` 테스트:
  - 자유 질문 모드 지침 포함 확인
  - `뚝섬역` 등 선택 미시 격자 정보 포함 확인
  - `S: 0.2` 등 세부 점수 포함 확인
- 브라우저 검증:
  - 자유 질문 모드 탭 전환 정상
  - `freeAgentMessages` 초기 안내 정상 표시
  - `질문하기` 버튼 정상 표시
  - 입력창 placeholder 정상 표시
  - 콘솔 오류 없음

## 18. Markdown 전체 재확인 및 범용 API 키 구조 추가

### 사용자 요청

- `md` 파일 전부를 읽고 지금까지의 내용을 백업해 달라고 요청함.
- 직전 작업으로 “브랜드 키 상관없이 모든 API 키를 사용할 수 있는 형식”으로 바꿔 달라고 요청함.

### 확인한 Markdown 파일

- `md/CONVERSATION_BACKUP_2026-05-07.md`
- `md/CONVERSATION_BACKUP_2026-05-08.md`
- `md/CONVERSATION_BACKUP_2026-05-17.md`

### 범용 API 구조 요청 배경

- 기존에는 OpenAI, Gemini, Kakao처럼 provider별 환경변수 이름이 분리되어 있었음.
- 사용자는 특정 브랜드명에 묶이지 않고, 어떤 텍스트 생성 API든 API key와 URL을 넣어 사용할 수 있는 구조를 요청함.
- 기존 provider 구조는 유지하되, 추가로 `generic` provider를 넣는 방식으로 처리함.

### 수정 파일

- `serve_dashboard.py`
- `deploy/vercel/api/guided-answer.py`
- `run_dashboard.sh`
- `run_dashboard.bat`
- `deploy/vercel/README.md`

### 추가한 범용 환경변수

- `LLM_PROVIDER=generic`
- `LLM_API_KEY`
- `LLM_API_URL`
- `LLM_MODEL`
- `LLM_API_FORMAT`
  - `messages`
  - `prompt`
  - `input`
- `LLM_AUTH_HEADER`
  - 기본값: `Authorization`
- `LLM_AUTH_SCHEME`
  - 기본값: `Bearer`

### 백엔드 구현 내용

- `serve_dashboard.py`와 `deploy/vercel/api/guided-answer.py`에 generic provider 상수 추가:
  - `GENERIC_API_URL`
  - `GENERIC_API_KEY`
  - `GENERIC_MODEL`
  - `GENERIC_AUTH_HEADER`
  - `GENERIC_AUTH_SCHEME`
  - `GENERIC_API_FORMAT`
- `build_generic_request_body()` 추가.
- `call_generic_guided_answer()` 추가.
- `build_auth_header_value()` 추가.
- `LLM_PROVIDER`가 다음 값이면 generic provider를 사용하도록 분기 추가:
  - `generic`
  - `custom`
  - `api`
- provider가 명시되지 않은 auto 모드에서도 기존 OpenAI, Gemini, Kakao 키가 없고 `LLM_API_KEY`가 있으면 generic provider를 사용하도록 추가.
- 응답 파싱은 기존 Kakao provider에서 사용하던 범용 텍스트 추출 로직을 재사용함:
  - `text`
  - `answer`
  - `output`
  - `generated_text`
  - `generations[].text`
  - `choices[].message.content`
  - `choices[].text`
  - `candidates[].text`

### 요청 body 형식

`LLM_API_FORMAT=messages`일 때:

```json
{
  "model": "custom-model",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.4,
  "max_tokens": 900
}
```

`LLM_API_FORMAT=prompt`일 때:

```json
{
  "model": "custom-model",
  "prompt": "...",
  "temperature": 0.4,
  "max_tokens": 900
}
```

`LLM_API_FORMAT=input`일 때:

```json
{
  "model": "custom-model",
  "input": "...",
  "temperature": 0.4,
  "max_tokens": 900
}
```

### 사용 예시

기본 Bearer 인증 API:

```bash
export LLM_PROVIDER=generic
export LLM_API_KEY="사용할_API_KEY"
export LLM_API_URL="호출할_텍스트생성_API_URL"
export LLM_MODEL="사용할_모델명"
export LLM_API_FORMAT="messages"
python3 serve_dashboard.py
```

`x-api-key` 인증 헤더를 쓰는 API:

```bash
export LLM_PROVIDER=generic
export LLM_API_KEY="사용할_API_KEY"
export LLM_API_URL="호출할_텍스트생성_API_URL"
export LLM_AUTH_HEADER="x-api-key"
export LLM_AUTH_SCHEME=""
python3 serve_dashboard.py
```

### 실행 스크립트 변경

- `run_dashboard.sh`와 `run_dashboard.bat`에서 `generic` provider를 선택할 수 있게 함.
- generic 선택 시 다음 값을 입력받음:
  - `LLM_API_KEY`
  - `LLM_API_URL`
  - `LLM_MODEL`
- 안내 문구도 “브랜드와 상관없는 API는 generic을 선택하고 LLM_API_URL을 입력”하는 방식으로 수정함.

### 문서 변경

- `deploy/vercel/README.md`에 범용 API 환경변수 섹션을 추가함.
- `generic` provider가 브랜드가 고정된 키가 아니라, 임의의 텍스트 생성 API를 `LLM_API_URL`로 호출하는 방식이라고 설명함.
- API가 `messages`, `prompt`, `input` 중 하나의 JSON 요청 형식을 받고, 일반적인 텍스트 응답 필드를 반환하면 사용할 수 있다고 문서화함.

### 검증

- `python3 -m py_compile serve_dashboard.py deploy/vercel/api/guided-answer.py deploy/vercel/api/guided_answer.py` 통과.
- `bash -n run_dashboard.sh` 통과.
- `rg`로 generic provider 관련 코드가 로컬/배포 백엔드와 실행 스크립트, README에 반영된 것을 확인함.
- mock API 테스트를 통해 다음을 확인함:
  - `LLM_PROVIDER=generic` 라우팅 정상.
  - `Authorization: Bearer test-key` 헤더 생성 정상.
  - `messages` 형식 request body 생성 정상.
  - `choices[].message.content` 응답 파싱 정상.
  - 반환값 예시: `('범용 API 테스트 응답입니다.', 'generic', 'any-model')`

### 현재 의미

- 기존 OpenAI/Gemini/Kakao provider는 그대로 유지됨.
- 새 generic provider를 쓰면 특정 브랜드 이름 없이 `LLM_API_KEY`와 `LLM_API_URL`만으로 외부 텍스트 생성 API를 연결할 수 있음.
- 단, 모든 API가 완전히 같은 요청/응답 형식을 쓰는 것은 아니므로, 현재 generic provider는 가장 흔한 `messages`, `prompt`, `input` 형식과 일반적인 텍스트 응답 필드를 지원하는 범용 연결 구조임.
