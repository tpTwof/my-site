"""应用配置。

优先读环境变量；本地开发可把变量写进 `backend/.env`（已在 .gitignore 中），
避免在终端里手敲——口令里的 @、$、! 等字符在 shell 中会被解析，导致哈希算错。

本地开发若怀疑环境变量残留覆盖了 .env，设 DOTENV_OVERRIDE=true 让 .env 优先。
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# .env 与 backend/ 同级
ENV_FILE = Path(__file__).resolve().parent / ".env"

# 默认不覆盖已存在的环境变量（生产由 systemd 注入，应当优先）；
# 本地排查时可设 DOTENV_OVERRIDE=true 让 .env 覆盖环境变量。
_override = os.getenv("DOTENV_OVERRIDE", "").lower() in ("1", "true", "yes")
load_dotenv(ENV_FILE, override=_override)

DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./blog.db")


def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS)
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