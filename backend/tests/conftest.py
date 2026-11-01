"""pytest 共享配置。

config.py 会用 .env 覆盖环境变量（.env 是唯一真相来源），所以测试必须
把 TPTWO_ENV_FILE 指向一个不存在的路径，否则本地的 backend/.env 会覆盖
下面的测试账号。

环境变量也只能设置一次——config 在首次导入时就把值读进内存，多个测试
文件各自改写 os.environ 只有先导入的那个生效。
"""

import hashlib
import os
import tempfile

TEST_USERNAME = "tester"
TEST_PASSWORD = "correct horse battery staple"

# 必须在 import config 之前设置
os.environ["TPTWO_ENV_FILE"] = os.path.join(tempfile.mkdtemp(), "no-such.env")
os.environ["ADMIN_USERNAME"] = TEST_USERNAME
os.environ["ADMIN_PASSWORD_HASH"] = hashlib.sha256(TEST_PASSWORD.encode()).hexdigest()
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ.pop("AUTH_SESSION_TTL_HOURS", None)