"""管理端鉴权：口令校验、登录锁定与会话管理。

设计取舍：
- 单账号，账号与口令哈希来自配置（环境变量或 backend/.env），不建用户表。
- 会话存在数据库里（`admin_sessions`），因此可以主动登出、改口令后吊销全部会话；
  不做无状态 JWT——单用户场景下它的唯一优势（免存储）不值得放弃吊销能力。
- 令牌只以 sha256 摘要入库。
- 登录失败按**账号**累计并锁定（`login_attempts`）：nginx 只能按 IP 限流，
  换 IP 就绕过；按账号计数才挡得住代理池。
"""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from config import admin_password_hash, admin_username, session_ttl_hours
from models.admin_session import AdminSession
from models.login_attempt import LoginAttempt

# 连续失败多少次后锁定
MAX_FAILURES = int(os.getenv("AUTH_MAX_FAILURES", "5"))
# 锁定多久（分钟）
LOCKOUT_MINUTES = int(os.getenv("AUTH_LOCKOUT_MINUTES", "15"))
# 失败计数的重置窗口（分钟）：超过这个时间没再失败，计数清零
FAILURE_WINDOW_MINUTES = int(os.getenv("AUTH_FAILURE_WINDOW_MINUTES", "15"))


class LockedOut(Exception):
    """账号处于锁定期。由 router 映射为 429 并带上剩余秒数。"""

    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after
        super().__init__(f"尝试次数过多，请 {retry_after} 秒后重试")


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _aware(dt: datetime | None) -> datetime | None:
    """SQLite 读回来是 naive，统一按 UTC 处理。"""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def verify_credentials(username: str, password: str) -> bool:
    """口令以 SHA-256 十六进制对比，用 hmac.compare_digest 防时序侧信道。"""
    if not hmac.compare_digest(username, admin_username()):
        return False
    expected = admin_password_hash()
    actual = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(actual, expected)


def ensure_not_locked(db: Session, key: str) -> None:
    """账号在锁定期内则抛 LockedOut。"""
    row = db.get(LoginAttempt, key)
    if row is None:
        return
    until = _aware(row.locked_until)
    now = datetime.now(timezone.utc)
    if until is not None and until > now:
        raise LockedOut(retry_after=int((until - now).total_seconds()))


def record_failure(db: Session, key: str) -> int:
    """记录一次失败，必要时锁定。返回当前的连续失败次数。"""
    now = datetime.now(timezone.utc)
    row = db.get(LoginAttempt, key)

    if row is None:
        row = LoginAttempt(key=key, failures=0)
        db.add(row)

    # 距上次失败超过窗口，计数重新开始
    last = _aware(row.last_failure_at)
    if last is None or (now - last) > timedelta(minutes=FAILURE_WINDOW_MINUTES):
        row.failures = 0

    row.failures += 1
    row.last_failure_at = now
    if row.failures >= MAX_FAILURES:
        row.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)

    db.add(row)
    db.commit()
    db.refresh(row)
    return row.failures


def clear_failures(db: Session, key: str) -> None:
    """登录成功后清空失败记录。"""
    row = db.get(LoginAttempt, key)
    if row is None:
        return
    db.delete(row)
    db.commit()


def create_session(db: Session) -> tuple[str, AdminSession]:
    """签发新会话，返回 (明文 token, 会话记录)。明文只在这一刻存在于内存。"""
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    session = AdminSession(
        token_hash=_hash_token(token),
        created_at=now,
        expires_at=now + timedelta(hours=session_ttl_hours()),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return token, session


def get_valid_session(db: Session, token: str) -> AdminSession | None:
    """取出未过期的会话；过期记录顺手删除。"""
    if not token:
        return None
    record = db.get(AdminSession, _hash_token(token))
    if record is None:
        return None
    if _is_expired(record):
        db.delete(record)
        db.commit()
        return None
    return record


def purge_expired(db: Session) -> int:
    """删除所有已过期会话，返回删除条数。

    登录时会话表只会因为令牌被使用而过期清理；长期不登录的残留行需要
    这里主动清扫（启动时调用一次即可）。
    """
    records = db.exec(select(AdminSession)).all()
    expired = [r for r in records if _is_expired(r)]
    for record in expired:
        db.delete(record)
    if expired:
        db.commit()
    return len(expired)


def revoke_session(db: Session, token: str) -> bool:
    record = db.get(AdminSession, _hash_token(token))
    if record is None:
        return False
    db.delete(record)
    db.commit()
    return True


def _is_expired(record: AdminSession) -> bool:
    expires_at = record.expires_at
    if expires_at.tzinfo is None:  # SQLite 读回来是 naive，按 UTC 处理
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= datetime.now(timezone.utc)