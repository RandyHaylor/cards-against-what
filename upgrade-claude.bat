@echo off
echo Stopping Claude processes...
taskkill /f /im claude.exe 2>nul
timeout /t 2 /nobreak >nul
echo Upgrading Claude Code...
winget upgrade Anthropic.ClaudeCode
pause
