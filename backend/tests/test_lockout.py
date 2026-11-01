"""登录锁定的测试。

nginx 的 limit_req 只能按 IP 限流，换 IP 就绕过；这里验证按**账号**计数
的锁定是否生效、锁定期间是否拒绝正确口令、成功后是否清零。
"""

import hashlib

import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_PASSWORD, TEST_USERNAME

from crud import auth as auth_crud  # noqa: E402
from database import engine, init_db  # noqa: E402
from main import app  # noqa: E402
from models.login_attempt import LoginAttempt  # noqa: E402

from sqlmodel import Session  # noqa: E402


@pytest.fixture()
def client():
    init_db()
    with TestClient(app) as c:
        # 每个用例从干净状态开始
        with Session(engine) as db:
            for row in db.exec(LoginAttempt.__table__.select()).all():
                db.exec(
                    LoginAttempt.__table__.delete().where(
                        LoginAttempt.__table__.c.key == row.key
                    )
                )
            db.commit()
        yield c


def login(client, password=TEST_PASSWORD, username=TEST_USERNAME):
    return client.post(
        "/api/auth/login", json={"username": username, "password": password}
    )


def test_locks_after_max_failures(client):
    limit = auth_crud.MAX_FAILURES
    for i in range(limit - 1):
        r = login(client, password="wrong")
        assert r.status_code == 401, f"第 {i + 1} 次应为 401"

    # 第 limit 次失败会触发锁定
    r = login(client, password="wrong")
    assert r.status_code == 401

    # 之后即使是正确口令也被拒
    r = login(client)
    assert r.status_code == 429
    assert "Retry-After" in r.headers


def test_lockout_blocks_correct_password(client):
    for _ in range(auth_crud.MAX_FAILURES):
        login(client, password="wrong")

    r = login(client)  # 正确口令
    assert r.status_code == 429
    assert int(r.headers["Retry-After"]) > 0


def test_remaining_attempts_hint(client):
    """临近锁定时应提示剩余次数，避免用户一头雾水。"""
    limit = auth_crud.MAX_FAILURES
    r = login(client, password="wrong")
    assert r.status_code == 401
    # 第一次失败后剩余 limit-1 次；只有剩余 1~2 次时才提示
    if limit - 1 <= 2:
        assert "还可尝试" in r.json()["detail"]


def test_successful_login_clears_failures(client):
    """成功登录后计数清零，不会因为历史失败被提前锁。"""
    limit = auth_crud.MAX_FAILURES
    for _ in range(limit - 1):
        login(client, password="wrong")

    r = login(client)
    assert r.status_code == 200

    # 清零后再失败 limit-1 次仍然不锁
    for _ in range(limit - 1):
        r = login(client, password="wrong")
        assert r.status_code == 401

    # 此时仍可用正确口令登录
    assert login(client).status_code == 200


def test_lock_is_per_account_not_per_ip(client):
    """锁定按账号计数：不同用户名各自独立。

    单管理员场景下只有配置中的用户名会走到锁定分支，
    这里确认用户名不同不会互相影响锁定计数。
    """
    limit = auth_crud.MAX_FAILURES
    for _ in range(limit):
        login(client, username="attacker", password="wrong")

    # 正确账号不受影响
    assert login(client).status_code == 200


def test_failure_window_resets_counter(client):
    """距上次失败超过窗口时间，计数重新开始。"""
    import datetime as dt

    with Session(engine) as db:
        db.add(
            LoginAttempt(
                key=TEST_USERNAME,
                failures=auth_crud.MAX_FAILURES - 1,
                last_failure_at=(
                    dt.datetime.now(dt.timezone.utc)
                    - dt.timedelta(minutes=auth_crud.FAILURE_WINDOW_MINUTES + 1)
                ),
            )
        )
        db.commit()

    # 窗口已过，这次失败应把计数重置为 1，而不是触发锁定
    r = login(client, password="wrong")
    assert r.status_code == 401

    with Session(engine) as db:
        row = db.get(LoginAttempt, TEST_USERNAME)
        assert row is not None
        assert row.failures == 1
        assert row.locked_until is None


def test_wrong_password_does_not_leak_which_field(client):
    a = login(client, password="wrong").json()["detail"]
    b = login(client, password=TEST_PASSWORD, username="nobody").json()["detail"]
    # 两者都应包含同样的核心文案（可能有剩余次数后缀）
    assert a.startswith("账号或密码错误")
    assert b.startswith("账号或密码错误")