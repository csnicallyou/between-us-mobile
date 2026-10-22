@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Установите Node.js LTS с nodejs.org и повторите запуск.
  pause
  exit /b 1
)
if not exist node_modules call npm.cmd ci
if errorlevel 1 exit /b 1
if not exist dist\index.html call npm.cmd run export:web
if errorlevel 1 exit /b 1
start "" http://localhost:8081
node scripts/serve.cjs
pause
