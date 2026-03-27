@echo off
echo ================================================
echo Starting ngrok tunnels for Final Three Con
echo ================================================
echo.
echo IMPORTANT: Copy these URLs after ngrok starts!
echo.

cd %~dp0
ngrok start --all --config=ngrok.yml
