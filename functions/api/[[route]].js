// CF Pages Function：/api/view（浏览计数）、/api/views（后台读取）、/api/links（贴链接入队）、
//                   /api/subscribe（订阅收集）、/api/sync（手动触发即时同步）
// 需要的绑定（CF Dashboard 配置）：
//   KV:  VIEWS_KV
//   变量: ADMIN_PASSWORD, GH_TOKEN

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

export async function onRequest(context) {
  try {
    return await handle(context);
  } catch (e) {
    // 兜底：任何未捕获异常都以 JSON 500 返回，避免前端只看到 "TypeError: Load failed"
    return new Response(JSON.stringify({ error: "服务端异常：" + String((e && e.message) || e).slice(0, 160) }),
      { status: 500, headers: JSON_HEADERS });
  }
}

async function handle(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 浏览计数（公开，静默失败）
  if (path === "/api/view" && request.method === "POST") {
    const p = url.searchParams.get("path") || "/";
    if (!env.VIEWS_KV) return new Response(JSON.stringify({ ok: true, views: -1 }), { headers: JSON_HEADERS });
    const key = "v:" + p;
    const n = parseInt((await env.VIEWS_KV.get(key)) || "0", 10) + 1;
    await env.VIEWS_KV.put(key, String(n));
    return new Response(JSON.stringify({ ok: true, views: n }), { headers: JSON_HEADERS });
  }

  const authed = request.headers.get("X-Admin-Key") && env.ADMIN_PASSWORD &&
                 request.headers.get("X-Admin-Key") === env.ADMIN_PASSWORD;

  // 后台读取浏览数
  if (path === "/api/views" && request.method === "GET") {
    if (!authed) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSON_HEADERS });
    if (!env.VIEWS_KV) return new Response(JSON.stringify({ error: "VIEWS_KV 未绑定" }), { status: 500, headers: JSON_HEADERS });
    const out = {};
    let cursor;
    do {
      const list = await env.VIEWS_KV.list({ prefix: "v:", cursor });
      for (const k of list.keys) out[k.name.slice(2)] = parseInt((await env.VIEWS_KV.get(k.name)) || "0", 10);
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);
    return new Response(JSON.stringify(out), { headers: JSON_HEADERS });
  }

  // 后台读取订阅者列表（_subscribers.md）
  if (path === "/api/subscribers" && request.method === "GET") {
    if (!authed) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSON_HEADERS });
    if (!env.GH_TOKEN) return new Response(JSON.stringify({ error: "GH_TOKEN 未配置" }), { status: 500, headers: JSON_HEADERS });
    const r = await fetch("https://api.github.com/repos/YanFeng-Ding/vc-site/contents/_subscribers.md", {
      headers: { "Authorization": "Bearer " + env.GH_TOKEN, "Accept": "application/vnd.github+json", "User-Agent": "vc-site-admin" }
    });
    if (r.status === 404) return new Response(JSON.stringify({ ok: true, list: "", count: 0 }), { headers: JSON_HEADERS });
    if (!r.ok) return new Response(JSON.stringify({ error: "读取失败 " + r.status }), { status: 500, headers: JSON_HEADERS });
    const j = await r.json();
    const text = atob(j.content.replace(/\n/g, ""));
    const rows = text.split("\n").filter(l => /^- /.test(l));
    return new Response(JSON.stringify({ ok: true, list: text, count: rows.length }), { headers: JSON_HEADERS });
  }

  // 贴链接入队（写入仓库 _queue.md，触发每日自动同步）
  if (path === "/api/links" && request.method === "POST") {
    if (!authed) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSON_HEADERS });
    if (!env.GH_TOKEN) return new Response(JSON.stringify({ error: "GH_TOKEN 未配置" }), { status: 500, headers: JSON_HEADERS });
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const links = (body.links || []).map(s => String(s).trim()).filter(s => /^https:\/\/mp\.weixin\.qq\.com\//.test(s));
    const section = body.section === "briefings" ? "前沿风向" : "深度";
    if (!links.length) return new Response(JSON.stringify({ error: "没有有效的微信文章链接" }), { status: 400, headers: JSON_HEADERS });
    const gh = { "Authorization": "Bearer " + env.GH_TOKEN, "Accept": "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "vc-site-admin" };
    const fileApi = "https://api.github.com/repos/YanFeng-Ding/vc-site/contents/_queue.md";
    let existing = "";
    let sha;
    const r = await fetch(fileApi, { headers: gh });
    if (r.status === 200) {
      const j = await r.json();
      sha = j.sha;
      existing = atob(j.content.replace(/\n/g, ""));
    } else if (r.status !== 404) {
      return new Response(JSON.stringify({ error: "读取队列失败 " + r.status }), { status: 500, headers: JSON_HEADERS });
    }
    // 去重：队列里已有的链接直接跳过，避免重复入队
    const uniq = links.filter(u => !existing.includes(u));
    if (!uniq.length) {
      return new Response(JSON.stringify({ ok: true, queued: 0, dup: true }), { headers: JSON_HEADERS });
    }
    const today = new Date().toISOString().slice(0, 10);
    const added = uniq.map(u => `- ${today} [${section}] ${u}`).join("\n");
    const content = (existing ? existing.trimEnd() + "\n" : "# 待同步队列\n") + added + "\n";
    const pr = await fetch(fileApi, {
      method: "PUT", headers: gh,
      body: JSON.stringify({ message: "queue: 新增待同步链接 x" + uniq.length, content: btoa(unescape(encodeURIComponent(content))), sha })
    });
    if (!pr.ok) {
      const t = await pr.text().catch(() => "");
      return new Response(JSON.stringify({ error: "GitHub 写入失败 " + pr.status + (t ? "：" + t.slice(0, 160) : "") }), { status: 500, headers: JSON_HEADERS });
    }
    // 入队成功后主动触发即时同步：不依赖 push 事件（PAT 写入同样能跑），确保 1-3 分钟内上线
    let syncStatus = 0;
    try {
      const dr = await fetch("https://api.github.com/repos/YanFeng-Ding/vc-site/actions/workflows/sync-queue.yml/dispatches",
        { method: "POST", headers: gh, body: JSON.stringify({ ref: "main" }) });
      syncStatus = dr.status;
    } catch (_) { /* 触发失败不影响入队结果，巡检也会补跑 */ }
    return new Response(JSON.stringify({ ok: true, queued: uniq.length, sync: syncStatus }), { headers: JSON_HEADERS });
  }

  // 订阅收集（公开）：邮箱追加写入仓库 _subscribers.md，无第三方依赖，国内外可达
  if (path === "/api/subscribe" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "邮箱格式不正确" }), { status: 400, headers: JSON_HEADERS });
    }
    if (!env.GH_TOKEN) return new Response(JSON.stringify({ error: "订阅服务未配置，请发邮件至 zondas@live.com" }), { status: 500, headers: JSON_HEADERS });
    const gh = { "Authorization": "Bearer " + env.GH_TOKEN, "Accept": "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "vc-site-subscribe" };
    const fileApi = "https://api.github.com/repos/YanFeng-Ding/vc-site/contents/_subscribers.md";
    let existing = "# 订阅者列表\n";
    let sha;
    const r = await fetch(fileApi, { headers: gh });
    if (r.status === 200) {
      const j = await r.json();
      sha = j.sha;
      existing = atob(j.content.replace(/\n/g, ""));
    } else if (r.status === 403 || r.status === 401) {
      return new Response(JSON.stringify({ error: "订阅服务异常，请发邮件至 zondas@live.com" }), { status: 500, headers: JSON_HEADERS });
    }
    if (existing.toLowerCase().includes(email)) {
      return new Response(JSON.stringify({ ok: true, dup: true }), { headers: JSON_HEADERS });
    }
    const today = new Date().toISOString().slice(0, 10);
    const content = existing.trimEnd() + "\n- " + today + " " + email + "\n";
    const pr = await fetch(fileApi, {
      method: "PUT", headers: gh,
      body: JSON.stringify({ message: "subscribe: +1 订阅者", content: btoa(unescape(encodeURIComponent(content))), sha })
    });
    if (!pr.ok) return new Response(JSON.stringify({ error: "订阅服务异常，请稍后重试" }), { status: 500, headers: JSON_HEADERS });
    return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
  }

  // 手动触发即时同步（后台按钮）：dispatch sync-queue workflow
  if (path === "/api/sync" && request.method === "POST") {
    if (!authed) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSON_HEADERS });
    if (!env.GH_TOKEN) return new Response(JSON.stringify({ error: "GH_TOKEN 未配置" }), { status: 500, headers: JSON_HEADERS });
    const gh = { "Authorization": "Bearer " + env.GH_TOKEN, "Accept": "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "vc-site-sync" };
    const r = await fetch("https://api.github.com/repos/YanFeng-Ding/vc-site/actions/workflows/sync-queue.yml/dispatches", {
      method: "POST", headers: gh, body: JSON.stringify({ ref: "main" })
    });
    if (r.status === 204) return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
    const t = await r.text().catch(() => "");
    return new Response(JSON.stringify({ error: "触发失败 " + r.status + (t ? "：" + t.slice(0, 200) : "") }), { status: 500, headers: JSON_HEADERS });
  }

  return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: JSON_HEADERS });
}
