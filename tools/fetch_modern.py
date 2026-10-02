# Download the chosen modern CC0 / public-domain images (Openverse candidates) into assets/src/ + manifest.
import json, os, sys, time, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'assets', 'src')
os.makedirs(SRC, exist_ok=True)
UA = {'User-Agent': 'he-drowns-mv/2.0 (local music-video project; python urllib)'}
cand = json.load(open(os.path.join(HERE, 'out', 'ov', 'candidates.json'), encoding='utf-8'))

PICK = {  # local name: candidates key
    'm_float_white': 'underwater_woman#12', 'm_curl_bw': 'underwater_woman#0', 'm_diver_up': 'underwater_woman#6',
    'm_couple': 'underwater_woman#5', 'm_halfsub': 'underwater_woman#8', 'm_eyes_lake': 'underwater_woman#7',
    'm_dress_arms': 'underwater_woman#18', 'm_freediver': 'underwater_woman#4', 'm_arm_dark': 'underwater_woman#9',
    'm_wave_spray': 'ocean_wave_crash#0', 'm_wave_close': 'ocean_wave_crash#11', 'm_wave_rocks': 'ocean_wave_crash#4',
    'm_pier_storm': 'stormy_sea_waves#0', 'm_foam_aerial': 'ocean_aerial#1', 'm_wake': 'ocean_aerial#14',
    'm_under_wave': 'bubbles_underwater#8', 'm_under_break': 'bubbles_underwater#11', 'm_hand_bubbles': 'bubbles_underwater#12',
    'm_bubble_ring': 'bubbles_underwater#14', 'm_sun_diver': 'bubbles_underwater#19', 'm_redmoon': 'blood_moon#3',
    'm_redmoon_trees': 'blood_moon#11', 'm_moon_sea': 'moon_night_sea#7', 'm_moon_clouds': 'moon_night_sea#0',
    'm_jelly_red': 'jellyfish#8', 'm_jelly_glow': 'jellyfish#11', 'm_jelly_dark': 'aquarium_silhouette#2',
    'm_aquarium_she': 'aquarium_silhouette#6', 'm_pool_plunge': 'swimming_pool_underwater#9', 'm_pool_pull': 'swimming_pool_underwater#2',
    'm_tokyo_rain': 'tokyo_night#17', 'm_shinjuku': 'tokyo_night#19', 'm_hand_shell': 'hand_water#2', 'm_hand_reach': 'hand_water#13',
    'm_iris': 'green_eyes#1', 'm_eye': 'woman_face_close_up#0', 'm_lips_kiss': 'red_lips#12', 'm_lips_pop': 'red_lips#19',
    'm_rower': 'rowboat_sea#1', 'm_rowboat_blue': 'rowboat_sea#4', 'm_she_sea': 'woman_standing_beach#12',
    'm_ocean_pool': 'night_swimming#4', 'm_dark_water': 'rowboat_sea#10',
    # rawpixel copies of photos StockSnap refuses to serve, and a few more
    'm_couple2': 'underwater_woman#13', 'm_freediver2': 'underwater_woman#14', 'm_curl2': 'bubbles_underwater#17',
    'm_walk_turq': 'underwater_woman#15', 'm_jelly_dark2': 'aquarium_silhouette#11', 'm_aquarium_crowd': 'aquarium_silhouette#7',
    'm_aquarium_child': 'aquarium_silhouette#9', 'm_tokyo_skyline': 'tokyo_night#0', 'm_ginza': 'tokyo_night#1',
    'm_shibuya': 'tokyo_night#2', 'm_alley': 'tokyo_night#18', 'm_bubbles_green': 'bubbles_underwater#13',
    'm_bubbles_sun': 'bubbles_underwater#18', 'm_pool_two': 'swimming_pool_underwater#14', 'm_pool_caustic': 'swimming_pool_underwater#13',
}
mf = os.path.join(SRC, 'manifest_modern.json')
man = json.load(open(mf, encoding='utf-8')) if os.path.exists(mf) else {}
only = set(sys.argv[1:])
for name, key in PICK.items():
    if only and name not in only: continue
    if name in man and os.path.exists(os.path.join(SRC, name + '.jpg')):
        continue
    c = cand.get(key)
    if not c:
        print('!! no candidate', key); continue
    ok = False
    for i in range(5):
        try:
            data = urllib.request.urlopen(urllib.request.Request(c['url'], headers=UA), timeout=90).read()
            open(os.path.join(SRC, name + '.jpg'), 'wb').write(data)
            ok = True
            break
        except urllib.error.HTTPError as e:
            print('  http', e.code, name); time.sleep(4 * (i + 1))
        except Exception as e:
            print('  err', e, name); time.sleep(3 * (i + 1))
    if not ok:
        print('!! failed', name); continue
    man[name] = dict(title=c.get('title'), creator=c.get('creator'), license=(c.get('license') or '').upper() + ' ' + (c.get('license_version') or ''),
                     source=c.get('source'), page=c.get('foreign_landing_url'), size=[c.get('width'), c.get('height')])
    json.dump(man, open(mf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('ok', name, len(data) // 1024, 'KB', c.get('source'))
    time.sleep(0.6)
