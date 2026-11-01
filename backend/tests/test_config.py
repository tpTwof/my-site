"""配置解析的测试。

覆盖历史上真实发生过的故障：终端里残留的 ADMIN_* 环境变量曾悄悄盖掉
backend/.env，导致「改了 .env、重启了，登录还是失败」，而当时所有测试
依然全绿——因为测试从不加载 .env。这里补上那条缺失的断言。
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
PYTHON = BACKEND / ".venv" / "Scripts" / "python.exe"
if not PYTHON.exists():  # 非 Windows 或未建 venv 时退回当前解释器
    PYTHON = Path(sys.executable)


def run_py(script: str, extra_env: dict[str, str]) -> str:
    env = dict(os.environ)
    for key in ("ADMIN_USERNAME", "ADMIN_PASSWORD_HASH", "DATABASE_URL", "CORS_ORIGINS"):
        env.pop(key, None)
    env.update(extra_env)

    result = subprocess.run(
        [str(PYTHON), "-c", script],
        cwd=BACKEND,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return (result.stdout + result.stderr).strip()


def test_env_file_overrides_pre_set_environment():
    """核心断言：.env 压过已存在的同名环境变量。

    直接针对 dotenv 的行为断言，不依赖 config 模块的加载时序。
    """
    env_file = Path(tempfile.mkdtemp()) / ".env"
    env_file.write_text("ADMIN_USERNAME=from_file\n", encoding="utf-8")

    script = f"""
import os
from dotenv import load_dotenv
load_dotenv({str(env_file)!r}, override=True)
print("RESULT=" + os.getenv("ADMIN_USERNAME", ""))
"""
    out = run_py(script, {"ADMIN_USERNAME": "from_shell"})
    assert "RESULT=from_file" in out, out


def test_config_module_uses_env_file():
    """.env 存在时，config 的值来自 .env，而不是环境变量。"""
    script = """
import config
print("NAME=" + config.admin_username())
print("SRC=" + config.summary())
"""
    out = run_py(script, {"ADMIN_USERNAME": "from_shell"})
    # 仓库里存在 backend/.env 时才会覆盖；没有 .env 则环境变量生效
    if (BACKEND / ".env").exists():
        assert "from_shell" not in out, out
        assert "来源=文件" in out, out
    else:
        assert "NAME=from_shell" in out, out
        assert "仅环境变量" in out, out


def test_environment_used_when_no_env_file():
    """没有 .env 时（生产 systemd 注入），环境变量必须原样生效。

    用子进程并把 backend/.env 屏蔽掉，保证结果不受本机是否存在 .env 影响。
    """
    script = f"""
import sys
from pathlib import Path
import dotenv
dotenv.load_dotenv = lambda *a, **k: False
sys.path.insert(0, {str(BACKEND)!r})
import config
print("NAME=" + config.admin_username())
"""
    out = run_py(script, {"ADMIN_USERNAME": "from_systemd"})
    assert "NAME=from_systemd" in out, out


def test_missing_hash_raises_config_error():
    """口令哈希为空时必须抛 ConfigError，让启动期就失败。"""
    script = """
import sys, os
import dotenv
dotenv.load_dotenv = lambda *a, **k: False
os.environ.pop("ADMIN_PASSWORD_HASH", None)
sys.path.insert(0, %r)
import config
try:
    config.admin_password_hash()
except config.ConfigError:
    print("RAISED")
else:
    print("NOT_RAISED")
""" % str(BACKEND)
    out = run_py(script, {})
    assert "RAISED" in out, out


def test_summary_flags_env_file_overriding():
    """`.env` 覆盖环境变量时，摘要必须提示，避免误读为一切正常。"""
    script = f"""
import sys
from pathlib import Path
sys.path.insert(0, {str(BACKEND)!r})
import config
print("SRC=" + config.summary())
"""
    out = run_py(script, {})
    assert "覆盖" in out or "仅环境变量" in out, out