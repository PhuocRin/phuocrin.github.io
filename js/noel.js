/* Giao diện Noel: tự bật trong khoảng TU → DEN (giờ máy người xem), ngoài khoảng đó web giữ giao diện thường.
   Xem thử ngoài mùa: thêm ?noel=1 vào link; tắt thử: ?noel=0. Đổi ngày bật/tắt: sửa hai dòng dưới (tháng-ngày). */
(function () {
  var TU = "11-20", DEN = "12-27";
  var d = new Date(), md = ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  var q = /[?&]noel=([01])/.exec(location.search);
  var on = q ? q[1] === "1" : (md >= TU && md <= DEN);
  if (!on) return;
  var root = document.documentElement;
  root.classList.add("noel");

  var TREE = '<svg viewBox="0 0 120 162" aria-hidden="true"><defs>'
    + '<linearGradient id="nlG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fe39c" stop-opacity=".92"/><stop offset="1" stop-color="#0c7444" stop-opacity=".9"/></linearGradient>'
    + '<linearGradient id="nlH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>'
    + '<radialGradient id="nlS"><stop offset="0" stop-color="#fff6c2"/><stop offset=".5" stop-color="#ffc93d"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient></defs>'
    + '<ellipse cx="60" cy="155" rx="56" ry="7" fill="#fff" opacity=".9"/>'
    + '<rect x="53" y="136" width="14" height="17" rx="3" fill="#8a5632"/>'
    + ['60 70 112 134q2 6-5 6H13q-7 0-5-6Z','60 38 100 92q2 5-4 5H24q-6 0-4-5Z','60 14 88 56q2 4-3 4H35q-5 0-3-4Z'].map(function (d) {
        return '<path d="M' + d + '" fill="url(#nlG)" stroke="rgba(255,255,255,.6)" stroke-width="1.2"/><path d="M' + d + '" fill="url(#nlH)"/>'; }).join('')
    + '<path fill="#fff" d="M10 136q8-7 18-3 10-6 20 0 12-6 24 0 10-6 20 0 10-4 18 3q-2 4-7 4H15q-5 0-5-4Z"/>'
    + '<path fill="#fff" d="M22 94q8-6 16-2 10-5 18 0 10-5 18 0 10-5 18 0 8-3 12 2q-1 3-6 3H26q-4 0-4-3Z"/>'
    + '<path fill="#fff" d="M34 58q6-5 12-1 7-4 14 0 7-4 14 0 6-3 10 1-1 2-4 2H36q-3 0-2-2Z"/>'
    + '<g stroke="rgba(255,255,255,.7)" stroke-width=".8"><circle cx="48" cy="80" r="4.2" fill="#e8344a"/><circle cx="76" cy="114" r="4.6" fill="#ffc53d"/><circle cx="38" cy="120" r="4.2" fill="#3d8bff"/><circle cx="70" cy="48" r="3.6" fill="#ffc53d"/><circle cx="90" cy="126" r="3.8" fill="#e8344a"/><circle cx="62" cy="84" r="3.4" fill="#3d8bff"/></g>'
    + '<circle cx="60" cy="13" r="13" fill="url(#nlS)"/><path d="m60 3 2.9 6.2 6.7.8-5 4.6 1.4 6.6L60 17.8l-6 3.4 1.4-6.6-5-4.6 6.7-.8Z" fill="#ffd34d" stroke="#fff3b0" stroke-width=".8"/></svg>';
  function deer(x) {
    return '<g transform="translate(' + x + ' 0)"><ellipse cx="20" cy="40" rx="13" ry="5.5"/><path d="M30 37q5-7 7-13l3 1q-1 8-6 14Z"/><ellipse cx="39" cy="23" rx="5" ry="3.2" transform="rotate(-20 39 23)"/>'
      + '<path d="M36 20q-2-6 1-10M37 14l-4-2M38 19q3-6 8-7M42 15l1-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
      + '<path d="M28 43l9 5M25 44l7 7M13 43l-9 4M10 41l-8 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>';
  }
  /* xe trượt bên trái, tuần lộc phía trước bên phải, bay từ trái sang phải */
  var SLEIGH = '<svg viewBox="0 0 250 64" fill="currentColor" aria-hidden="true">' + deer(104) + deer(148) + deer(192)
    + '<path d="M88 32 124 38M140 39h28M184 39h28" stroke="currentColor" stroke-width=".9" fill="none"/>'
    + '<g transform="translate(-146 0)"><path d="M150 50q4-14 20-14h50q8 0 10-10l6 2q-2 18-18 22Z"/><path d="M146 56h80q8 0 12-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'
    + '<path d="M156 52l-2 4M214 50l2 6" stroke="currentColor" stroke-width="2"/>'
    + '<circle cx="195" cy="18" r="6"/><path d="M186 37q0-14 9-14 10 0 10 14Z"/><path d="M190 15q4-9 13-7l5 6-4 1-3-3q-6 0-8 5Z"/><circle cx="209" cy="15" r="2.4"/>'
    + '<path d="M164 36q-2-14 8-14 10 2 10 14Z"/></g></svg>';
  /* Tuyết đọng trên mọi nút (.btn), mọi tấm kính (.glass) và ô hình nền (.wp). Chừa trình xem hình nền, bảng Xem tất cả,
     nút có thanh % (overflow hidden sẽ cắt mất tuyết), phần tử quá nhỏ (nút chấm, mũi tên) và khung có mũ Noel (.me). */
  var SEL = ".btn, .glass, .wp, .device";
  function want(el) {
    if (el.closest(".viewer, .sheet, .vdl, .lens, .lens-inner, .me, .noel-cap")) return false;
    var cs = getComputedStyle(el);
    if (cs.display === "none" || cs.overflow !== "visible" && cs.overflowY !== "visible") return false;
    if (el.classList.contains("device") && !el.closest(".hero")) return false;
    return el.offsetWidth >= 60;
  }
  function cap(el) {
    if (el._nc) { if (el._nc.parentNode !== el) el.appendChild(el._nc); return; }
    if (!want(el)) return;
    var c = document.createElement("i"); c.setAttribute("aria-hidden", "true");
    c.className = "noel-cap" + (el.classList.contains("device") ? " noel-cap-phone" : el.offsetWidth > 420 ? " noel-cap-lg" : "");
    el._nc = c; el.appendChild(c);
  }
  function capIn(root) {
    if (root.nodeType !== 1 || root.classList.contains("noel-cap")) return;
    if (root.matches(SEL)) cap(root);
    var l = root.querySelectorAll(SEL); for (var i = 0; i < l.length; i++) cap(l[i]);
  }
  function decor() {
    var st = document.querySelector(".hero .stage");
    if (st) { var t = document.createElement("div"); t.className = "noel-tree"; t.innerHTML = TREE; st.appendChild(t); }
    var hero = document.querySelector(".hero");
    if (hero && st) { var sky = document.createElement("div"); sky.className = "noel-sky"; sky.setAttribute("aria-hidden", "true");
      sky.innerHTML = '<div class="noel-sleigh">' + SLEIGH + '</div>'; hero.insertBefore(sky, hero.firstChild); }
    capIn(document.body);
    /* nội dung vẽ sau bằng JS (dải hình nền, video, danh sách firmware) và nút đổi chữ (nút tải app) */
    if (!window.MutationObserver) return;
    var q = [], raf = 0;
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i]; if (m.target.nodeType === 1 && m.target._nc) q.push(m.target);
        for (var j = 0; j < m.addedNodes.length; j++) q.push(m.addedNodes[j]);
      }
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; var l = q; q = []; for (var k = 0; k < l.length; k++) if (l[k].isConnected) capIn(l[k]); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", decor); else decor();

  /* Tuyết rơi: canvas nằm sau nội dung (chữ luôn nằm trên, bông tuyết không đè lên dấu tiếng Việt), lọt qua các tấm kính mờ. Tắt khi người xem bật Giảm chuyển động,
     dừng khi tab ẩn hoặc đang mở trình xem hình nền / bảng Xem tất cả. */
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function start() {
    var cv = document.createElement("canvas");
    cv.className = "noel-snow"; cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv);
    var ctx = cv.getContext("2d"); if (!ctx) return;
    var sp = document.createElement("canvas"); sp.width = sp.height = 64;
    var sx = sp.getContext("2d"), g = sx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.45, "rgba(255,255,255,.85)"); g.addColorStop(1, "rgba(255,255,255,0)");
    sx.fillStyle = g; sx.fillRect(0, 0, 64, 64);
    var W = 0, H = 0, R = 1, flakes = [], run = true, last = 0;
    function make(y) {
      var r = Math.random();
      return { x: Math.random() * W, y: y == null ? Math.random() * H : y,
        r: 2 + r * r * 4.5, v: 18 + r * 42, s: Math.random() * 6.28, a: 0.55 + Math.random() * 0.4 };
    }
    function size() {
      R = Math.min(window.devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * R); cv.height = Math.round(H * R);
      ctx.setTransform(R, 0, 0, R, 0, 0);
      var n = Math.min(70, Math.max(20, Math.round(W * H / 15000)));
      while (flakes.length < n) flakes.push(make());
      flakes.length = n;
    }
    function frame(t) {
      if (!run) return;
      requestAnimationFrame(frame);
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016; last = t;
      ctx.clearRect(0, 0, W, H);
      if (root.style.overflow === "hidden") { cv.style.opacity = "0"; return; }
      cv.style.opacity = "";
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.v * dt; f.s += dt * 0.9; f.x += Math.sin(f.s) * 12 * dt;
        if (f.y > H + 6) { flakes[i] = make(-6); continue; }
        ctx.globalAlpha = f.a;
        ctx.drawImage(sp, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      ctx.globalAlpha = 1;
    }
    size();
    addEventListener("resize", size);
    document.addEventListener("visibilitychange", function () {
      run = !document.hidden; last = 0; if (run) requestAnimationFrame(frame);
    });
    requestAnimationFrame(frame);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
