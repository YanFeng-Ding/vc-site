#!/usr/bin/env python3
"""GitHub Actions 版队列同步（自包含，无本地依赖）。
流程：读 _queue.md → 抓微信文章 → 生成 brief 页 → 插入 briefings.html 时间线 →
     重写 _queue.md（保留失败项）→ git 提交推送（触发 CF Pages 构建）。
"""
import os, re, sys, json, html, base64, pathlib, datetime, urllib.request

REPO_DIR = pathlib.Path(os.environ.get("GITHUB_WORKSPACE", "."))
SITE = REPO_DIR
QUEUE = SITE / "_queue.md"
UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1")
ALLOWED = {"p","strong","em","b","i","br","blockquote","ul","ol","li","h1","h2","h3","h4","img","a","table","thead","tbody","tr","td","th"}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "ignore")

def extract(page):
    m = re.search(r'id="activity-name"[^>]*>([\s\S]*?)</h1>', page)
    title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html.unescape(m.group(1)))).strip() if m else ""
    raw_time = ""
    m = re.search(r"createTime\s*=\s*'(\d{4}-\d{1,2}-\d{1,2})", page)
    if m:
        raw_time = m.group(1)
    else:
        m = re.search(r'var ct = "(\d{9,11})"', page) or re.search(r"\bct\s*=\s*['\"]?(1[6-9]\d{8})", page)
        if m:
            raw_time = datetime.datetime.fromtimestamp(int(m.group(1))).strftime("%Y-%m-%d")
    if not raw_time:
        m = re.search(r'id="publish_time"[^>]*>\s*([^<]+?)\s*<', page)
        raw_time = m.group(1) if m else ""
    content = ""
    m = re.search(r'<div[^>]*id="js_content"', page)
    if m:
        i, depth = m.end(), 1
        for t in re.compile(r'<(/?)div[^>]*>').finditer(page, i):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                content = page[i:t.start()]
                break
    return title, raw_time, content

def clean(raw):
    raw = re.sub(r"<(script|style)[^>]*>[\s\S]*?</\1>", "", raw)
    raw = re.sub(r'</?(section|span)[^>]*>', "", raw)
    def img_sub(m):
        src = re.search(r'data-src="([^"]+)"', m.group(0)) or re.search(r'\ssrc="([^"]+)"', m.group(0))
        return f'<img src="{src.group(1)}" referrerpolicy="no-referrer" loading="lazy" alt="">' if src else ""
    raw = re.sub(r'<img[^>]*>', img_sub, raw)
    def a_sub(m):
        href = re.search(r'href="([^"]+)"', m.group(0))
        text = re.sub(r"<[^>]+>", "", m.group(0)).strip()
        return f'<a href="{href.group(1)}" target="_blank" rel="noopener">{text}</a>' if href and href.group(1).startswith("http") else text
    raw = re.sub(r'<a\s[^>]*>[\s\S]*?</a>', a_sub, raw)
    def attr_sub(m):
        name = m.group(1).lower()
        if name in ALLOWED:
            return f"<{name}>" if name in ("br","img") else (f"</{name}>" if m.group(0).startswith("</") else f"<{name}>")
        return ""
    raw = re.sub(r'</?\s*([a-zA-Z0-9]+)[^>]*>', attr_sub, raw)
    raw = re.sub(r"<p>\s*</p>", "", raw)
    return raw.strip()

def parse_date(s):
    s = s.replace("年", "-").replace("月", "-").replace("日", "")
    m = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}" if m else datetime.date.today().isoformat()

def meta_extract(page, fallback_date):
    """短内容页：标题/正文在 og 元数据里。"""
    m_t = re.search(r'og:title" content="([^"]+)"', page)
    m_d = re.search(r'og:description" content="([^"]+)"', page)
    body = html.unescape(m_t.group(1)) if m_t else ""
    desc = html.unescape(m_d.group(1)) if m_d else ""
    if len(desc) > len(body):
        body = desc
    body = body.replace("\\n", "\n").replace("\\x0a", "\n")
    if len(body.strip()) < 30:
        return None
    m = re.search(r"window\.ct\s*=\s*'?(\d{9,11})", page) or re.search(r"\bct\s*=\s*['\"]?(1[6-9]\d{8})", page)
    date = datetime.datetime.fromtimestamp(int(m.group(1))).strftime("%Y-%m-%d") if m else fallback_date
    paras = [x.strip() for x in body.split("\n") if x.strip()]
    clean_html = "".join(f"<p>{html.escape(x)}</p>" for x in paras)
    return paras[0][:60], date, clean_html, body

TPL_PATH = SITE / "scripts" / "brief-template.html"

def render(title, date, mins, url, desc, content_html, section):
    p = TPL_PATH.read_text(encoding="utf-8")
    return (p.replace("__SECTION__", section)
             .replace("__TITLE__", html.escape(title))
             .replace("__DATE__", date).replace("__MINS__", str(mins))
             .replace("__URL__", url)
             .replace("__DESC__", html.escape(desc))
             .replace("__CONTENT__", content_html))

def free_fname(date_compact, idx):
    """避免同日同名覆盖：NN 递增直到文件名可用。"""
    n = idx
    while (SITE / f"brief-{date_compact}-{n:02d}.html").exists():
        n += 1
    return f"brief-{date_compact}-{n:02d}.html"

def main():
    entries = re.findall(r"- (\d{4}-\d{2}-\d{2}) \[(深度|前沿风向)\] (https://mp\.weixin\.qq\.com/\S+)",
                         QUEUE.read_text(encoding="utf-8"))
    if not entries:
        print("queue: empty"); return
    print(f"queue: {len(entries)} entries")
    ok_files, failed, timeline = [], [], []
    for idx, (qdate, section, url) in enumerate(entries, 1):
        try:
            page = fetch(url)
            title, raw_time, content_html = extract(page)
            if title and len(content_html) >= 500:
                date = parse_date(raw_time) if raw_time else qdate
                clean_html = clean(content_html)
                text = re.sub(r"<[^>]+>", "", clean_html)
            else:
                meta = meta_extract(page, qdate)
                if not meta:
                    failed.append((qdate, section, url)); print(f"[{idx}] FAIL {url}"); continue
                title, date, clean_html, text = meta
            mins = max(1, round(len(text) / 450))
            fname = free_fname(date.replace("-", ""), idx)
            page_html = render(title, date, mins, url, text[:80], clean_html, section)
            (SITE / fname).write_text(page_html, encoding="utf-8")
            desc = text[:90]
            timeline.append(f'''      <div class="tl-item">
        <div class="date">{date}</div>
        <h3><a href="{fname}" style="color:inherit">{html.escape(title)}</a></h3>
        <p>{html.escape(desc)}… <a href="{fname}" style="color:var(--accent)">→ 全文</a></p>
      </div>''')
            ok_files.append(fname)
            print(f"[{idx}] OK {date} {title[:36]} -> {fname}")
        except Exception as e:
            failed.append((qdate, section, url)); print(f"[{idx}] FAIL {e}")
    if timeline:
        s = (SITE / "briefings.html").read_text(encoding="utf-8")
        s = s.replace('<main class="timeline">\n', '<main class="timeline">\n' + "\n".join(timeline) + "\n", 1)
        (SITE / "briefings.html").write_text(s, encoding="utf-8")
        print(f"briefings.html: +{len(timeline)} items")
    # 队列只保留失败项
    failed_set = {u for (_, _, u) in failed}
    remain = "# 待同步队列\n" + "\n".join(f"- {q} [{sec}] {u}" for (q, sec, u) in entries if u in failed_set) + "\n"
    QUEUE.write_text(remain, encoding="utf-8")
    print(f"done: ok={len(ok_files)} failed={len(failed)}")

if __name__ == "__main__":
    main()
