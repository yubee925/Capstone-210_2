# Conversation Backup

작성일: 2026-05-07  
프로젝트: 성동구 젠트리피케이션 전조 탐지 대시보드

## 1. 초기 컨텍스트 복원

- `PROJECT_CONTEXT.md`를 읽어 이전 대화의 핵심 상태를 복원함.
- 프로젝트 목적:
  - 성수동 자체만이 아니라 성동구 인접 지역으로 확산되는 젠트리피케이션 전조 탐지
  - 위험도 점수는 성동구 내부 상대 비교용
  - 실제 규모 차이는 보조 강도 점수로 해석
- 주요 대시보드 파일:
  - `dashboard/index_llm_recommend.html`
  - `dashboard/app_llm_recommend.js`
  - `dashboard/styles_llm_recommend.css`
  - `dashboard/styles.css`

## 2. 미시 모드 시각화 개편

### 사용자 요청

- 행정동 단위가 아니라 100m 격자 단위 위험도 결과를 미시 모드에 반영
- 거시 모드는 기존 행정동 지도 유지
- 미시 모드는 100m 격자 위험도 시각화만 보이게 수정

### 수행 내용

- 기존 미시 모드의 overlay 방식 제거
- 거시/미시 컨테이너 분리:
  - `macroMapContainer`
  - `microGridContainer`
- 초기에는 정적 PNG 기반 미시 지도 사용
- 이후 `shp` 파일(`시군구/sig.shp`)을 활용해 성동구 및 주변 경계를 포함한 격자 위험도 이미지 생성
- 이후 외부 지도 사용 요청에 따라 미시 모드를 Leaflet + OpenStreetMap 기반으로 전환

### 관련 파일

- 수정:
  - `dashboard/index_llm_recommend.html`
  - `dashboard/app_llm_recommend.js`
  - `dashboard/styles.css`
- 추가:
  - `generate_micro_grid_map.py`
  - `generate_micro_map_assets.py`
  - `outputs/seongdong_grid_risk_map.png`
  - `outputs/micro_map_data.js`

## 3. 미시 모드 지도 고도화

### 사용자 요청

- 시군구 경계를 바탕으로 미시 위험도 격자를 표시
- 그림 위 설명 제거, 설명은 그림 아래에만 배치
- 외부 베이스맵을 가져와 사용
- 격자 클릭 시 해당 행정동 정보가 `Selected Area`에 반영되게 구성

### 수행 내용

- `sig.shp`와 `HangJeongDong_ver20241001.geojson`을 함께 사용
- 격자 중심점 기준으로 행정동 매핑
- 미시 지도 툴팁에 다음 정보 표시:
  - 행정동
  - `W`
  - `S`
  - `P`
  - `R_sub`
  - `R_road`
- 격자 클릭 시:
  - 테두리 강조
  - 해당 행정동을 `updateSelection()`으로 연결
- 미시 모드에서만 `Selected Area`에 변수 안내 박스 노출

### 변수 안내 추가

- `W`: 복합 위험 지수
- `S`: 상가밀도 점수
- `P`: 팝업스토어 점수
- `R_sub`: 역세권 접근성 점수
- `R_road`: 대로변 접근성 점수

## 4. 모드 명칭 변경

### 사용자 요청

- `거시 모드`, `미시 모드`를 `거시적 모드`, `미시적 모드`로 변경

### 수행 내용

- HTML 토글 버튼 텍스트 변경
- 상단 pill 텍스트 변경
- 지도 제목 텍스트 변경
- 미시 변수 안내 라벨도 `미시적 모드 변수 안내`로 통일

## 5. 준비된 질문 모드 개선

### 초기 상태

- 추천 질문 칩은 존재했지만 사용자 체감상 “질문에 맞는 답”이 충분히 나오지 않았음
- 자유 질문 모드는 손대지 않기로 합의

### 단계별 작업

#### 5-1. 로컬 제한형 응답 정리

- 추천 질문 클릭 시 현재 선택 지역 기준으로 바로 답이 나오도록 연결
- 질문 내용에 따라 topic 자동 추론:
  - 위험도 해석
  - 인접 지역 비교
  - 정책 대응
  - 소상공인 지원

#### 5-2. 실제 LLM 연동

- 사용자가 GPT 또는 Gemini 연결을 허용
- 브라우저에 키를 직접 넣지 않기 위해 로컬 프록시 서버 추가
- 추가 파일:
  - `serve_dashboard.py`
- 서버 역할:
  - 정적 파일 서빙
  - `POST /api/guided-answer`
  - LLM 호출 프록시

### OpenAI 연동

- OpenAI Responses API 기반 경로 추가
- 환경변수:
  - `OPENAI_API_KEY`
  - 선택적으로 `OPENAI_MODEL`

### Gemini 연동

- Gemini REST `generateContent` 기반 경로 추가
- 환경변수:
  - `GEMINI_API_KEY`
  - 또는 `GOOGLE_API_KEY`
  - 선택적으로 `GEMINI_MODEL`
  - 선택적으로 `GEMINI_FALLBACK_MODELS`

### 실행 스크립트 추가

- `run_dashboard.bat`
- `run_dashboard.sh`

기능:
- 키를 입력받거나 기존 환경변수를 사용
- `serve_dashboard.py` 실행
- 브라우저 접속 주소 안내

## 6. LLM 연동 중 발생한 문제와 해결 과정

### 문제 1. Gemini 키를 넣어도 동작하지 않음

원인:
- 초기 서버가 OpenAI만 지원

해결:
- `serve_dashboard.py`에 Gemini 분기 추가

### 문제 2. Gemini 503

로그:
- `This model is currently experiencing high demand`

해결:
- 자동 재시도 추가
- 대체 모델 폴백 추가
- 기본 폴백 모델:
  - `gemini-2.0-flash`

### 문제 3. Gemini 429

원인:
- 호출 제한 또는 rate limit

해결:
- `429` 재시도 추가
- 계속 실패 시 로컬 템플릿 답변으로 자동 폴백
- 이때 로그에 provider는 `gemini-fallback`, model은 `local-template`로 표시

### 문제 4. 응답 중간 잘림

현상:
- 채팅창에 답변이 중간에서 끊김

원인 1:
- 프론트에서 `innerHTML` 사용으로 `<` 문자 포함 시 렌더링 파손

해결:
- `appendMessage()`를 DOM 노드 + `textContent` 방식으로 변경
- `.chat-bubble-body { white-space: pre-wrap; word-break: break-word; }` 추가

원인 2:
- Gemini 응답 `parts[]` 중 첫 번째 part만 읽고 있었음

해결:
- `parts[]` 전체를 결합하도록 수정

원인 3:
- Gemini가 200 응답이어도 문장을 중간에서 끊어서 반환하는 경우 발생

해결:
- 완결형 문장 검사 추가
- 불완전하면 짧은 재질문으로 한 번 더 요청
- 그래도 불완전하면 로컬 완결형 템플릿 답변으로 대체

## 7. 답변 품질 및 톤 정리

### 사용자 피드백

- 기본 답변에서 공통 서두가 반복되어 불편
- 예:
  - `행당1동은 위험도 점수 78.1점...`
  - 같은 설명이 매 질문마다 반복

### 수행 내용

- `현재 상태 요약`에서만 점수형 요약을 유지
- 이후 질문 응답은 바로 본론으로 시작
- Gemini 프롬프트에도 반복 서두 금지 지시 추가
- 로컬 폴백 답변도 동일한 톤으로 조정

### 추가 정리

- `유동인구(F)`, `프랜차이즈(E)` 같은 표기 제거
- 사용자용 표기로 치환:
  - `유동인구`
  - `프랜차이즈비율`
  - `소비성향 비율`
  - `영업기간 역지표`
  - 등

## 8. 기본 요약 문장 버그 수정

### 문제

- 기본 요약 응답에
  - `...산출되었습니다.입니다.`
  처럼 종결어미가 중복됨

### 해결

- `dashboard/app_llm_recommend.js`의 `buildScopedResponse()`에서
  해석 문장 뒤에 추가로 붙던 `입니다.` 제거

## 9. 현재 실행 방식

### 권장 실행 방식

직접 `html` 파일을 더블클릭해서 열지 않고 서버를 통해 실행:

```bash
cd /mnt/c/Users/LG/Desktop/캡스톤2
bash run_dashboard.sh
```

브라우저 접속:

```text
http://127.0.0.1:8000/dashboard/index_llm_recommend.html
```

### 이유

- LLM 호출이 `/api/guided-answer`를 필요로 함
- 외부 지도와 JS 자산도 `http://` 기반 실행이 안정적임

## 10. 공유 방식에 대한 논의

### 사용자 질문

- “API 키만 공유하면 다른 사람도 쓸 수 있지 않나?”

### 정리

- 가능은 하지만 비추천
- 가장 안전한 방식:
  - 코드는 공유
  - 각자 자기 API 키 입력
- 더 나은 운영 방식:
  - 중앙 서버 운영 후 사용자에게는 URL만 제공

## 11. 현재 상태 요약

- 미시적 모드:
  - Leaflet + OpenStreetMap + 100m 격자 시각화
  - 격자 hover 시 변수 점수 표시
  - 격자 click 시 해당 행정동 정보 반영
- 거시적 모드:
  - 기존 행정동 단위 시각화 유지
- 준비된 질문 모드:
  - 실제 LLM 경유 가능
  - Gemini/OpenAI 지원
  - Gemini 과부하/쿼터 이슈 시 로컬 템플릿 폴백
- 자유 질문 모드:
  - 아직 미구현, 의도적으로 유지

## 12. 주요 수정 파일 목록

- `PROJECT_CONTEXT.md`
- `dashboard/index_llm_recommend.html`
- `dashboard/app_llm_recommend.js`
- `dashboard/styles.css`
- `dashboard/styles_llm_recommend.css`
- `generate_micro_grid_map.py`
- `generate_micro_map_assets.py`
- `serve_dashboard.py`
- `run_dashboard.bat`
- `run_dashboard.sh`
- `outputs/micro_map_data.js`
- `outputs/seongdong_grid_risk_map.png`

## 13. 다음 작업 후보

- `gemini-fallback` 답변 문구를 더 자연스럽게 다듬기
- 추천 질문 6개별 답변 문체/길이 통일
- 답변에 `AI 답변` / `제한형 답변` / `폴백 답변` 표시 배지 추가
- `.env` 파일 기반 키 관리 구조 도입
- 중앙 서버 배포 구조 문서화
