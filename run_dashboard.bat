@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo Seongdong Dashboard Launcher
echo ==========================================
echo.
echo 1. LLM_API_KEY 또는 OPENAI_API_KEY, GEMINI_API_KEY, KAKAO_API_KEY 중 하나가 있으면 AI 답변이 나옵니다.
echo 2. 그냥 Enter를 누르면 AI 없이 제한형 응답으로 실행됩니다.
echo 3. 브랜드와 상관없는 API는 generic을 선택하고 LLM_API_URL을 입력하세요.
echo.

if "%LLM_API_KEY%"=="" if "%OPENAI_API_KEY%"=="" if "%GEMINI_API_KEY%"=="" if "%GOOGLE_API_KEY%"=="" if "%KAKAO_API_KEY%"=="" if "%KAKAO_REST_API_KEY%"=="" (
  set /p SELECTED_PROVIDER=사용할 provider 입력 (generic/kakao/gemini/openai, 없으면 Enter): 
  if /I "%SELECTED_PROVIDER%"=="generic" (
    set /p LLM_API_KEY=LLM API key 입력: 
    set /p LLM_API_URL=LLM API URL 입력: 
    set /p LLM_MODEL=LLM model 입력 (없으면 custom-model): 
    if "%LLM_MODEL%"=="" set LLM_MODEL=custom-model
    set LLM_PROVIDER=generic
  )
  if /I "%SELECTED_PROVIDER%"=="kakao" (
    set /p KAKAO_API_KEY=Kakao REST API key 입력: 
    set /p KAKAO_API_URL=Kakao API URL 입력: 
    set LLM_PROVIDER=kakao
  )
  if /I "%SELECTED_PROVIDER%"=="openai" (
    set /p OPENAI_API_KEY=OpenAI API key 입력: 
    set LLM_PROVIDER=openai
  )
  if /I "%SELECTED_PROVIDER%"=="gemini" (
    set /p GEMINI_API_KEY=Gemini API key 입력: 
    set LLM_PROVIDER=gemini
  )
)

echo.
echo 서버를 시작합니다...
echo 브라우저 주소: http://127.0.0.1:8000/dashboard/index_llm_recommend.html
echo 종료하려면 이 창에서 Ctrl+C 를 누르세요.
echo.

python3 serve_dashboard.py

endlocal
