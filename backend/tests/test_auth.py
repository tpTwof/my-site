"""管理端鉴权的端到端测试（pytest + TestClient）。

覆盖：正确登录、错误口令、未登录访问管理接口、登录后访问、登出、
伪造 Cookie、过期会话、公开接口不受影响。
"""

import hashlib
import os
import tempfile
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

PASSWORD = "correct horse battery staple"

# 环境变量必须在导入 app 之前设置
os.environ["ADMIN_USERNAME"] = "tester"
os.environ["ADMIN_PASSWORD_HASH"] = hashlib.sha256(PASSWORD.encode()).hexdigest()
_tmpdir = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmpdir}/test.db"

from database import engine, init_db  # noqa: E402
from main import app  # noqa: E402
from models.admin_session import AdminSession  # noqa: E402


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        yield c


def login(client, password=PASSWORD, username="tester"):
    return client.post(
        "/api/auth/login", json={"username": username, "password": password}
    )


# ── 登录 ──────────────────────────────────────
def test_login_success_sets_cookie(client):
    r = login(client)
    assert r.status_code == 200
    assert r.json()["username"] == "tester"
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
    assert r.json()["username"] == "tester"


# ── 会话不残留明文 ────────────────────────────
def test_no_plaintext_token_in_db(client):
    client.cookies.clear()
    login(client)
    token = client.cookies.get("tp_admin")
    with Session(engine) as db:
        stored = [r.token_hash for r in db.exec(select(AdminSession)).all()]
    assert token not in stored
    assert all(len(h) == 64 for h in stored)