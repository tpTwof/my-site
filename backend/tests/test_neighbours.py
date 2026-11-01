"""详情页上一篇/下一篇的测试。

顺序与公开列表一致（created_at 倒序）：列表里排在当前文章更上面的那篇是
「上一篇」，更下面的那篇是「下一篇」。

注意：测试库是全模块共享的，前一个用例建的文章会残留在库里。
所以这里不能断言"没有上一篇/下一篇"这种全局性质，而是先取出当前文章
全量邻居关系，再断面言——或者把断言限定在本用例新建的几篇之间。
"""

import time

import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_PASSWORD, TEST_USERNAME

from database import init_db  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        c.post(
            "/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
        )
        yield c


def make_published(client, title):
    r = client.post(
        "/api/admin/posts",
        json={"title": title, "content_markdown": "x", "status": "published"},
    )
    assert r.status_code == 201, r.text
    return r.json()["slug"]


def detail(client, slug):
    r = client.get(f"/api/posts/{slug}")
    assert r.status_code == 200, r.text
    return r.json()


def test_middle_post_links_to_both_sides(client):
    """三篇连续文章，中间那篇的上一篇/下一篇应指准确。"""
    a = make_published(client, "Chain A")
    time.sleep(0.01)
    b = make_published(client, "Chain B")
    time.sleep(0.01)
    c = make_published(client, "Chain C")

    # a 最早、c 最新；列表按时间倒序 => c, b, a
    data = detail(client, b)
    assert data["previous"]["slug"] == c, "上一篇应是列表里更靠上的 c"
    assert data["next"]["slug"] == a, "下一篇应是列表里更靠下的 a"


def test_neighbours_follow_list_order(client):
    """上一篇/下一篇的先后必须和列表顺序一致。"""
    first = make_published(client, "Order First")
    time.sleep(0.01)
    second = make_published(client, "Order Second")

    # 列表里 second 在前、first 在后
    listing = client.get("/api/posts?limit=50").json()["items"]
    slugs = [item["slug"] for item in listing]
    assert slugs.index(second) < slugs.index(first)

    data = detail(client, second)
    assert data["previous"] is None or data["previous"]["slug"] != first
    assert data["next"]["slug"] == first


def test_drafts_are_not_neighbours(client):
    """草稿不参与上一篇/下一篇。"""
    first = make_published(client, "Draft Gap First")
    time.sleep(0.01)
    client.post(
        "/api/admin/posts",
        json={"title": "Hidden Draft Gap", "content_markdown": "x", "status": "draft"},
    )
    time.sleep(0.01)
    last = make_published(client, "Draft Gap Last")

    data = detail(client, last)
    assert data["next"]["slug"] == first, "草稿不应出现在 next 里"
    assert data["next"]["title"] != "Hidden Draft Gap"


def test_neighbour_shape_is_minimal(client):
    """相邻文章只返回 slug 和 title，不带正文。"""
    make_published(client, "Shape A")
    time.sleep(0.01)
    b = make_published(client, "Shape B")

    data = detail(client, b)
    assert data["next"] is not None
    assert set(data["next"].keys()) == {"slug", "title"}


def test_detail_keeps_all_original_fields(client):
    """加相邻文章后，详情本身的字段不能丢。"""
    slug = make_published(client, "Body Check")
    data = detail(client, slug)
    for field in ("id", "slug", "title", "content_markdown", "status", "created_at"):
        assert field in data, f"缺少字段 {field}"
    assert data["content_markdown"] == "x"


def test_neighbour_slug_is_publicly_reachable(client):
    """返回的 slug 必须能打开自己的详情页（不是草稿）。"""
    make_published(client, "Reachable A")
    time.sleep(0.01)
    b = make_published(client, "Reachable B")

    data = detail(client, b)
    nxt = data["next"]
    assert nxt is not None
    again = client.get(f"/api/posts/{nxt['slug']}")
    assert again.status_code == 200
    assert again.json()["title"] == nxt["title"]