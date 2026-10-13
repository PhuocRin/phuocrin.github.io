# phuocrin.github.io

Địa chỉ: https://phuocrin.com

Web cá nhân của Phước Rin: hình nền Liquid Glass 4K miễn phí, mời cà phê, video, đồ mình dùng, hợp tác.

- `index.html`: trang chính
- Hình nền 4K (`<id>_phone.jpg` 2160×3840, `<id>_desktop.jpg` 3840×2160) nằm trên Cloudflare R2, bucket `phuocrin-hinh-nen`, phục vụ qua https://img.phuocrin.com/ (phẳng, không thư mục con)
- `wallpapers/<bo>/thumb/`: ảnh xem trước; `wallpapers/<bo>/<id>_mask.png`: mask chiều sâu
- `js/kinh-lua.js`: code vẽ ảnh xem trước bộ Kính Lụa
- `videos.json`: danh sách video, GitHub Actions tự cập nhật 6 tiếng một lần
- `firmware/index.html`: trang tải firmware iOS, iPadOS (chính thức, beta, RC)
- `firmware/devices.json`, `firmware/d/<mã máy>.json`: dữ liệu firmware, bot `scripts/update_firmware.py` cập nhật mỗi giờ (hỏi thẳng server ký của Apple). File IPSW không lưu ở đây, link trỏ về server Apple.
