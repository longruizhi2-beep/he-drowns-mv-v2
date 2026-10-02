# Search Openverse (CC0 / public domain only) and build labelled contact sheets of the candidates.
#   python tools/openverse.py "query one" "query two" ...      -> tools/out/ov/<slug>.jpg + candidates.json
import json, os, sys, time, io, re, urllib.request, urllib.parse, urllib.error
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out', 'ov')
os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'he-drowns-mv/2.0 (local music-video project; python urllib)'}
DB = os.path.join(OUT, 'candidates.json')
db = json.load(open(DB, encoding='utf-8')) if os.path.exists(DB) else {}

def get(url, tries=6, raw=False):
    for i in range(tries):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
            return data if raw else json.loads(data.decode())
        except urllib.error.HTTPError as e:
            if e.code in (429, 503): time.sleep(4 * (i + 1)); continue
            return None
        except Exception:
            time.sleep(2 * (i + 1))
    return None

for q in sys.argv[1:]:
    slug = re.sub(r'[^a-z0-9]+', '_', q.lower()).strip('_')
    url = 'https://api.openverse.org/v1/images/?' + urllib.parse.urlencode(
        {'q': q, 'license': 'cc0,pdm', 'page_size': 20, 'size': 'large', 'mature': 'false'})
    r = get(url)
    if not r:
        print('!! failed', q); continue
    res = [x for x in r.get('results', []) if ((x.get('width') or 0) >= 1400 or (x.get('height') or 0) >= 1400) and x.get('source') != 'stocksnap']
    tiles = []
    for i, x in enumerate(res[:20]):
        key = f'{slug}#{i}'
        db[key] = {k: x.get(k) for k in ['id', 'title', 'url', 'creator', 'license', 'license_version', 'source', 'provider', 'width', 'height', 'foreign_landing_url']}
        th = get(f"https://api.openverse.org/v1/images/{x['id']}/thumb/", raw=True)
        if not th: continue
        try:
            im = Image.open(io.BytesIO(th)).convert('RGB')
        except Exception:
            continue
        im.thumbnail((360, 260))
        tiles.append((i, im, x))
        time.sleep(0.3)
    cols = 5
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 370, max(1, rows) * 300), (18, 18, 18))
    d = ImageDraw.Draw(sheet)
    for n, (i, im, x) in enumerate(tiles):
        cx, cy = (n % cols) * 370 + 5, (n // cols) * 300 + 5
        sheet.paste(im, (cx, cy))
        d.text((cx, cy + 264), f"#{i} {x.get('source')} {x.get('width')}x{x.get('height')}", fill=(255, 220, 0))
    sheet.save(os.path.join(OUT, slug + '.jpg'), quality=82)
    json.dump(db, open(DB, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{q}: {len(res)} results -> {slug}.jpg')
    time.sleep(1.0)
