"""标签功能测试。

覆盖：默认标签、大小写去重、20 字截断、筛选、计数只算已发布、
批量查询、标签不存在 404。
"""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_PASSWORD, TEST_USERNAME

from database import init_db  # noqa: E402
from main import app  # noqa: E402
from models.tag import DEFAULT_TAG, normalize_tag_name, tag_slug  # noqa: E402


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        c.post(
            "/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
        )
        yield c


def create(client, title, tags=None, status="published"):
    body = {"title": title, "content_markdown": "x", "status": status}
    if tags is not None:
        body["tags"] = tags
    r = client.post("/api/admin/posts", json=body)
    assert r.status_code == 201, r.text
    return r.json()


# ── slug / 名称归一化 ─────────────────────────
def test_tag_slug_keeps_chinese():
    assert tag_slug("操作系统") == "操作系统"


def test_tag_slug_lowercases_and_hyphenates():
    assert tag_slug("Data Structure") == "data-structure"


def test_tag_slug_strips_symbols():
    assert tag_slug("C#") == "c"


def test_normalize_truncates_to_20_chars():
    long = "a" * 30
    assert len(normalize_tag_name(long)) == 20


# ── 默认标签 ──────────────────────────────────
def test_post_without_tags_gets_default(client):
    post = create(client, "No Tags Post")
    slugs = [t["slug"] for t in post["tags"]]
    assert slugs == [tag_slug(DEFAULT_TAG)], post["tags"]


def test_empty_tag_array_falls_back_to_default(client):
    post = create(client, "Empty Tags Post", tags=[])
    assert [t["slug"] for t in post["tags"]] == [tag_slug(DEFAULT_TAG)]


# ── 去重与大小写 ──────────────────────────────
def test_duplicate_tags_are_deduplicated(client):
    post = create(client, "Dup Tags Post", tags=["Java", "java", "JAVA"])
    names = [t["name"] for t in post["tags"]]
    assert len(names) == 1, f"应去重成一个标签，实际 {names}"


def test_tag_name_case_variants_share_one_slug(client):
    a = create(client, "Case A", tags=["Python"])
    b = create(client, "Case B", tags=["python"])
    assert a["tags"][0]["slug"] == b["tags"][0]["slug"]


# ── 统计 ─────────────────────────────────────
def test_tag_counts_only_include_published(client):
    create(client, "Counted Published", tags=["counted"], status="published")
    create(client, "Not Counted Draft", tags=["counted"], status="draft")

    data = client.get("/api/tags").json()
    entry = next((t for t in data["items"] if t["slug"] == "counted"), None)
    assert entry is not None
    assert entry["count"] == 1, f"草稿不应计入，实际 {entry['count']}"


def test_tags_sorted_by_count_desc(client):
    for i in range(3):
        create(client, f"Popular {i}", tags=["popular"])
    create(client, "Rare", tags=["rare"])

    items = client.get("/api/tags").json()["items"]
    counts = [t["count"] for t in items]
    assert counts == sorted(counts, reverse=True), items


def test_total_counts_published_only(client):
    before = client.get("/api/tags").json()["total"]
    create(client, "Total Draft", tags=["total-test"], status="draft")
    after = client.get("/api/tags").json()["total"]
    assert before == after, "草稿不应改变 total"


# ── 筛选 ─────────────────────────────────────
def test_filter_posts_by_tag(client):
    a = create(client, "Filter A", tags=["filtertag"])
    b = create(client, "Filter B", tags=["othertag"])

    r = client.get("/api/posts?tag=filtertag&limit=50")
    assert r.status_code == 200
    slugs = [p["slug"] for p in r.json()["items"]]
    assert a["slug"] in slugs
    assert b["slug"] not in slugs


def test_tag_posts_endpoint(client):
    post = create(client, "Tag Endpoint Post", tags=["endpoint-tag"])
    r = client.get("/api/tags/endpoint-tag/posts")
    assert r.status_code == 200
    slugs = [p["slug"] for p in r.json()["items"]]
    assert post["slug"] in slugs


def test_unknown_tag_returns_404(client):
    assert client.get("/api/tags/no-such-tag/posts").status_code == 404


# ── 标签列表不带草稿 ───────────────────────────
def test_draft_only_tag_not_listed(client):
    create(client, "Draft Only", tags=["draftonly"], status="draft")
    items = client.get("/api/tags").json()["items"]
    assert not any(t["slug"] == "draftonly" for t in items), "只有草稿的标签不该出现"


# ── 更新 ─────────────────────────────────────
def test_update_replaces_tags(client):
    post = create(client, "Update Tags", tags=["before-tag"])
    r = client.put(
        f"/api/admin/posts/{post['id']}", json={"tags": ["after-tag"]}
    )
    assert r.status_code == 200
    slugs = [t["slug"] for t in r.json()["tags"]]
    assert slugs == ["after-tag"]


def test_update_without_tags_keeps_existing(client):
    post = create(client, "Keep Tags", tags=["keep-tag"])
    r = client.put(f"/api/admin/posts/{post['id']}", json={"title": "Keep Tags Renamed"})
    assert r.status_code == 200
    slugs = [t["slug"] for t in r.json()["tags"]]
    assert slugs == ["keep-tag"], "不传 tags 不应改动标签"


def test_update_with_empty_tags_falls_back_to_default(client):
    post = create(client, "Clear Tags", tags=["clear-tag"])
    r = client.put(f"/api/admin/posts/{post['id']}", json={"tags": []})
    assert r.status_code == 200
    assert [t["slug"] for t in r.json()["tags"]] == [tag_slug(DEFAULT_TAG)]


# ── 批量查询不 N+1 ────────────────────────────
def test_list_posts_include_tags(client):
    create(client, "Batch Tags A", tags=["batch1"])
    create(client, "Batch Tags B", tags=["batch2"])

    items = client.get("/api/posts?limit=50").json()["items"]
    assert items, "应有文章"
    for item in items:
        assert "tags" in item
        assert isinstance(item["tags"], list)


def test_detail_includes_tags(client):
    post = create(client, "Detail Tags", tags=["detail-tag"])
    data = client.get(f"/api/posts/{post['slug']}").json()
    assert [t["slug"] for t in data["tags"]] == ["detail-tag"]