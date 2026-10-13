"""Ghi videos.json từ RSS của kênh YouTube @phuocrin và playlist Mẹo iPhone. Chạy bởi GitHub Actions."""
import json, re, urllib.request, xml.etree.ElementTree as ET

HANDLE = "phuocrin"
TIPS_PLAYLIST = "PLT81iRTCac7UGqi528VoHfuvh1ytw5PUH"
REVIEW_PLAYLIST = "PLT81iRTCac7XDlujkyBtJnG0q6BKTHr-5"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
UA = {"User-Agent": "Mozilla/5.0 (phuocrin.github.io video updater)", "Accept-Language": "vi,en"}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode("utf-8", "replace")

def channel_id():
    html = get(f"https://www.youtube.com/@{HANDLE}")
    for pat in (r'"externalId":"(UC[\w-]{22})"', r'"channelId":"(UC[\w-]{22})"', r'channel/(UC[\w-]{22})'):
        m = re.search(pat, html)
        if m:
            return m.group(1)
    raise SystemExit("Không tìm thấy channel id")

def feed(url, skip_shorts):
    root = ET.fromstring(get(url))
    out = []
    for e in root.findall("a:entry", NS):
        link = e.find("a:link", NS).get("href", "")
        if skip_shorts and "/shorts/" in link:
            continue
        out.append({"id": e.find("yt:videoId", NS).text, "title": e.find("a:title", NS).text, "published": e.find("a:published", NS).text})
    return out

# Video theo bản iOS: tên video dạng "iOS 27.0.1 chính thức có gì mới?", "iOS 27.2 beta 3 sau vài ngày?"
OS_RE = re.compile(r"^(iOS|iPadOS|macOS|watchOS)\s+(\d+(?:\.\d+)+|\d+)\s*((?:beta|RC)(?:\s*\d+)?)?\s*(.*)$", re.I)

def os_key(osn, ver, tag):
    tag = (tag or "").strip().lower()
    tag = re.sub(r"\s+", " ", tag)
    if tag in ("beta 1", "beta1"):
        tag = "beta"
    tag = tag.replace("beta", "beta ").replace("  ", " ").strip() if re.match(r"beta\d", tag) else tag
    return (osn.lower() + " " + ver + (" " + tag if tag else "")).strip()

def os_videos(videos, old):
    out = {k: list(v) for k, v in (old or {}).items()}
    for v in videos:
        m = OS_RE.match(v["title"].strip())
        if not m:
            continue
        osn = {"ios": "iOS", "ipados": "iPadOS", "macos": "macOS", "watchos": "watchOS"}[m.group(1).lower()]
        rest = m.group(4).lower()
        kind = "sau" if re.search(r"\bsau\b", rest) else "moi"
        key = os_key(osn, m.group(2), m.group(3))
        lst = out.setdefault(key, [])
        if not any(x["id"] == v["id"] for x in lst):
            lst.append({"id": v["id"], "title": v["title"], "kind": kind, "published": v.get("published", "")})
        lst.sort(key=lambda x: x.get("published", ""))
    return out

def main():
    try:
        old = json.load(open("videos.json"))
    except Exception:
        old = {}
    data = dict(old)
    try:
        cid = channel_id()
        allv = feed(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}", True)
        data["latest"] = allv[:6] or old.get("latest", [])
        data["os"] = os_videos(allv, old.get("os", {}))
    except Exception as e:
        print("latest failed:", e)
    try:
        data["tips"] = feed(f"https://www.youtube.com/feeds/videos.xml?playlist_id={TIPS_PLAYLIST}", False)[:12] or old.get("tips", [])
    except Exception as e:
        print("tips failed:", e)
    try:
        data["review"] = feed(f"https://www.youtube.com/feeds/videos.xml?playlist_id={REVIEW_PLAYLIST}", False)[:12] or old.get("review", [])
    except Exception as e:
        print("review failed:", e)
    json.dump(data, open("videos.json", "w"), ensure_ascii=False, indent=1)
    print({k: len(v) for k, v in data.items()})

main()
