# Download the public-domain / CC0 image set from Wikimedia Commons into assets/src/ and write a credits manifest.
import json, os, sys, time, urllib.request, urllib.parse, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'assets', 'src')
os.makedirs(SRC, exist_ok=True)
UA = 'he-drowns-mv/1.0 (local music-video project; python urllib)'

# (search query, substring that must be in the file title, local name, width to fetch)
WANT = [
    ('Isle of the Dead Böcklin Basel', 'Toteninsel I (Basel, Kunstmuseum)', 'toteninsel', 2600),
    ('Millais Ophelia Google Art Project', 'Millais - Ophelia - Google Art Project', 'ophelia', 2600),
    ('Gustave Le Gray Great Wave Sete', 'MET DT1167', 'legray_wave', 2400),
    ('Gustave Le Gray Brig upon the water', 'Brig on the Water MET', 'legray_brig', 2400),
    ('Rutherfurd moon 1865 photograph', 'ETH-BIB-Moon', 'moon_rutherfurd', 2000),
    ('Rutherfurd moon 1865 photograph', 'RP-F-2001-7-1093-2.jpg', 'moon_rijks', 2400),
    ('Trouvelot partial eclipse of the moon', 'Partial eclipse of the moon - 1874', 'trouvelot_eclipse', 2000),
    ('Leighton Fisherman and the Syren', 'Leighton-The Fisherman and the Syren', 'leighton_syren', 1400),
    ('Waterhouse Hylas and the Nymphs Manchester', '1896.15 n2', 'hylas', 2600),
    ('Hokusai Great Wave Kanagawa MET', '「富嶽三十六景 神奈川沖浪裏」', 'hokusai_wave', 2600),
    ('Röntgen Hand mit Ringen', 'First medical X-ray by Wilhelm Röntgen', 'xray_hand', 1800),
    ('Redon eye like a strange balloon', 'Redon - The Eye, Like a Strange Balloon', 'redon_eye', 1800),
    ('Louis Boutan underwater photograph', 'Underwater diver. Boutan', 'boutan_diver', 1652),
    ('Haeckel Kunstformen Discomedusae', 'Haeckel Discomedusae 8.jpg', 'haeckel_medusa', 2000),
    ('Friedrich Monk by the Sea', 'Mönch am Meer - Google Art Project', 'friedrich_monk', 2600),
    ('Friedrich Moonrise over the Sea 1822', 'Mondaufgang am Meer - Google Art Project', 'friedrich_moonrise', 2600),
    ('Blue Marble AS17-148-22727', 'The Blue Marble, AS17-148-22727.jpg', 'bluemarble', 2000),
    ('Waterhouse Lady of Shalott 1888 Tate', 'John William Waterhouse The Lady of Shalott.jpg', 'shalott', 2600),
    ('Hiroshige Awa Naruto whirlpools triptych', 'MET DP146864', 'hiroshige_awa', 2600),
    ('Yoshitoshi Daimotsu Bay moon Benkei', 'Boat in waves with moon', 'yoshitoshi_boat', 2398),
    ('Julia Margaret Cameron Julia Jackson 1867 MET', 'Julia Jackson MET DT1121', 'jmc_julia', 2200),
    ('Julia Margaret Cameron Beatrice MET', 'Beatrice MET DP295247', 'jmc_beatrice', 2200),
    ('total lunar eclipse NASA red moon', 'LunarEclipse 01', 'eclipse2026', 2400),
    ('Burne-Jones Depths of the Sea 1887', 'Burne-Jones - The Depths of the Sea', 'burnejones_depths', 400),
    ('Dürer study of hands', 'Study of a Hand and a Pillow', 'durer_hand', 2200),
]

def api(params):
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(dict(params, format='json'))
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for i in range(8):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=60).read().decode())
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(6 * (i + 1))
    raise RuntimeError('rate limited')

def download(url, path):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for i in range(8):
        try:
            data = urllib.request.urlopen(req, timeout=120).read()
            open(path, 'wb').write(data); return len(data)
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(8 * (i + 1))
    raise RuntimeError('rate limited')

manifest_path = os.path.join(SRC, 'manifest.json')
manifest = json.load(open(manifest_path, encoding='utf-8')) if os.path.exists(manifest_path) else {}
only = set(sys.argv[1:])
for q, sub, name, width in WANT:
    if only and name not in only: continue
    if name in manifest and os.path.exists(os.path.join(SRC, name + '.jpg')):
        print('have', name); continue
    r = api(dict(action='query', generator='search', gsrsearch=q, gsrnamespace=6, gsrlimit=12, prop='imageinfo',
                 iiprop='url|size|extmetadata|mime', iiurlwidth=width,
                 iiextmetadatafilter='LicenseShortName|Artist|DateTimeOriginal|ObjectName|Credit'))
    pages = sorted(r.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 0))
    hit = next((p for p in pages if sub in p['title']), None)
    if not hit:
        print('!! not found', name, [p['title'][:60] for p in pages]); continue
    ii = hit['imageinfo'][0]
    url = ii.get('thumburl') or ii['url']
    n = download(url, os.path.join(SRC, name + '.jpg'))
    em = ii.get('extmetadata', {})
    manifest[name] = dict(title=hit['title'], page=ii.get('descriptionurl'), license=em.get('LicenseShortName', {}).get('value'),
                          artist=em.get('Artist', {}).get('value'), date=em.get('DateTimeOriginal', {}).get('value'),
                          size=[ii.get('width'), ii.get('height')])
    json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('ok', name, n // 1024, 'KB', manifest[name]['license'])
    time.sleep(2.5)
