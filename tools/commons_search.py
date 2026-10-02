# Search Wikimedia Commons files: python commons_search.py "query" [n]
import json, sys, time, urllib.request, urllib.parse, urllib.error
UA = 'he-drowns-mv/1.0 (local music-video project; python urllib)'
def api(params):
    params = dict(params, format='json')
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for i in range(6):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=30).read().decode())
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(5 * (i + 1))
    raise RuntimeError('rate limited')
q = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 8
r = api(dict(action='query', generator='search', gsrsearch=q, gsrnamespace=6, gsrlimit=n,
             prop='imageinfo', iiprop='url|size|extmetadata', iiextmetadatafilter='LicenseShortName|Artist|DateTimeOriginal'))
pages = sorted(r.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 0))
for p in pages:
    ii = p.get('imageinfo', [{}])[0]
    em = ii.get('extmetadata', {})
    lic = em.get('LicenseShortName', {}).get('value', '?')
    print('%-90s %5dx%-5d %s' % (p['title'][:90], ii.get('width', 0), ii.get('height', 0), lic))
