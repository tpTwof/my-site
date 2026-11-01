"""应用配置。

配置来源是二选一，`backend/.env` 存在时以它为准：
- 有 `.env`：读取并**覆盖**同名环境变量。否则终端里残留的旧 ADMIN_*
  会悄悄盖掉 .env，表现为「改了 .env、重启了，登录还是失败」。
- 无 `.env`：环境变量原样生效（生产由 systemd 的 EnvironmentFile 注入）。

因此**服务器上不要放 `.env`**，否则它会盖掉 `/etc/tptwo/env`。
"""

import os
from pathlib import Path

from dotenv import load_dotenv

ENV_FILE = Path(__file__).resolve().parent / ".env"


class ConfigError(Exception):
    """配置缺失或非法。启动期就该失败，不要拖着带病运行。"""


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
        raise ConfigError(
            "ADMIN_PASSWORD_HASH 未设置。\n"
            "本地开发：在 backend/.env 里写 ADMIN_PASSWORD_HASH=<64 位十六进制>；\n"
            "生成方式（输入不受 shell 转义影响）：\n"
            '  python -c "import hashlib,getpass;'
            "print(hashlib.sha256(getpass.getpass().encode()).hexdigest())"
        )
    return value


def session_ttl_hours() -> int:
    try:
        return int(os.getenv("AUTH_SESSION_TTL_HOURS", "168"))
    except ValueError:
        return 168


def summary() -> str:
    """启动时打印，便于确认进程实际加载了哪套配置（不含口令哈希本身）。"""
    if ENV_FILE.exists():
        # .env 会盖掉环境变量。生产环境应当只靠 systemd 注入，若服务器上
        # 误留了 .env，它会把 /etc/tptwo/env 的凭据换掉——必须显式警示。
        env_source = f"文件 {ENV_FILE}（已覆盖同名环境变量）"
    else:
        env_source = "仅环境变量"

    try:
        hash_state = f"已设置({len(admin_password_hash())} 位)"
    except ConfigError:
        hash_state = "缺失!"

    return (
        f"[config] 来源={env_source} | "
        f"ADMIN_USERNAME={admin_username()} | "
        f"ADMIN_PASSWORD_HASH={hash_state} | "
        f"DATABASE_URL={DATABASE_URL}"
    )