/* 广告位渲染：读取 ads.json（后台可配置），填充 [data-ad-slot] 与书单页京东链接。
   点击统一走 /api/adclick（计数后 302 跳京东），CPM/CPC/CPS 计费方式在后台配置并展示。 */
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function adHref(slot, to) {
    // Cloudflare Pages（主域名）走 /api/adclick 计数后跳转；GitHub Pages 无 Functions，直接跳京东
    var track = !/\.github\.io$/i.test(location.hostname);
    return track ? "/api/adclick?slot=" + encodeURIComponent(slot) + "&to=" + encodeURIComponent(to) : to;
  }
  function loadAds() {
    return fetch("/api/ads", { headers: { "Accept": "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .catch(function () { return fetch("ads.json?v=" + Date.now()).then(function (r) { return r.json(); }); });
  }
  function safeLink(u) {
    return /^https?:\/\//i.test(String(u || "")) ? u : "";
  }
  function fillSlot(el, book, slotKey) {
    var link = safeLink(book.link);
    var model = esc(book.model || "CPS");
    var cover = esc(book.cover || "");
    el.classList.add("ad-filled");
    el.innerHTML =
      '<a class="ad-card" href="' + (link ? adHref(slotKey, link) : "#") + '" target="_blank" rel="noopener nofollow">' +
        (cover ? '<img class="ad-cover" src="' + cover + '" alt="' + esc(book.title) + '" loading="lazy">' : "") +
        '<span class="ad-info">' +
          '<span class="ad-kicker">图书推荐 · 京东</span>' +
          '<span class="ad-title">' + esc(book.title) + "</span>" +
          (book.author ? '<span class="ad-author">' + esc(book.author) + "</span>" : "") +
          '<span class="ad-cta">去京东看看 <span class="ad-model">' + model + "</span></span>" +
        "</span>" +
      "</a>";
  }
  loadAds()
    .then(function (j) {
      var books = j.books || {};
      var slots = j.slots || {};
      document.querySelectorAll("[data-ad-slot]").forEach(function (el) {
        var key = el.getAttribute("data-ad-slot");
        var s = slots[key];
        if (s && s.enabled && books[s.book] && safeLink(books[s.book].link)) {
          fillSlot(el, books[s.book], key);
        } else {
          el.classList.add("ad-empty");
        }
      });
      // 书单页：把「京东图书」占位链接替换为后台配置的（佣金）链接
      document.querySelectorAll("[data-jd-book]").forEach(function (a) {
        var b = books[a.getAttribute("data-jd-book")];
        var link = b && safeLink(b.link);
        if (link) {
          a.href = adHref("book-" + a.getAttribute("data-jd-book"), link);
          a.title = "京东图书 · " + (b.model || "CPS") + " 链接";
          a.textContent = "京东图书";
        }
      });
    })
    .catch(function () {
      document.querySelectorAll("[data-ad-slot]").forEach(function (el) { el.classList.add("ad-empty"); });
    });
})();
