"""本地开发启动脚本：清理残留后端进程后启动 uvicorn。

用法:
    python dev.py

为什么需要清理：uvicorn 的 --reload 会派生 worker 子进程。只按 Ctrl+C
或只结束父进程时，worker 可能变成孤儿继续占用 8000 端口，并沿用它自己
加载的旧代码/旧配置——表现为「改了代码或 .env 却不生效」。

用 Python 而不是 .ps1 是因为 Windows 默认执行策略（Restricted）会拦下
未签名的 PowerShell 脚本。
"""

import subprocess
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
PORT = 8000


def listening_pids(port: int) -> set[int]:
    """返回正在监听指定端口的进程 PID。仅 Windows 可用。"""
    try:
        out = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                (
                    f"(Get-NetTCPConnection -LocalPort {port} -State Listen "
                    "-ErrorAction SilentlyContinue).OwningProcess"
                ),
            ],
            capture_output=True,
            text=True,
            timeout=20,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return set()
    return {int(tok) for tok in out.split() if tok.strip().isdigit()}


def uvicorn_pids() -> set[int]:
    """返回命令行里含 uvicorn 的 python 进程 PID。仅 Windows 可用。"""
    try:
        out = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                (
                    "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" "
                    "| Where-Object { $_.CommandLine -like '*uvicorn*' -or "
                    "$_.CommandLine -like '*multiprocessing-fork*' } "
                    "| Select-Object -ExpandProperty ProcessId"
                ),
            ],
            capture_output=True,
            text=True,
            timeout=20,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return set()
    return {int(tok) for tok in out.split() if tok.strip().isdigit()}


def kill(pid: int) -> None:
    subprocess.run(
        ["taskkill", "/PID", str(pid), "/T", "/F"],
        capture_output=True,
        timeout=20,
    )


def main() -> int:
    print("[dev] 清理残留后端进程...", flush=True)

    stale = listening_pids(PORT) | uvicorn_pids()
    stale.discard(0)  # Windows 偶尔把已关闭的连接报成 PID 0
    if stale:
        for pid in sorted(stale):
            print(f"  结束 PID {pid}", flush=True)
            kill(pid)
        time.sleep(2)
    else:
        print("  无残留进程", flush=True)

    still = listening_pids(PORT)
    if still:
        print(f"[dev] 端口 {PORT} 仍被占用: {sorted(still)}", flush=True)
        print("      请手动结束这些进程后重试。", flush=True)
        return 1

    print("[dev] 端口已就绪，启动后端 http://127.0.0.1:8000", flush=True)
    print("[dev] 注意：不使用 --reload。", flush=True)
    print("      该选项会派生 worker 子进程，在本环境下会导致登录恒返回 401", flush=True)
    print("      （配置读得到，但校验失败）。改代码后请手动重启本脚本。", flush=True)
    print("", flush=True)

    uvicorn = BACKEND_DIR / ".venv" / "Scripts" / "uvicorn.exe"
    if not uvicorn.exists():
        print(f"[dev] 找不到 {uvicorn}", flush=True)
        return 1

    try:
        subprocess.run(
            [
                str(uvicorn),
                "main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(PORT),
            ],
            cwd=BACKEND_DIR,
        )
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())