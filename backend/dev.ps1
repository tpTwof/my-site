# 本地开发启动脚本：先清理残留后端进程，再启动
#
# 用法：  .\dev.ps1
#
# 为什么需要它：uvicorn 的 --reload 会派生 worker 子进程；只 Ctrl+C 或只杀父进程时，
# worker 可能变成孤儿继续占用端口并沿用旧配置，表现为「改了代码/配置却不生效」。

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "清理残留后端进程..." -ForegroundColor Cyan

# 1. 释放 8000 端口
Get-NetTCPConnection -LocalPort 8000 -State Listen |
    ForEach-Object {
        Write-Host "  停止监听 8000 的进程 PID=$($_.OwningProcess)"
        Stop-Process -Id $_.OwningProcess -Force
    }

# 2. 清掉所有本项目的 uvicorn 进程（含孤儿 worker）
Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -like '*uvicorn*' } |
    ForEach-Object {
        Write-Host "  停止残留 uvicorn PID=$($_.ProcessId)"
        Stop-Process -Id $_.ProcessId -Force
    }

Start-Sleep -Seconds 2

$still = Get-NetTCPConnection -LocalPort 8000 -State Listen
if ($still) {
    Write-Host "端口 8000 仍被占用（PID=$($still.OwningProcess)），请手动处理。" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path .env)) {
    Write-Host "警告：未找到 .env，将使用环境变量配置。" -ForegroundColor Yellow
}

Write-Host "启动后端 http://127.0.0.1:8000 ..." -ForegroundColor Green
.venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000 --reload --reload-include ".env"