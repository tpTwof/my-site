"""pytest 共享配置。

必须在导入 config **之前**生效，且只能生效一次——config 在 import 时就把
配置读进内存了，多个测试文件各自改写 os.environ 只有先导入的那个起作用。

这里把 dotenv.load_dotenv 换成空操作，让测试完全不读 backend/.env。
否则本地的 .env 会盖掉下面设的测试账号（config 用 override=True）。
.env 的真实行为由 tests/test_config.py 在独立子进程里验证。
"""

import hashlib
import os
import tempfile

import dotenv

# 先于任何 config 导入，禁用 .env
dotenv.load_dotenv = lambda *args, **kwargs: False  # type: ignore[assignment]

TEST_USERNAME = "tester"
TEST_PASSWORD = "correct horse battery staple"

os.environ["ADMIN_USERNAME"] = TEST_USERNAME
os.environ["ADMIN_PASSWORD_HASH"] = hashlib.sha256(TEST_PASSWORD.encode()).hexdigest()
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ.pop("AUTH_SESSION_TTL_HOURS", None)