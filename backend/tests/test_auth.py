"""管理端鉴权的端到端测试（pytest + TestClient）。

覆盖：正确登录、错误口令、未登录访问管理接口、登录后访问、登出、
伪造 Cookie、过期会话、公开接口不受影响。

环境变量由 conftest.py 统一初始化。
"""

import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from tests.conftest import TEST_PASSWORD as PASSWORD
from tests.conftest import TEST_USERNAME

from database import engine, init_db  # noqa: E402
from main import app  # noqa: E402
from models.admin_session import AdminSession  # noqa: E402


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        yield c


def login(client, password=PASSWORD, username=TEST_USERNAME):
    return client.post(
        "/api/auth/login", json={"username": username, "password": password}
    )


# ── 登录 ──────────────────────────────────────
def test_login_success_sets_cookie(client):
    r = login(client)
    assert r.status_code == 200
    assert r.json()["username"] == TEST_USERNAME
    assert "tp_admin" in r.cookies


def test_login_sets_httponly_cookie(client):
    r = login(client)
    raw = r.headers.get("set-cookie", "").lower()
    assert "httponly" in raw
    assert "samesite=lax" in raw
    assert "path=/" in raw


def test_login_wrong_password(client):
    r = login(client, password="nope")
    assert r.status_code == 401
    assert "tp_admin" not in r.cookies


def test_login_wrong_username(client):
    r = login(client, username="someoneelse")
    assert r.status_code == 401


def test_login_error_message_is_generic(client):
    """不透露是账号错还是口令错。"""
    a = login(client, password="nope").json()["detail"]
    b = login(client, password=PASSWORD, username="nobody").json()["detail"]
    assert a == b


# ── 管理接口的保护 ────────────────────────────
PROTECTED = [
    ("get", "/api/admin/posts"),
    ("get", "/api/admin/posts/does-not-matter"),
    ("post", "/api/admin/posts"),
    ("put", "/api/admin/posts/does-not-matter"),
    ("delete", "/api/admin/posts/does-not-matter"),
]


@pytest.mark.parametrize("method,path", PROTECTED)
def test_admin_requires_auth(client, method, path):
    client.cookies.clear()  # 确保未登录
    r = getattr(client, method)(path) if method != "post" else client.post(path, json={})
    assert r.status_code == 401, f"{method.upper()} {path} -> {r.status_code}"


def test_admin_ok_after_login(client):
    client.cookies.clear()
    assert login(client).status_code == 200
    r = client.get("/api/admin/posts")
    assert r.status_code == 200
    assert "items" in r.json()


# ── 登出 ──────────────────────────────────────
def test_logout_revokes_session(client):
    client.cookies.clear()
    login(client)
    token = client.cookies.get("tp_admin")
    assert client.get("/api/admin/posts").status_code == 200

    assert client.post("/api/auth/logout").status_code == 204

    # 用旧令牌重放也不应通过
    client.cookies.clear()
    client.cookies.set("tp_admin", token)
    assert client.get("/api/admin/posts").status_code == 401


def test_logout_clears_cookie_header(client):
    """登出必须在响应里带上清 Cookie 的 Set-Cookie。

    之前这里 return 了一个新的 Response，注入 response 上的 delete_cookie
    被丢掉，浏览器端 Cookie 会残留。
    """
    client.cookies.clear()
    login(client)
    r = client.post("/api/auth/logout")
    assert r.status_code == 204
    raw = r.headers.get("set-cookie", "")
    assert "tp_admin=" in raw, f"缺少清除 Cookie 的头，实际: {raw!r}"
    # 清除是通过把值置空并 Max-Age=0 实现的
    assert "max-age=0" in raw.lower() or 'tp_admin=""' in raw or "tp_admin=;" in raw


def test_logout_is_idempotent(client):
    client.cookies.clear()
    assert client.post("/api/auth/logout").status_code == 204


# ── 伪造与过期 ────────────────────────────────
def test_forged_cookie_rejected(client):
    client.cookies.clear()
    client.cookies.set("tp_admin", "i-made-this-up")
    assert client.get("/api/admin/posts").status_code == 401


def test_expired_session_rejected_and_purged(client):
    client.cookies.clear()
    login(client)
    token = client.cookies.get("tp_admin")
    digest = hashlib.sha256(token.encode()).hexdigest()

    # 手动把会话改成已过期
    with Session(engine) as db:
        record = db.get(AdminSession, digest)
        assert record is not None
        record.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.add(record)
        db.commit()

    assert client.get("/api/admin/posts").status_code == 401

    with Session(engine) as db:
        assert db.get(AdminSession, digest) is None, "过期会话应被清除"


# ── 公开接口不受影响 ──────────────────────────
def test_public_endpoints_open(client):
    client.cookies.clear()
    assert client.get("/api/posts").status_code == 200
    assert client.get("/api/home").status_code == 200


def test_me_requires_auth(client):
    client.cookies.clear()
    assert client.get("/api/auth/me").status_code == 401
    login(client)
    r = client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["username"] == TEST_USERNAME


def test_login_returns_configured_username_not_echo(client):
    """登录响应应返回配置里的用户名，而不是回显请求体。"""
    client.cookies.clear()
    # 大小写不同的用户名不该通过校验
    r = login(client, username=TEST_USERNAME.upper())
    assert r.status_code == 401

    r = login(client)
    assert r.status_code == 200
    assert r.json()["username"] == TEST_USERNAME


# ── 会话不残留明文 ────────────────────────────
def test_no_plaintext_token_in_db(client):
    client.cookies.clear()
    login(client)
    token = client.cookies.get("tp_admin")
    with Session(engine) as db:
        stored = [r.token_hash for r in db.exec(select(AdminSession)).all()]
    assert token not in stored
    assert all(len(h) == 64 for h in stored)