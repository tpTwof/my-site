"""pytest 共享配置。

测试必须在导入 app 之前设置好环境变量，且**只能设置一次**——
config 模块在首次导入时就把值读进内存了，多个测试文件各自改写
os.environ 只有先导入的那个生效，后改的无效。统一在这里初始化。
"""

import hashlib
import os
import tempfile

TEST_USERNAME = "tester"
TEST_PASSWORD = "correct horse battery staple"

os.environ["ADMIN_USERNAME"] = TEST_USERNAME
os.environ["ADMIN_PASSWORD_HASH"] = hashlib.sha256(TEST_PASSWORD.encode()).hexdigest()

# 每个测试会话用独立的数据库文件，互不干扰
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"

# 去掉可能来自 backend/.env 的干扰项
os.environ.pop("AUTH_SESSION_TTL_HOURS", None)