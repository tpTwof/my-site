"""应用配置。

`.env` 是唯一真相来源：启动时总是覆盖环境变量。
若用 override=False，终端里残留的旧 ADMIN_* 变量会悄悄盖掉 .env，
表现为「改了 .env、重启了，登录还是失败」。生产环境由 systemd 的
EnvironmentFile 注入，同样走这条路径，不受影响。

`TPTWO_ENV_FILE` 可指定另一个 .env 路径（测试用来隔离本地配置）。
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# 默认 backend/.env；测试通过 TPTWO_ENV_FILE 指向别处
ENV_FILE = Path(os.getenv("TPTWO_ENV_FILE") or Path(__file__).resolve().parent / ".env")

load_dotenv(ENV_FILE, override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./blog.db")


def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def admin_username() -> str:
    return os.getenv("ADMIN_USERNAME", "admin")


def admin_password_hash() -> str:
    """口令的 SHA-256 十六进制摘要。缺失时抛错，让启动期问题尽早暴露。"""
    value = os.getenv("ADMIN_PASSWORD_HASH", "").strip()
    if not value:
        raise RuntimeError(
            "ADMIN_PASSWORD_HASH 未设置。\n"
            "本地开发：在 backend/.env 里写 ADMIN_PASSWORD_HASH=<64 位十六进制>；\n"
            "生成方式（输入不受 shell 转义影响）：\n"
            '  python -c "import hashlib,getpass;'
            "print(hashlib.sha256(getpass.getpass().encode()).hexdigest())\""
        )
    return value


def session_ttl_hours() -> int:
    try:
        return int(os.getenv("AUTH_SESSION_TTL_HOURS", "168"))
    except ValueError:
        return 168


def summary() -> str:
    """启动时打印，便于确认进程实际加载了哪套配置（不含口令哈希本身）。"""
    env_source = f"文件 {ENV_FILE}" if ENV_FILE.exists() else "仅环境变量"
    try:
        hash_state = f"已设置({len(admin_password_hash())} 位)"
    except RuntimeError:
        hash_state = "缺失!"
    return (
        f"[config] 来源={env_source} | "
        f"ADMIN_USERNAME={admin_username()} | "
        f"ADMIN_PASSWORD_HASH={hash_state} | "
        f"DATABASE_URL={DATABASE_URL}"
    )