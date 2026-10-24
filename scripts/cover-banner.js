/* 「本周精选」横图生成器 —— 与全站 Editorial 风格统一
   浅色纸感底（薰衣草→蜜桃渐变）+ 细点阵 + 紫/橙主色的抽象意象图形；
   图形依据文章主题关键词选择（神经网络/轨道/双螺旋/机械/能量波/六边形晶格/资本柱状/周期波/弧线），
   图上不放文字（文章标题就在正下方），同文章确定性生成、换文章自动换图。
   用法：window.deepBanner(post, width, height) → SVG 字符串 */
(function () {
  var PURPLE = "#6D28D9", PURPLE_MID = "#8B5CF6", ORANGE = "#F97316", ORANGE_DEEP = "#EA580C";

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
  function f(n) { return (Math.round(n * 10) / 10).toString(); }

  /* ---------- 主题意象 ---------- */
  var MOTIFS = {
    // 神经网络（AI / 模型 / 智能体）
    neural: function (s, rnd, W, H) {
      var cols = W < 520 ? 3 : 4, rows = 3, nodes = [];
      for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) {
        nodes.push({
          x: W * (0.16 + 0.68 * c / (cols - 1)) + (rnd() - 0.5) * W * 0.05,
          y: H * (0.24 + 0.52 * r / (rows - 1)) + (rnd() - 0.5) * H * 0.1,
          r: 3.5 + rnd() * 4.5, hot: rnd() > 0.6
        });
      }
      for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < Math.min(W, H) * 0.45 && rnd() > 0.34) {
          s.push('<line x1="' + f(nodes[i].x) + '" y1="' + f(nodes[i].y) + '" x2="' + f(nodes[j].x) + '" y2="' + f(nodes[j].y) +
            '" stroke="' + PURPLE + '" stroke-opacity="' + (0.16 + rnd() * 0.2).toFixed(2) + '" stroke-width="1.2"/>');
        }
      }
      nodes.forEach(function (n) {
        s.push(n.hot
          ? '<circle cx="' + f(n.x) + '" cy="' + f(n.y) + '" r="' + f(n.r) + '" fill="' + ORANGE + '" fill-opacity=".9"/>' +
            '<circle cx="' + f(n.x) + '" cy="' + f(n.y) + '" r="' + f(n.r + 4) + '" fill="none" stroke="' + ORANGE + '" stroke-opacity=".35" stroke-width="1.2"/>'
          : '<circle cx="' + f(n.x) + '" cy="' + f(n.y) + '" r="' + f(n.r) + '" fill="' + PURPLE + '" fill-opacity=".75"/>');
      });
    },
    // 行星轨道（航天 / 太空 / 卫星）
    orbit: function (s, rnd, W, H) {
      var cx = W * 0.66, cy = H * 0.52, R = Math.min(W, H) * 0.2;
      for (var i = 0; i < 22; i++) {
        s.push('<circle cx="' + f(rnd() * W) + '" cy="' + f(rnd() * H) + '" r="' + f(0.8 + rnd() * 1.6) +
          '" fill="' + PURPLE + '" fill-opacity="' + (0.12 + rnd() * 0.25).toFixed(2) + '"/>');
      }
      s.push('<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(R * 1.85) + '" ry="' + f(R * 0.52) +
        '" transform="rotate(-16 ' + f(cx) + ' ' + f(cy) + ')" fill="none" stroke="' + ORANGE + '" stroke-opacity=".75" stroke-width="2"/>');
      s.push('<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(R * 2.5) + '" ry="' + f(R * 0.72) +
        '" transform="rotate(14 ' + f(cx) + ' ' + f(cy) + ')" fill="none" stroke="' + PURPLE + '" stroke-opacity=".3" stroke-width="1.4"/>');
      s.push('<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R) + '" fill="' + PURPLE + '" fill-opacity=".9"/>' +
        '<circle cx="' + f(cx - R * 0.3) + '" cy="' + f(cy - R * 0.3) + '" r="' + f(R * 0.32) + '" fill="#FFFFFF" fill-opacity=".28"/>');
      var a = -0.5, sr = R * 1.85;
      s.push('<circle cx="' + f(cx + Math.cos(a) * sr) + '" cy="' + f(cy + Math.sin(a) * sr * 0.52) + '" r="4" fill="' + ORANGE_DEEP + '"/>');
    },
    // 双螺旋（生物 / 医疗 / 脑机 / 基因）
    helix: function (s, rnd, W, H) {
      var amp = Math.min(W, H) * 0.26, cx = W * 0.5, cy = H * 0.5, len = W * 0.62;
      var A = [], B = [];
      for (var t = 0; t <= 1.0001; t += 0.045) {
        var x = cx - len / 2 + len * t, y = cy + Math.sin(t * Math.PI * 3) * amp * (1 - 0.12 * t);
        A.push(f(x) + "," + f(y));
        B.push(f(x) + "," + f(2 * cy - y));
      }
      for (var k = 0; k < A.length; k += 3) {
        var p1 = A[k].split(","), p2 = B[k].split(",");
        s.push('<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] +
          '" stroke="' + PURPLE + '" stroke-opacity="' + (0.14 + (k % 6) * 0.03).toFixed(2) + '" stroke-width="1.3"/>');
      }
      s.push('<polyline points="' + A.join(" ") + '" fill="none" stroke="' + PURPLE + '" stroke-width="2.6" stroke-linecap="round"/>');
      s.push('<polyline points="' + B.join(" ") + '" fill="none" stroke="' + ORANGE + '" stroke-width="2.6" stroke-linecap="round"/>');
      s.push('<circle cx="' + A[A.length - 1].split(",")[0] + '" cy="' + A[A.length - 1].split(",")[1] + '" r="4.5" fill="' + PURPLE + '"/>');
      s.push('<circle cx="' + B[B.length - 1].split(",")[0] + '" cy="' + B[B.length - 1].split(",")[1] + '" r="4.5" fill="' + ORANGE + '"/>');
    },
    // 机械关节（机器人 / 具身 / 制造 / 硬科技）
    mech: function (s, rnd, W, H) {
      for (var ry = 0; ry < 3; ry++) for (var rx = 0; rx < 6; rx++) {
        s.push('<polygon points="' + hexPts(W * 0.14 + rx * W * 0.15, H * 0.3 + ry * H * 0.24, Math.min(W, H) * 0.075) +
          '" fill="none" stroke="' + PURPLE + '" stroke-opacity=".1" stroke-width="1"/>');
      }
      var j = [[W * 0.16, H * 0.78], [W * 0.38, H * 0.52], [W * 0.6, H * 0.66], [W * 0.78, H * 0.3]];
      s.push('<polyline points="' + j.map(function (p) { return f(p[0]) + "," + f(p[1]); }).join(" ") +
        '" fill="none" stroke="' + PURPLE + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>');
      j.forEach(function (p, i) {
        s.push('<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + (i === j.length - 1 ? 3 : 6) +
          '" fill="' + (i % 2 ? ORANGE : PURPLE) + '"/>');
      });
      s.push('<polygon points="' + hexPts(W * 0.78, H * 0.3, Math.min(W, H) * 0.07) +
        '" fill="none" stroke="' + ORANGE_DEEP + '" stroke-width="2"/>');
    },
    // 能量波（新能源 / 储能 / 电池 / 电力）
    energy: function (s, rnd, W, H) {
      for (var k = 0; k < 4; k++) {
        var pts = [], amp = H * (0.1 - k * 0.015), base = H * (0.32 + k * 0.14);
        for (var t = 0; t <= 1.0001; t += 0.05) {
          pts.push(f(W * 0.1 + W * 0.8 * t) + "," + f(base + Math.sin(t * Math.PI * 2.4 + k * 0.7) * amp));
        }
        s.push('<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + (k % 2 ? ORANGE : PURPLE) +
          '" stroke-opacity="' + (0.55 - k * 0.09).toFixed(2) + '" stroke-width="2.2" stroke-linecap="round"/>');
      }
      var nb = 5;
      for (var b = 0; b < nb; b++) {
        var bh = H * (0.1 + 0.16 * b / (nb - 1));
        s.push('<rect x="' + f(W * 0.12 + b * W * 0.05) + '" y="' + f(H * 0.9 - bh) + '" width="' + f(W * 0.026) +
          '" height="' + f(bh) + '" rx="3" fill="' + (b % 2 ? PURPLE_MID : ORANGE) + '" fill-opacity=".8"/>');
      }
    },
    // 六边形晶格（量子 / 芯片 / 半导体 / 硬科技）
    hexlattice: function (s, rnd, W, H) {
      var r = Math.min(W, H) * 0.085, filled = [];
      for (var row = 0; row < 4; row++) for (var col = 0; col < 7; col++) {
        var cx = W * 0.12 + col * r * 1.74, cy = H * 0.24 + row * r * 1.5 + (col % 2 ? r * 0.75 : 0);
        var hot = rnd() > 0.82;
        if (hot) filled.push([cx, cy]);
        s.push('<polygon points="' + hexPts(cx, cy, r * 0.92) + '" fill="' + (hot ? (rnd() > 0.5 ? ORANGE : PURPLE) : "none") +
          '" fill-opacity="' + (hot ? ".8" : "0") + '" stroke="' + PURPLE + '" stroke-opacity="' + (hot ? ".5" : ".16") + '" stroke-width="1.1"/>');
      }
      for (var i = 0; i < filled.length - 1; i++) {
        s.push('<line x1="' + f(filled[i][0]) + '" y1="' + f(filled[i][1]) + '" x2="' + f(filled[i + 1][0]) + '" y2="' + f(filled[i + 1][1]) +
          '" stroke="' + ORANGE_DEEP + '" stroke-opacity=".4" stroke-width="1.2"/>');
      }
    },
    // 资本柱状 + 趋势线（投资 / VC / 融资 / 榜单 / 排名）
    finance: function (s, rnd, W, H) {
      var n = W < 520 ? 5 : 7, bw = W * 0.062, gap = (W * 0.64 - n * bw) / (n - 1), x0 = W * 0.17, base = H * 0.8;
      var tops = [];
      for (var i = 0; i < n; i++) {
        var bh = H * (0.14 + 0.52 * Math.pow(i / (n - 1), 1.25)) * (0.88 + rnd() * 0.24);
        var x = x0 + i * (bw + gap);
        tops.push([x + bw / 2, base - bh]);
        s.push('<rect x="' + f(x) + '" y="' + f(base - bh) + '" width="' + f(bw) + '" height="' + f(bh) + '" rx="4" fill="' +
          (i % 3 === 2 ? ORANGE : (i % 3 === 1 ? PURPLE_MID : PURPLE)) + '" fill-opacity="' + (0.72 + i * 0.03).toFixed(2) + '"/>');
      }
      s.push('<polyline points="' + tops.map(function (p) { return f(p[0]) + "," + f(p[1] - H * 0.1); }).join(" ") +
        '" fill="none" stroke="' + ORANGE_DEEP + '" stroke-width="2" stroke-dasharray="1 5" stroke-linecap="round"/>');
      tops.forEach(function (p, i) {
        s.push('<circle cx="' + f(p[0]) + '" cy="' + f(p[1] - H * 0.1) + '" r="' + (i === tops.length - 1 ? 5 : 3) +
          '" fill="' + (i === tops.length - 1 ? ORANGE_DEEP : ORANGE) + '"/>');
      });
      s.push('<line x1="' + f(W * 0.12) + '" y1="' + f(base) + '" x2="' + f(W * 0.88) + '" y2="' + f(base) +
        '" stroke="' + PURPLE + '" stroke-opacity=".25" stroke-width="1.2"/>');
    },
    // 周期波（衰退 / 泡沫 / 复苏 / 寒冬）
    wave: function (s, rnd, W, H) {
      var mk = function (phase, color, op, fill) {
        var pts = [];
        for (var t = 0; t <= 1.0001; t += 0.04) {
          pts.push(f(W * 0.08 + W * 0.84 * t) + "," + f(H * 0.5 + Math.sin(t * Math.PI * 2 + phase) * H * 0.26 * (1 - 0.25 * t)));
        }
        return '<polyline points="' + pts.join(" ") + '" fill="' + (fill ? color : "none") + '" fill-opacity="' + (fill ? ".12" : "0") +
          '" stroke="' + color + '" stroke-opacity="' + op + '" stroke-width="' + (fill ? "0" : "2.4") + '" stroke-linecap="round"/>';
      };
      s.push(mk(0.4, PURPLE, 0.5, true));
      s.push(mk(2.2, ORANGE, 0.85, false));
      for (var i = 0; i < 5; i++) {
        s.push('<circle cx="' + f(W * (0.15 + 0.18 * i)) + '" cy="' + f(H * 0.5 + Math.sin((0.15 + 0.18 * i) * Math.PI * 2 + 2.2) * H * 0.26) +
          '" r="3" fill="' + ORANGE_DEEP + '" fill-opacity=".7"/>');
      }
    },
    // 层叠弧线（默认）
    arcs: function (s, rnd, W, H) {
      var cx = W * 0.24, cy = H * 1.06;
      for (var i = 0; i < 5; i++) {
        var r = Math.min(W, H) * (0.5 + i * 0.22);
        s.push('<path d="M ' + f(cx - r) + ' ' + f(cy) + ' A ' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(cx + r) + ' ' + f(cy) +
          '" fill="none" stroke="' + (i % 2 ? ORANGE : PURPLE) + '" stroke-opacity="' + (0.4 - i * 0.06).toFixed(2) + '" stroke-width="' + (i === 1 ? 2.4 : 1.4) + '"/>');
      }
      for (var k = 0; k < 16; k++) {
        s.push('<circle cx="' + f(W * (0.5 + rnd() * 0.46)) + '" cy="' + f(H * (0.12 + rnd() * 0.76)) + '" r="' + f(1.6 + rnd() * 3.2) +
          '" fill="' + (rnd() > 0.5 ? ORANGE : PURPLE_MID) + '" fill-opacity="' + (0.2 + rnd() * 0.4).toFixed(2) + '"/>');
      }
      s.push('<circle cx="' + f(W * 0.8) + '" cy="' + f(H * 0.3) + '" r="' + f(Math.min(W, H) * 0.07) + '" fill="none" stroke="' + PURPLE + '" stroke-opacity=".3" stroke-width="1.4"/>');
      s.push('<circle cx="' + f(W * 0.8) + '" cy="' + f(H * 0.3) + '" r="' + f(Math.min(W, H) * 0.028) + '" fill="' + ORANGE + '" fill-opacity=".85"/>');
    }
  };
  var KEYWORDS = [
    ["neural", ["AI", "人工智能", "大模型", "模型", "智能体", "OpenAI", "Agent", "机器学习", "LLM", "算力"]],
    ["orbit", ["航天", "太空", "卫星", "火箭", "轨道", "火星", "月球", "空间站", "星链"]],
    ["helix", ["生物", "医疗", "基因", "细胞", "脑机", "神经", "制药", "健康", "合成生物"]],
    ["hexlattice", ["量子", "芯片", "半导体", "硬科技", "晶圆", "光刻"]],
    ["mech", ["机器人", "具身", "机械", "自动化", "制造", "工厂"]],
    ["energy", ["新能源", "储能", "电池", "充电", "能源", "光伏", "电网"]],
    ["finance", ["投资", "VC", "资本", "融资", "榜单", "Midas", "排名", "基金", "LP", "下注", "独角兽", "估值", "轮", "创业"]],
    ["wave", ["周期", "衰退", "泡沫", "危机", "寒冬", "复苏", "清算", "裁员"]]
  ];
  function pickMotif(post) {
    var text = ((post && post.title) || "") + " " + ((post && post.desc) || "");
    for (var i = 0; i < KEYWORDS.length; i++) {
      for (var j = 0; j < KEYWORDS[i][1].length; j++) {
        if (text.indexOf(KEYWORDS[i][1][j]) >= 0) return KEYWORDS[i][0];
      }
    }
    return "arcs";
  }

  function deepBanner(post, W, H) {
    W = Math.max(280, Math.round(W || 660));
    H = Math.max(150, Math.round(H || 200));
    var motif = pickMotif(post);
    var seed = hashStr(((post && post.title) || "") + "|" + motif);
    var rnd = mulberry(seed);
    var uid = "wb" + seed.toString(36);
    var s = [];

    s.push('<svg viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="文章主题意象图">');
    s.push("<defs>" +
      '<linearGradient id="' + uid + 'bg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#F5F0FC"/><stop offset="52%" stop-color="#FBF7F2"/><stop offset="100%" stop-color="#FFF3E8"/>' +
      "</linearGradient>" +
      '<radialGradient id="' + uid + 'gp" cx="18%" cy="24%" r="58%">' +
      '<stop offset="0%" stop-color="' + PURPLE_MID + '" stop-opacity=".16"/><stop offset="100%" stop-color="' + PURPLE_MID + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + uid + 'go" cx="84%" cy="82%" r="55%">' +
      '<stop offset="0%" stop-color="' + ORANGE + '" stop-opacity=".16"/><stop offset="100%" stop-color="' + ORANGE + '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + uid + 'sh" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#FFFFFF" stop-opacity=".55"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>' +
      '<pattern id="' + uid + 'dots" width="22" height="22" patternUnits="userSpaceOnUse">' +
      '<circle cx="2" cy="2" r="1.1" fill="' + PURPLE + '" fill-opacity=".1"/></pattern>' +
      "</defs>");

    s.push('<rect width="' + W + '" height="' + H + '" fill="url(#' + uid + 'bg)"/>');
    s.push('<rect width="' + W + '" height="' + H + '" fill="url(#' + uid + 'gp)"/>');
    s.push('<rect width="' + W + '" height="' + H + '" fill="url(#' + uid + 'go)"/>');
    s.push('<rect width="' + W + '" height="' + H + '" fill="url(#' + uid + 'dots)"/>');

    MOTIFS[motif](s, rnd, W, H);

    // 斜向柔光带 + 细内框，统一全站质感
    s.push('<path d="M 0 ' + f(H * 0.72) + ' L ' + f(W * 0.42) + ' 0 L ' + f(W * 0.62) + ' 0 L ' + f(W * 0.2) + ' ' + f(H * 0.72) +
      ' L ' + f(W * 0.05) + ' ' + f(H) + ' L 0 ' + f(H) + ' Z" fill="url(#' + uid + 'sh)"/>');
    s.push('<rect x="9" y="9" width="' + (W - 18) + '" height="' + (H - 18) + '" rx="10" fill="none" stroke="' + PURPLE +
      '" stroke-opacity=".18" stroke-width="1"/>');
    s.push("</svg>");
    return s.join("");
  }

  window.deepBanner = deepBanner;
  window.deepBannerMotif = pickMotif;
})();
