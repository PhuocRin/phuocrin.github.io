"""Ghi videos.json từ RSS của kênh YouTube @phuocrin và playlist Mẹo iPhone. Chạy bởi GitHub Actions."""
import json, re, urllib.request, xml.etree.ElementTree as ET

HANDLE = "phuocrin"
TIPS_PLAYLIST = "PLT81iRTCac7UGqi528VoHfuvh1ytw5PUH"
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

def main():
    try:
        old = json.load(open("videos.json"))
    except Exception:
        old = {}
    data = dict(old)
    try:
        cid = channel_id()
        data["latest"] = feed(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}", True)[:6] or old.get("latest", [])
    except Exception as e:
        print("latest failed:", e)
    try:
        data["tips"] = feed(f"https://www.youtube.com/feeds/videos.xml?playlist_id={TIPS_PLAYLIST}", False)[:12] or old.get("tips", [])
    except Exception as e:
        print("tips failed:", e)
    json.dump(data, open("videos.json", "w"), ensure_ascii=False, indent=1)
    print({k: len(v) for k, v in data.items()})

main()
