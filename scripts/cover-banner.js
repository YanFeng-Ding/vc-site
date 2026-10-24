/* 深度文章横图生成器（科技创投封面风格）
   纯黑底 + 荧光黄绿电路/六边形线框纹理 + 四角绿光晕 + 左上描边徽标
   + 超大粗体多行标题（末行荧光黄绿高亮）+ 绿色副标题 + 底部灰色信息行
   依据文章标题/日期/时长确定性生成，无外部依赖、随文章自动更新。
   用法：window.deepBanner(post, width, height) → SVG 字符串 */
(function () {
  var GREEN = "#CCFF00";
  var SERIF = "Source Serif Pro, Songti SC, Noto Serif SC, STSong, serif";
  var SANS = "Inter, PingFang SC, Noto Sans SC, Microsoft YaHei, sans-serif";

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hexPts(cx, cy, r) {
    var p = [];
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 180 * (60 * i - 30);
      p.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1));
    }
    return p.join(" ");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function isCJK(ch) {
    var c = ch.codePointAt(0);
    return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3000 && c <= 0x303f) || (c >= 0xff00 && c <= 0xffef);
  }
  function tw(s, fs) { /* 近似字宽：全角 1em，大写 .66em，小写/数字 .55em */
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (isCJK(ch)) w += fs;
      else if (ch >= "A" && ch <= "Z") w += fs * 0.66;
      else if ((ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9")) w += fs * 0.55;
      else if (ch === " ") w += fs * 0.3;
      else w += fs * 0.5;
    }
    return w;
  }
  function tokenize(s) { /* CJK 单字成 token，西文按词 */
    var toks = [], buf = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (isCJK(ch)) { if (buf) { toks.push(buf); buf = ""; } toks.push(ch); }
      else if (ch === " ") { if (buf) { toks.push(buf); buf = ""; } toks.push(" "); }
      else buf += ch;
    }
    if (buf) toks.push(buf);
    return toks;
  }
  function wrapTitle(title, fs, maxW, maxLines, minFs) {
    while (true) {
      var toks = tokenize(title), lines = [], cur = "";
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i];
        if (t === " " && !cur) continue;
        if (tw(cur + t, fs) <= maxW || !cur) cur += t;
        else { lines.push(cur.trim()); cur = (t === " ") ? "" : t; }
      }
      if (cur.trim()) lines.push(cur.trim());
      if (lines.length <= maxLines) return { lines: lines, fs: fs };
      if (fs <= minFs) { /* 超长标题：截断到 maxLines 行 */
        var keep = lines.slice(0, maxLines - 1);
        var tail = lines.slice(maxLines - 1).join("");
        while (tail && tw(tail + "…", fs) > maxW) tail = tail.slice(0, -1);
        keep.push(tail + "…");
        return { lines: keep, fs: fs };
      }
      fs -= 2;
    }
  }

  function deepBanner(post, W, H) {
    W = Math.max(280, Math.round(W || 660));
    H = Math.max(150, Math.round(H || 200));
    var title = (post && post.title) || "VC投资人";
    var date = (post && post.date) || "";
    var mins = (post && post.mins) || "";
    var seed = hashStr(title + "|" + date);
    var rnd = mulberry(seed);
    var uid = "db" + seed.toString(36);
    var pad = Math.round(Math.min(34, Math.max(16, W * 0.045)));
    var wide = W > 560;
    var s = [];

    s.push('<svg viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(title) + '">');

    /* 四角绿色光晕 */
    var corners = [["0%", "0%"], ["100%", "0%"], ["0%", "100%"], ["100%", "100%"]];
    s.push("<defs>");
    for (var i = 0; i < 4; i++) {
      s.push('<radialGradient id="' + uid + "g" + i + '" cx="' + corners[i][0] + '" cy="' + corners[i][1] + '" r="60%">' +
        '<stop offset="0%" stop-color="' + GREEN + '" stop-opacity="' + (i % 2 ? 0.18 : 0.26) + '"/>' +
        '<stop offset="100%" stop-color="' + GREEN + '" stop-opacity="0"/></radialGradient>');
    }
    s.push("</defs>");
    s.push('<rect width="' + W + '" height="' + H + '" fill="#060606"/>');
    for (var i = 0; i < 4; i++) s.push('<rect width="' + W + '" height="' + H + '" fill="url(#' + uid + "g" + i + ')"/>');

    /* 电路走线 + 过孔 */
    var nTrace = Math.max(5, Math.round(W / 85));
    for (var i = 0; i < nTrace; i++) {
      var horiz = rnd() > 0.45;
      var x = pad + rnd() * (W - pad * 2), y = 18 + rnd() * (H - 36);
      var seg1 = 26 + rnd() * 66, seg2 = 16 + rnd() * 46;
      var dir = rnd() > 0.5 ? 1 : -1;
      var pts = horiz
        ? x.toFixed(0) + "," + y.toFixed(0) + " " + (x + dir * seg1).toFixed(0) + "," + y.toFixed(0) + " " + (x + dir * seg1).toFixed(0) + "," + (y + dir * seg2 * 0.6).toFixed(0)
        : x.toFixed(0) + "," + y.toFixed(0) + " " + x.toFixed(0) + "," + (y + dir * seg1).toFixed(0) + " " + (x + dir * seg2 * 0.6).toFixed(0) + "," + (y + dir * seg1).toFixed(0);
      var op = (0.09 + rnd() * 0.12).toFixed(2);
      s.push('<polyline points="' + pts + '" fill="none" stroke="' + GREEN + '" stroke-opacity="' + op + '" stroke-width="1.1"/>');
      var last = pts.split(" ").pop().split(",");
      s.push('<circle cx="' + last[0] + '" cy="' + last[1] + '" r="1.9" fill="' + GREEN + '" fill-opacity="' + Math.min(0.4, op * 2.4).toFixed(2) + '"/>');
    }

    /* 六边形线框 */
    var nHex = 3 + Math.floor(rnd() * 3);
    for (var i = 0; i < nHex; i++) {
      var hx = pad + rnd() * (W - pad * 2), hy = 12 + rnd() * (H - 24), hr = 11 + rnd() * 24;
      s.push('<polygon points="' + hexPts(hx, hy, hr) + '" fill="none" stroke="' + GREEN + '" stroke-opacity="' + (0.07 + rnd() * 0.09).toFixed(2) + '" stroke-width="1"/>');
    }

    /* 右侧六边形芯片 */
    if (wide) {
      var cx = W - pad - 40, cy = H / 2, R = Math.min(36, H * 0.2);
      s.push('<polygon points="' + hexPts(cx, cy, R) + '" fill="none" stroke="' + GREEN + '" stroke-opacity=".5" stroke-width="1.4"/>');
      s.push('<polygon points="' + hexPts(cx, cy, R * 0.66) + '" fill="none" stroke="' + GREEN + '" stroke-opacity=".28" stroke-width="1"/>');
      s.push('<polygon points="' + hexPts(cx, cy, R * 0.34) + '" fill="' + GREEN + '" fill-opacity=".85"/>');
      for (var i = 0; i < 3; i++) {
        var a = rnd() * Math.PI * 2, rr = R * (1.22 + rnd() * 0.34);
        s.push('<circle cx="' + (cx + rr * Math.cos(a)).toFixed(1) + '" cy="' + (cy + rr * Math.sin(a)).toFixed(1) + '" r="1.7" fill="' + GREEN + '" fill-opacity=".45"/>');
      }
    }

    /* 左上描边徽标 */
    var badge = "VC投资人 · 深度";
    var bFs = 10.5, bH = 19, bW = Math.round(tw(badge, bFs)) + 20;
    s.push('<rect x="' + pad + '" y="15" width="' + bW + '" height="' + bH + '" rx="' + (bH / 2) + '" fill="none" stroke="' + GREEN + '" stroke-opacity=".85" stroke-width="1"/>');
    s.push('<text x="' + (pad + 10) + '" y="' + (15 + bH / 2 + 3.7) + '" font-family="' + SANS + '" font-size="' + bFs + '" font-weight="600" letter-spacing="1.2" fill="' + GREEN + '">' + esc(badge) + "</text>");

    /* 主标题：超大粗体，末行荧光黄绿高亮 */
    var maxW = W - pad * 2 - (wide ? 104 : 0);
    var maxLines = H >= 180 ? 2 : 1;
    var wrapped = wrapTitle(title, wide ? 30 : 24, maxW, maxLines, 19);
    var lh = wrapped.fs * 1.3;
    var ty = 15 + bH + 12 + wrapped.fs;
    for (var i = 0; i < wrapped.lines.length; i++) {
      var lastLine = i === wrapped.lines.length - 1;
      s.push('<text x="' + pad + '" y="' + (ty + i * lh).toFixed(1) + '" font-family="' + SERIF + '" font-size="' + wrapped.fs + '" font-weight="700" fill="' + (lastLine ? GREEN : "#FFFFFF") + '">' + esc(wrapped.lines[i]) + "</text>");
    }

    /* 副标题（荧光黄绿小字） */
    var sub = "全球创投观察 · " + date + (mins ? " · 约 " + mins + " 分钟" : "");
    var sy = Math.min(H - 32, ty + (wrapped.lines.length - 1) * lh + 25);
    s.push('<text x="' + pad + '" y="' + sy.toFixed(1) + '" font-family="' + SANS + '" font-size="12" fill="' + GREEN + '" fill-opacity=".92" letter-spacing=".6">' + esc(sub) + "</text>");

    /* 底部灰色信息行 */
    s.push('<text x="' + pad + '" y="' + (H - 12) + '" font-family="' + SANS + '" font-size="10" fill="#8A8A8A" letter-spacing=".5">VC投资人 · 每周跟踪全球顶尖 VC 的下注方向与赛道逻辑</text>');

    s.push("</svg>");
    return s.join("");
  }

  window.deepBanner = deepBanner;
})();
