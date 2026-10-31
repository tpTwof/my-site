"""重构后的 API 回归测试。"""
import json
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8000"


def req(method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        r.add_header("Content-Type", "application/json; charset=utf-8")
    try:
        resp = urllib.request.urlopen(r)
        if resp.status == 204:
            return 204, None
        return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


fails = []


def check(label, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + label + ("" if cond else f"  {extra}"))
    if not cond:
        fails.append(label)


# 1. 创建
code, cn = req("POST", "/api/admin/posts", {
    "title": "Chinese Title Post",
    "content_markdown": "# Heading\n\nBody text with **bold** and a [link](http://x).\n\n```js\ncode\n```",
    "status": "published",
})
check("create 201", code == 201, code)
check("slug ascii", cn["slug"].isascii(), cn.get("slug"))
check("detail has content", "content_markdown" in cn)
check("no summary in detail", "summary" not in cn)

# 2. 中文标题
code, zh = req("POST", "/api/admin/posts", {
    "title": "中文标题测试", "content_markdown": "正文", "status": "published",
})
check("cn title create 201", code == 201, code)
check("cn slug fallback uuid8", len(zh["slug"]) == 8 and zh["slug"].isascii(), zh.get("slug"))

# 3. 草稿
code, draft = req("POST", "/api/admin/posts", {"title": "Draft One", "status": "draft"})
check("draft create", code == 201 and draft["status"] == "draft")

# 4. 非法 status
code, err = req("POST", "/api/admin/posts", {"title": "Bad", "status": "archived"})
check("invalid status rejected 422", code == 422, code)

# 5. 公开列表：只有 published，且无正文
code, pub = req("GET", "/api/posts?limit=10")
check("public list 200", code == 200)
check("public only published", all(i["status"] == "published" for i in pub["items"]))
check("public list items 2", len(pub["items"]) == 2, len(pub["items"]))
first = pub["items"][0]
check("list item has summary", "summary" in first, list(first))
check("list item has NO content_markdown", "content_markdown" not in first, list(first))
check("summary stripped of markdown", "```" not in first["summary"], first["summary"])

# 6. 公开详情
code, detail = req("GET", f"/api/posts/{cn['slug']}")
check("public detail 200", code == 200)
check("detail has content_markdown", "content_markdown" in detail)
# 草稿不可通过公开接口访问
code, _ = req("GET", f"/api/posts/{draft['slug']}")
check("draft not public 404", code == 404, code)

# 7. 管理列表：含草稿 + status 过滤
code, adm = req("GET", "/api/admin/posts?limit=10")
check("admin list 3", len(adm["items"]) == 3, len(adm["items"]))
code, only_draft = req("GET", "/api/admin/posts?status=draft")
check("admin filter draft", [i["id"] for i in only_draft["items"]] == [draft["id"]])
code, bad = req("GET", "/api/admin/posts?status=nonsense")
check("admin bad status 422", code == 422, code)

# 8. 游标分页
code, page1 = req("GET", "/api/posts?limit=1")
check("page1 one item", len(page1["items"]) == 1)
check("page1 has cursor", page1["next_cursor"] is not None)
code, page2 = req("GET", f"/api/posts?limit=1&cursor={urllib.parse.quote(page1['next_cursor'], safe='')}")
check("page2 different item", page2["items"][0]["id"] != page1["items"][0]["id"])
check("page2 no more", page2["next_cursor"] is None, page2["next_cursor"])

# 8b. 非法游标
code, _ = req("GET", "/api/posts?cursor=not-a-valid-cursor!!!")
check("bad cursor 400", code == 400, code)

# 9. 更新
code, upd = req("PUT", f"/api/admin/posts/{draft['id']}", {"status": "published"})
check("publish draft", code == 200 and upd["status"] == "published")
code, pub2 = req("GET", "/api/posts")
check("public now 3", len(pub2["items"]) == 3, len(pub2["items"]))

# 10. slug 冲突
code, _ = req("POST", "/api/admin/posts", {"title": "x", "slug": cn["slug"]})
check("dup slug 409", code == 409, code)

# 11. 删除
code, _ = req("DELETE", f"/api/admin/posts/{draft['id']}")
check("delete 204", code == 204, code)
code, _ = req("DELETE", f"/api/admin/posts/{draft['id']}")
check("delete again 404", code == 404, code)

# 12. /api/home
code, home = req("GET", "/api/home")
check("api/home", code == 200 and home["site_name"] == "tpTwo")

print()
print(f"{len(fails)} failure(s)" + (": " + ", ".join(fails) if fails else " — all good"))