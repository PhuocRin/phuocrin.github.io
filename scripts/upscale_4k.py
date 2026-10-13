"""Upscale hình nền chưa đủ 4K lên đúng 2160x3840 (điện thoại) / 3840x2160 (máy tính).
Model Real-ESRGAN anime 6B (hợp tranh vẽ, minh hoạ, kính, gradient). Chạy bởi workflow upscale-4k.yml.
Cách dùng: python scripts/upscale_4k.py <model.pth> <số phần> <phần thứ mấy> <thư mục ra>
"""
import sys, glob, os, time, numpy as np, torch
from PIL import Image
from spandrel import ModelLoader

MP, PARTS, PART, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
torch.set_num_threads(os.cpu_count() or 2)
m = ModelLoader().load_from_file(MP).eval(); s = m.scale
files = sorted(f for f in glob.glob("wallpapers/*/*_phone.jpg") + glob.glob("wallpapers/*/*_desktop.jpg"))
todo = [f for f in files if max(Image.open(f).size) < 3840][PART::PARTS]
for f in todo:
    im = Image.open(f); W, H = im.size
    tgt = (2160, 3840) if H > W else (3840, 2160)
    out = os.path.join(OUT, f); os.makedirs(os.path.dirname(out), exist_ok=True)
    t0 = time.time()
    img = np.asarray(im.convert("RGB")).astype(np.float32) / 255
    res = np.zeros((H * s, W * s, 3), np.uint8); T, P = 256, 16
    with torch.inference_mode():
        for y in range(0, H, T):
            for x in range(0, W, T):
                y0, x0 = max(y - P, 0), max(x - P, 0); y1, x1 = min(y + T + P, H), min(x + T + P, W)
                o = m(torch.from_numpy(img[y0:y1, x0:x1].transpose(2, 0, 1)[None].copy()))[0].clamp(0, 1).numpy().transpose(1, 2, 0)
                ty, tx = min(y + T, H), min(x + T, W)
                res[y * s:ty * s, x * s:tx * s] = (o[(y - y0) * s:(ty - y0) * s, (x - x0) * s:(tx - x0) * s] * 255 + .5).astype(np.uint8)
    big = Image.fromarray(res); del res
    r = max(tgt[0] / big.width, tgt[1] / big.height); nw, nh = round(big.width * r), round(big.height * r)
    big = big.resize((nw, nh), Image.LANCZOS); l, t = (nw - tgt[0]) // 2, (nh - tgt[1]) // 2
    big.crop((l, t, l + tgt[0], t + tgt[1])).save(out, quality=92, subsampling=0)
    print(f, (W, H), "->", tgt, round(time.time() - t0), "s", flush=True)
