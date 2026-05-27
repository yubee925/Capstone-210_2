#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ -f ".env.local" ]; then
  set -a
  . "./.env.local"
  set +a
fi

echo "=========================================="
echo "Seongdong Dashboard Launcher"
echo "=========================================="
echo
echo "1. LLM_API_KEY 또는 OPENAI_API_KEY, GEMINI_API_KEY, KAKAO_API_KEY 중 하나가 있으면 AI 답변이 나옵니다."
echo "2. 그냥 Enter를 누르면 AI 없이 제한형 응답으로 실행됩니다."
echo "3. 브랜드와 상관없는 API는 generic을 선택하고 LLM_API_URL을 입력하세요."
echo

if [ -z "${LLM_API_KEY:-}" ] && [ -z "${OPENAI_API_KEY:-}" ] && [ -z "${GEMINI_API_KEY:-}" ] && [ -z "${GOOGLE_API_KEY:-}" ] && [ -z "${KAKAO_API_KEY:-}" ] && [ -z "${KAKAO_REST_API_KEY:-}" ]; then
  read -r -p "사용할 provider 입력 (generic/kakao/gemini/openai, 없으면 Enter): " SELECTED_PROVIDER
  SELECTED_PROVIDER="$(printf "%s" "$SELECTED_PROVIDER" | tr '[:upper:]' '[:lower:]')"
  if [ "$SELECTED_PROVIDER" = "generic" ] || [ "$SELECTED_PROVIDER" = "custom" ] || [ "$SELECTED_PROVIDER" = "api" ]; then
    read -r -p "LLM API key 입력: " LLM_API_KEY
    read -r -p "LLM API URL 입력: " LLM_API_URL
    read -r -p "LLM model 입력 (없으면 custom-model): " LLM_MODEL
    export LLM_PROVIDER="generic"
    export LLM_API_KEY
    export LLM_API_URL
    export LLM_MODEL="${LLM_MODEL:-custom-model}"
  elif [ "$SELECTED_PROVIDER" = "kakao" ]; then
    read -r -p "Kakao REST API key 입력: " KAKAO_API_KEY
    read -r -p "Kakao API URL 입력: " KAKAO_API_URL
    export LLM_PROVIDER="kakao"
    export KAKAO_API_KEY
    export KAKAO_API_URL
  elif [ "$SELECTED_PROVIDER" = "openai" ]; then
    read -r -p "OpenAI API key 입력: " OPENAI_API_KEY
    export LLM_PROVIDER="openai"
    export OPENAI_API_KEY
  elif [ "$SELECTED_PROVIDER" = "gemini" ]; then
    read -r -p "Gemini API key 입력: " GEMINI_API_KEY
    export LLM_PROVIDER="gemini"
    export GEMINI_API_KEY
  fi
fi

echo
echo "서버를 시작합니다..."
echo "브라우저 주소: http://127.0.0.1:8000/dashboard/index_llm_recommend.html"
echo "종료하려면 이 창에서 Ctrl+C 를 누르세요."
echo

python3 serve_dashboard.py
