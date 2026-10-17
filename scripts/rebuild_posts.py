#!/usr/bin/env python3
"""扫描全站文章页 → 重建 posts.json（首页「本周精选」数据源）。此逻辑同步进两份 sync 脚本。"""
import re, json, html, pathlib, datetime

SITE = pathlib.Path("/Users/royextra/WorkBuddy/2026-10-16-09-10-47/vc-site-prototype")
SKIP = {"index.html","briefings.html","themes.html","deep-dives.html","books.html","contact.html","admin.html","article.html"}

def first_text(h, limit=110):
    m = re.search(r'<div class="article-body">([\s\S]*?)</div>', h)
    if m:
        seg = re.sub(r'style="[^"]*"\s*>', "", m.group(1))
        txt = re.sub(r"<[^>]+>", "", seg)
        txt = re.sub(r"[\"'>]", "", txt)
        txt = re.sub(r"\s+", " ", txt).strip()
        if len(txt) >= 30:
            return txt[:limit]
    md = re.search(r'<meta name="description" content="([^"]*)"', h)
    return html.unescape(md.group(1))[:limit] if md else ""

def rebuild_posts():
    posts = []
    for f in sorted(SITE.glob("*.html")):
        n = f.name
        if n in SKIP or not (n.startswith("article-") or n.startswith("brief-")):
            continue
        h = f.read_text(encoding="utf-8")
        t = re.search(r"<title>(.*?) · VC投资人</title>", h, re.S)
        title = html.unescape(t.group(1)).strip() if t else n
        m = re.search(r'<div class="article-meta">([\s\S]*?)</div>', h)
        date, mins = "", ""
        if m:
            d = re.search(r"<span>(\d{4}-\d{2}-\d{2})</span>", m.group(1))
            date = d.group(1) if d else ""
            mm = re.search(r"约 (\d+) 分钟", m.group(1))
            mins = mm.group(1) if mm else ""
        if not date:
            continue
        posts.append({"file": n, "section": "深度" if n.startswith("article-") else "前沿风向",
                      "title": title, "date": date, "mins": mins, "desc": first_text(h)})
    posts.sort(key=lambda x: x["date"], reverse=True)
    (SITE / "posts.json").write_text(
        json.dumps({"updated": datetime.date.today().isoformat(), "posts": posts}, ensure_ascii=False, indent=0),
        encoding="utf-8")
    print("posts.json:", len(posts), "posts")
    return posts

if __name__ == "__main__":
    for p in rebuild_posts()[:6]:
        print(p["date"], p["section"], p["title"][:36], "->", p["file"])
