# Vercel Deploy Copy

이 폴더는 원본 프로젝트를 수정하지 않고 Vercel 배포용으로 분리한 복사본입니다.

## 포함 범위

- 상담형 대시보드 정적 파일
- 대시보드 데이터 파일
- `Vercel Python Function` 기반 `api/guided-answer`

## 폴더 구조

- `dashboard/`
- `outputs/`
- `api/guided-answer.py`
- `index.html`
- `vercel.json`

## 권장 환경변수

- 브랜드와 상관없는 범용 API:
  - `LLM_PROVIDER=generic`
  - `LLM_API_KEY`
  - `LLM_API_URL`
  - 선택: `LLM_MODEL`
  - 선택: `LLM_API_FORMAT`
    - `messages`
    - `prompt`
    - `input`
  - 선택: `LLM_AUTH_HEADER`
    - 기본값: `Authorization`
  - 선택: `LLM_AUTH_SCHEME`
    - 기본값: `Bearer`
- `OPENAI_API_KEY`
- 선택: `OPENAI_MODEL`
- 또는 `GEMINI_API_KEY`
- 선택: `GOOGLE_API_KEY`
- 선택: `GEMINI_MODEL`
- 선택: `GEMINI_FALLBACK_MODELS`
- 또는 `KAKAO_API_KEY`
- 선택: `KAKAO_REST_API_KEY`
- Kakao 사용 시 필수: `KAKAO_API_URL`
- 선택: `KAKAO_MODEL`
- 선택: `KAKAO_AUTH_SCHEME`
  - 기본값: `KakaoAK`
- 선택: `KAKAO_API_FORMAT`
  - `messages`
  - `prompt`
- 선택: `LLM_PROVIDER`
  - `openai`
  - `gemini`
  - `kakao`
  - `generic`
  - 미설정 시 `auto`

`generic` provider는 OpenAI/Gemini/Kakao처럼 브랜드가 고정된 키가 아니라, 임의의 텍스트 생성 API를 `LLM_API_URL`로 호출합니다. API가 `messages`, `prompt`, `input` 중 하나의 JSON 요청 형식을 받고, 응답이 `answer`, `text`, `output`, `generated_text`, `choices[].message.content` 등 일반적인 텍스트 필드를 반환하면 사용할 수 있습니다.

참고: 카카오의 공개 KoGPT/Karlo 생성형 API는 2024년 9월 30일부로 제공 종료가 공지되었습니다. 따라서 Kakao provider는 `KAKAO_API_URL`에 지정한 카카오 또는 카카오 호환 텍스트 생성 엔드포인트로 요청을 보냅니다.

## 동작 방식

- 프론트는 정적 파일로 서빙됩니다.
- 준비된 질문 모드와 자유 질문 모드는 모두 `/api/guided-answer`를 호출합니다.
- 자유 질문 모드는 선택된 상담 지역, 도움 분야, 선택된 미시 격자 정보를 함께 프롬프트에 전달합니다.
- API 키가 없거나 외부 호출이 실패하면 프론트는 기존 제한형 응답으로 폴백합니다.
- Kakao 사용 시 API 키는 프론트에 노출하지 않고 Vercel Function에서만 사용합니다.

## 배포 절차

1. Vercel에서 새 프로젝트를 만들고 이 `deploy/vercel` 폴더를 루트로 배포합니다.
2. 프로젝트 환경변수에 API 키를 등록합니다.
3. 배포 후 `/api/guided-answer`가 `GET`으로 상태 응답을 주는지 확인합니다.
4. 메인 페이지는 `/dashboard/index_llm_recommend.html` 또는 `/`로 접속합니다.

## 로컬 확인

Vercel CLI를 쓸 경우 이 폴더에서 실행:

```bash
vercel dev
```

정적 화면만 빠르게 확인할 경우:

```bash
python3 -m http.server 8000
```

이 경우 `/api/guided-answer`는 동작하지 않으므로 상담 기능은 제한형 응답으로 폴백합니다.
