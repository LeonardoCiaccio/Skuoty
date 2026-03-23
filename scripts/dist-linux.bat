@echo off
:: Converte il path Windows del progetto in path WSL e lancia electron-builder da Ubuntu
for /f "delims=" %%i in ('wsl -d Ubuntu -- wslpath -u "%~dp0.."') do set "WSL_PATH=%%i"
wsl -d Ubuntu -- bash -c "cd '%WSL_PATH%' && npx electron-builder --linux"
