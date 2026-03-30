import os, json
history_dir = r'C:\Users\ASUS\AppData\Roaming\Code\User\History'
target = 'attachment.routes.ts'
for folder in os.listdir(history_dir):
    entries_file = os.path.join(history_dir, folder, 'entries.json')
    if os.path.exists(entries_file):
        try:
            with open(entries_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                resource = data.get('resource', '').lower()
                if target in resource:
                    for e in data['entries']:
                        with open(os.path.join(history_dir, folder, e.get('id')), 'r', encoding='utf-8') as cf:
                            if '204' in cf.read():
                                print(f'Found 204 in {target} at timestamp: {e.get(\"timestamp\")}')
        except Exception:
            pass
