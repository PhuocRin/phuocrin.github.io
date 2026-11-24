/* Giao diện Noel: tự bật trong khoảng TU → DEN (giờ máy người xem), ngoài khoảng đó web giữ giao diện thường.
   Xem thử ngoài mùa: thêm ?noel=1 vào link; tắt thử: ?noel=0. Đổi ngày bật/tắt: sửa hai dòng dưới (tháng-ngày). */
(function () {
  var TU = "11-20", DEN = "12-31";
  var d = new Date(), md = ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  var q = /[?&]noel=([01])/.exec(location.search);
  var on = q ? q[1] === "1" : (md >= TU && md <= DEN);
  if (!on) return;
  var root = document.documentElement;
  root.classList.add("noel");

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
