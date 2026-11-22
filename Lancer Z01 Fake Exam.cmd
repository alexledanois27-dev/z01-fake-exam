@echo off
setlocal
where py >nul 2>nul
if errorlevel 1 goto python
py -3 "%~dp0scripts\launch.py"
if errorlevel 1 pause
exit /b
:python
where python >nul 2>nul
if errorlevel 1 goto missing
python "%~dp0scripts\launch.py"
if errorlevel 1 pause
exit /b
:missing
echo Python 3 est introuvable. Installe Python 3 puis relance ce fichier.
pause
