import os, json
from datetime import datetime

history_dir = r'C:\Users\ASUS\AppData\Roaming\Code\User\History'
print('All route files edited recently (March 2026):')

found_today = []

for folder in os.listdir(history_dir):
    entries_file = os.path.join(history_dir, folder, 'entries.json')
    if os.path.exists(entries_file):
        try:
            with open(entries_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                resource = data.get('resource', '')
                if 'routes.ts' in resource:
                    for e in data.get('entries', []):
                        ts = e.get('timestamp')
                        if ts > 1774000000000:
                            found_today.append((ts, resource))
        except Exception:
            pass

found_today.sort(reverse=True)
seen = set()
for ts, res in found_today:
    name = os.path.basename(res)
    if name not in seen:
        print(f'{datetime.fromtimestamp(ts/1000).strftime("%Y-%m-%d %H:%M:%S")} - {name}')
        seen.add(name)
