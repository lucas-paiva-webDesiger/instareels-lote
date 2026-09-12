@echo off
echo ========================================================
echo Iniciando Reels Manager (Backend + Worker e Frontend)
echo ========================================================

REM Inicia o backend em uma nova janela
echo Iniciando Backend e Worker na porta 3000...
start "Reels Manager - Backend" cmd /k "set NODE_TLS_REJECT_UNAUTHORIZED=0 && cd backend && npx --no-install prisma db push && npm run dev"

REM Inicia o frontend em uma nova janela
echo Iniciando Frontend (Vite) na porta 5173...
start "Reels Manager - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Aplicação iniciada!
echo Frontend disponível em: http://localhost:5173
echo Backend disponivel em:  http://localhost:3000
echo.
echo DICA: Para que a Meta consiga baixar os vídeos da sua máquina durante testes,
echo lembre-se de abrir o Ngrok em uma terceira janela:
echo ngrok http 3000
echo ========================================================
echo Abrindo navegador...
start http://localhost:5173
pause
