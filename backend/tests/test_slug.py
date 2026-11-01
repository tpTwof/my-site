"""文章 slug 冲突语义的测试。

规则（见 docs/API-SPEC.md）：
- 用户显式指定 slug 撞车 → 409，绝不静默改名
- 由标题自动生成 slug 撞车 → 追加随机后缀，写入成功
- 更新时把 slug 传空串 → 按标题重新生成

环境变量由 conftest.py 统一初始化。
"""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_PASSWORD, TEST_USERNAME

from database import init_db  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        c.post("/api/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})
        yield c


def create(client, **body):
    return client.post("/api/admin/posts", json=body)


def test_auto_slug_suffixes_on_collision(client):
    a = create(client, title="Slug Collision Title", status="draft")
    b = create(client, title="Slug Collision Title", status="draft")
    assert a.status_code == 201 and b.status_code == 201
    assert a.json()["slug"] == "slug-collision-title"
    assert b.json()["slug"] != "slug-collision-title"
    assert b.json()["slug"].startswith("slug-collision-title-")


def test_explicit_slug_collision_is_409(client):
    create(client, title="X", slug="taken-slug", status="draft")
    r = create(client, title="Y", slug="taken-slug", status="draft")
    assert r.status_code == 409
    assert "taken-slug" in r.json()["detail"]


def test_update_explicit_slug_collision_is_409(client):
    create(client, title="A", slug="a-post", status="draft")
    b = create(client, title="B", slug="b-post", status="draft").json()

    r = client.put(f"/api/admin/posts/{b['id']}", json={"slug": "a-post"})
    assert r.status_code == 409
    # 冲突后 b 的 slug 不应被改
    still = client.get(f"/api/admin/posts/{b['id']}").json()
    assert still["slug"] == "b-post"


def test_blank_slug_regenerates_from_title(client):
    post = create(client, title="Regenerate Me", slug="custom-slug", status="draft").json()
    assert post["slug"] == "custom-slug"

    r = client.put(f"/api/admin/posts/{post['id']}", json={"slug": ""})
    assert r.status_code == 200
    assert r.json()["slug"] == "regenerate-me"


def test_blank_slug_uses_new_title(client):
    post = create(client, title="Old Title Here", status="draft").json()
    assert post["slug"] == "old-title-here"

    r = client.put(
        f"/api/admin/posts/{post['id']}", json={"title": "New Title Here", "slug": ""}
    )
    assert r.status_code == 200
    assert r.json()["slug"] == "new-title-here"


def test_regenerate_does_not_collide_with_self(client):
    """重新生成的 slug 等于自己原有的 slug 时，不应加随机后缀。"""
    post = create(client, title="Stable Slug", status="draft").json()
    assert post["slug"] == "stable-slug"

    r = client.put(f"/api/admin/posts/{post['id']}", json={"slug": ""})
    assert r.status_code == 200
    assert r.json()["slug"] == "stable-slug"