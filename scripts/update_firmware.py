"""Ghi dữ liệu cho trang firmware.html. Chạy bởi GitHub Actions mỗi giờ.

Nguồn:
- Tên máy: IPSW.me (danh sách iPhone, iPad).
- Danh sách bản (chính thức, beta, RC), link, dung lượng, SHA-256: AppleDB.
  Link nào cũng là file trên server Apple (updates.cdn-apple.com); web không lưu file.
- Còn ký hay đã khoá: bot hỏi thẳng server ký của Apple (gs.apple.com), không lấy số của ai.

Ghi ra:
- firmware/devices.json: danh sách máy + giờ cập nhật.
- firmware/d/<mã máy>.json: các bản của máy đó.
Bộ nhớ đệm (không đẩy lên repo): .cache/firmware.json
"""
import io, json, os, plistlib, re, sys, time, uuid, zipfile
import urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

UA = "phuocrin.com firmware list (+https://phuocrin.com)"
OUT = "firmware"
CACHE = os.path.join(".cache", "firmware.json")
MAJORS = 3              # số đời iOS gần nhất giữ lại (ví dụ iOS 18, 26, 27)
BETA_DAYS = 220         # beta/RC cũ hơn thì bỏ
BETA_PER_DEVICE = 16
APPLE = "https://updates.cdn-apple.com/"
NOW = datetime.now(timezone.utc)
TODAY = NOW.strftime("%Y-%m-%d")


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def get_json(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(3 * (i + 1))


def load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def dump(path, data, pretty=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        f.write("\n")
    os.replace(tmp, path)


# ---------- đọc BuildManifest.plist trong file IPSW mà không tải cả file ----------
class HttpFile(io.RawIOBase):
    def __init__(self, url):
        self.url, self.pos = url, 0
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            self.size = int(r.headers["Content-Length"])

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else (self.pos + off if whence == 1 else self.size + off)
        return self.pos

    def readinto(self, b):
        if self.pos >= self.size or not len(b):
            return 0
        end = min(self.pos + len(b), self.size) - 1
        req = urllib.request.Request(self.url, headers={"User-Agent": UA, "Range": f"bytes={self.pos}-{end}"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        b[:len(data)] = data
        self.pos += len(data)
        return len(data)


def build_manifest(url):
    with zipfile.ZipFile(io.BufferedReader(HttpFile(url), buffer_size=1 << 16)) as z:
        return plistlib.loads(z.read("BuildManifest.plist"))


# ---------- hỏi server ký của Apple (cùng cách tsschecker / blacktop ipsw làm) ----------
def _hex(v):
    return int(v, 16) if isinstance(v, str) else int(v)


def _rules(entry, rules):
    have = {"ApRawProductionMode": True, "ApCurrentProductionMode": True,
            "ApRawSecurityMode": True, "ApRequiresImage4": True}
    for rule in rules or []:
        cond = rule.get("Conditions") or {}
        if all(k in have and have[k] == v for k, v in cond.items()):
            for k, v in (rule.get("Actions") or {}).items():
                if isinstance(v, bool):
                    entry[k] = v


def tss_request(bi):
    r = {"@HostPlatformInfo": "mac", "@VersionInfo": "libauthinstall-1049.100.21",
         "@UUID": str(uuid.uuid4()).upper(), "@ApImg4Ticket": True,
         "ApECID": int.from_bytes(os.urandom(8), "big") >> 1,  # máy giả, ngẫu nhiên
         "ApNonce": os.urandom(32), "SepNonce": os.urandom(20),
         "UniqueBuildID": bi["UniqueBuildID"], "ApChipID": _hex(bi["ApChipID"]), "ApBoardID": _hex(bi["ApBoardID"]),
         "ApSecurityDomain": 1, "ApSecurityMode": True, "ApProductionMode": True,
         "UID_MODE": False, "Ap,SikaFuse": 0}
    # NeRDEpoch chỉ gửi khi build có khai báo: gửi bừa cho máy đời cũ (A13–A16) thì Apple trả "không đủ điều kiện"
    for k in ("NeRDEpoch", "Ap,OSLongVersion", "Ap,ProductMarketingVersion", "Ap,ProductType", "Ap,SDKPlatform",
              "Ap,Target", "Ap,TargetType", "PearlCertificationRootPub", "PermitNeRDPivot"):
        if k in bi:
            r[k] = bi[k]
    for k, v in bi.get("Manifest", {}).items():
        info = v.get("Info") or {}
        if "RestoreRequestRules" not in info:
            continue
        m = {"Digest": v.get("Digest", b"")}
        if "Trusted" in v:
            m["Trusted"] = v["Trusted"]
        _rules(m, info["RestoreRequestRules"])
        for x in ("BuildString", "MemoryMap", "ObjectPayloadPropertyDigest", "RawDataDigest", "TBMDigests"):
            if x in v:
                m[x] = v[x]
        r[k] = m
    return r


def is_signed(url, device):
    """True = Apple còn ký, False = Apple từ chối, None = không hỏi được (giữ kết quả cũ)."""
    try:
        m = build_manifest(url)
        ids = [b for b in m["BuildIdentities"] if (b.get("Info") or {}).get("RestoreBehavior") == "Erase"] or m["BuildIdentities"]
        own = [b for b in ids if b.get("Ap,ProductType") == device] or ids
        body = plistlib.dumps(tss_request(own[0]))
        req = urllib.request.Request("http://gs.apple.com/TSS/controller?action=2", data=body, headers={
            "Cache-Control": "no-cache", "Content-Type": 'text/xml; charset="utf-8"', "User-Agent": "InetURL/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            text = r.read(400).decode("utf-8", "replace")
        if text.startswith("STATUS=0&"):
            return True
        if "STATUS=94&" in text:
            return False
        log("TSS lạ", device, url, text[:100])
        return None
    except Exception as e:
        log("TSS lỗi", device, url, e)
        return None


# ---------- dữ liệu ----------
def id_key(identifier):
    m = re.match(r"([A-Za-z]+)(\d+),(\d+)", identifier)
    return (m.group(1), -int(m.group(2)), -int(m.group(3))) if m else (identifier, 0, 0)


def devices(old):
    try:
        raw = get_json("https://api.ipsw.me/v4/devices")
        out = [{"id": d["identifier"], "name": d.get("name") or d["identifier"]}
               for d in raw if re.match(r"^(iPhone|iPad)\d+,\d+$", d.get("identifier", ""))]
        if out:
            return sorted(out, key=lambda x: id_key(x["id"]))
    except Exception as e:
        log("không lấy được danh sách máy:", e)
    return old


def appledb_record(key):
    d = get_json("https://api.appledb.dev/ios/" + urllib.parse.quote(key, safe=";,") + ".json")
    files = {}
    for s in d.get("sources", []):
        if s.get("type") != "ipsw":
            continue
        url = next((l["url"] for l in s.get("links", []) if l.get("url", "").startswith(APPLE) and l.get("active", True)), None)
        if not url:
            continue
        f = files.setdefault(url, {"size": s.get("size") or 0, "sha256": (s.get("hashes") or {}).get("sha2-256", ""), "devs": []})
        f["devs"] += [x for x in s.get("deviceMap", []) if x not in f["devs"]]
    kind = "rc" if d.get("rc") else ("beta" if d.get("beta") else "release")
    return {"os": d.get("osStr", ""), "v": d.get("version", ""), "b": d.get("build", ""), "d": d.get("released", ""),
            "kind": kind, "files": files, "adb_signed": sorted(set(d.get("signed") or [])), "fetched": TODAY}


def main():
    old_index = load(os.path.join(OUT, "devices.json"), {})
    devs = devices(old_index.get("devices", []))
    if not devs:
        raise SystemExit("Không có danh sách máy")
    known = {d["id"] for d in devs}

    cache = load(CACHE, {})
    index = get_json("https://api.appledb.dev/ios/index.json")
    keys = [k for k in index if re.match(r"^(iOS|iPadOS);\d{2}[A-Z]\d+[a-z]?(-RC)?$", k)]
    majors = sorted({int(k.split(";")[1][:2]) for k in keys})[-MAJORS:]
    keys = [k for k in keys if int(k.split(";")[1][:2]) in majors]
    recent = (NOW - timedelta(days=30)).strftime("%Y-%m-%d")

    # 1) cập nhật danh sách bản từ AppleDB (bản mới, bản 30 ngày gần đây, bản còn ký thì hỏi lại)
    def need_refresh(k):
        c = cache.get(k)
        if not c:
            return True
        still_signed = any(f.get("signed") for f in c["files"].values())
        return (c.get("d", "") >= recent or still_signed) and c.get("fetched") != TODAY

    todo = [k for k in keys if need_refresh(k)]
    log(len(keys), "build,", len(todo), "build cần đọc lại từ AppleDB")
    with ThreadPoolExecutor(6) as ex:
        for k, rec in zip(todo, ex.map(lambda k: _safe(appledb_record, k), todo)):
            if not rec:
                continue
            prev = cache.get(k, {}).get("files", {})
            for url, f in rec["files"].items():
                if url in prev:
                    f["signed"] = prev[url].get("signed")
                    f["checked"] = prev[url].get("checked")
            cache[k] = rec
    for k in [k for k in cache if k not in keys]:
        del cache[k]

    # 2) hỏi Apple: file mới, file lần trước còn ký, hoặc AppleDB báo còn ký
    jobs = []
    for k, c in cache.items():
        for url, f in c["files"].items():
            devs_here = [d for d in f["devs"] if d in known] or f["devs"]
            if not devs_here:
                continue
            adb = bool(set(f["devs"]) & set(c.get("adb_signed", [])))
            if f.get("signed") or adb or (f.get("signed") is None and c.get("d", "") >= recent):
                jobs.append((k, url, devs_here[0]))
            elif f.get("signed") is None:
                f["signed"] = False  # bản cũ, cả AppleDB cũng ghi đã khoá: không làm phiền server Apple
    log(len(jobs), "file cần hỏi server ký của Apple")
    changed = 0
    with ThreadPoolExecutor(6) as ex:
        for (k, url, dev), res in zip(jobs, ex.map(lambda j: is_signed(j[1], j[2]), jobs)):
            if res is None:
                continue
            f = cache[k]["files"][url]
            f["apple"], f["checked"] = res, NOW.strftime("%Y-%m-%dT%H:%M:%SZ")
            f["new"] = (res, "apple")

    # Vài đời máy mới (ví dụ iPhone 16e, một số iPad) cần thêm thông tin mà bot chưa gửi được,
    # nên Apple trả "không đủ điều kiện" dù bản đó vẫn còn ký. Chỉ khi cùng build đó Apple
    # đang ký cho máy khác, bot mới tin nguồn thứ hai (IPSW.me cho bản chính thức, AppleDB cho beta/RC).
    # Khi Apple khoá cả build thì không máy nào còn ký, nên không có gì bị giữ "còn ký" sai.
    ipswme = {}
    for k, c in cache.items():
        files = c["files"].values()
        if not any(f.get("apple") for f in files):
            continue
        for url, f in c["files"].items():
            if f.get("apple") is not False or "new" not in f:
                continue
            ok = False
            if c["kind"] == "release":
                for dev in f["devs"]:
                    if dev not in ipswme:
                        try:
                            fw = get_json(f"https://api.ipsw.me/v4/device/{dev}?type=ipsw")["firmwares"]
                            ipswme[dev] = {x["buildid"] for x in fw if x.get("signed")}
                        except Exception as e:
                            log("IPSW.me lỗi", dev, e)
                            ipswme[dev] = set()
                    ok = ok or c["b"] in ipswme[dev]
                src = "ipsw.me"
            else:
                ok = bool(set(f["devs"]) & set(c.get("adb_signed", [])))
                src = "appledb"
            if ok:
                f["new"] = (True, src)
    for c in cache.values():
        for f in c["files"].values():
            if "new" in f:
                val, src = f.pop("new")
                if f.get("signed") != val:
                    changed += 1
                f["signed"], f["src"] = val, src
    dump(CACHE, cache)

    # 3) ghi file cho từng máy
    beta_cut = (NOW - timedelta(days=BETA_DAYS)).strftime("%Y-%m-%d")
    per_dev = {}
    for c in cache.values():
        if c["kind"] != "release" and c["d"] < beta_cut:
            continue
        for url, f in c["files"].items():
            for dev in f["devs"]:
                if dev in known:
                    per_dev.setdefault(dev, []).append({
                        "os": c["os"], "v": c["v"], "b": c["b"], "d": c["d"], "kind": c["kind"], "url": url,
                        "size": f["size"], "sha256": f["sha256"], "signed": f.get("signed"),  # None = lần này chưa hỏi được Apple
                        "src": f.get("src", "apple") if f.get("signed") else "apple"})
    os.makedirs(os.path.join(OUT, "d"), exist_ok=True)
    wrote = set()
    for dev, rows in per_dev.items():
        rows.sort(key=lambda x: (x["d"], x["b"]), reverse=True)
        rel = [r for r in rows if r["kind"] == "release"]
        beta = [r for r in rows if r["kind"] != "release"][:BETA_PER_DEVICE]
        dump(os.path.join(OUT, "d", dev + ".json"), {"release": rel, "beta": beta})
        wrote.add(dev + ".json")
    for fn in os.listdir(os.path.join(OUT, "d")):
        if fn.endswith(".json") and fn not in wrote:
            os.remove(os.path.join(OUT, "d", fn))

    have = sorted(w[:-5] for w in wrote)
    payload = {"devices": devs, "have": have, "majors": majors}
    # "updated" chỉ đổi khi danh sách hoặc trạng thái ký thật sự đổi, để repo không bị commit mỗi giờ
    same = all(old_index.get(k) == v for k, v in payload.items())
    payload["updated"] = old_index["updated"] if (same and not changed and old_index.get("updated")) else NOW.strftime("%Y-%m-%dT%H:%M:%SZ")
    dump(os.path.join(OUT, "devices.json"), payload)
    log(len(devs), "máy,", len(have), "máy có dữ liệu,", changed, "trạng thái ký vừa đổi")


def _safe(fn, *a):
    try:
        return fn(*a)
    except Exception as e:
        log("bỏ qua", a, e)
        return None


if __name__ == "__main__":
    main()
