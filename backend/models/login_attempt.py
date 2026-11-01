"""登录失败记录，用于账号锁定。

nginx 的 limit_req 只能按 IP 限流；攻击者换 IP（代理池）就绕过了。
这里按**账号**累计失败次数，跨 IP 生效。

表里只保留一行（单管理员），`key` 恒为用户名。
"""

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class LoginAttempt(SQLModel, table=True):
    __tablename__ = "login_attempts"

    # 用户名，单管理员场景下就是唯一那一行
    key: str = Field(primary_key=True, max_length=128)
    # 连续失败次数，登录成功时清零
    failures: int = Field(default=0)
    # 最后一次失败时间；窗口外的失败不计入
    last_failure_at: datetime | None = Field(default=None)
    # 锁定到期时间；null 表示未锁定
    locked_until: datetime | None = Field(default=None)

    @staticmethod
    def now() -> datetime:
        return datetime.now(timezone.utc)