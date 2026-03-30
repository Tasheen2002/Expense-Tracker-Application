import os, json
history_dir = r'C:\Users\ASUS\AppData\Roaming\Code\User\History'
found_files = set()
for folder in os.listdir(history_dir):
    entries_file = os.path.join(history_dir, folder, 'entries.json')
    if os.path.exists(entries_file):
        try:
            with open(entries_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                resource = data.get('resource', '').lower()
                if resource.endswith('.routes.ts'):
                    for e in data['entries']:
                        with open(os.path.join(history_dir, folder, e.get('id')), 'r', encoding='utf-8') as cf:
                            text = cf.read()
                            if 'const' in text and 'Schema = {' in text.replace(' ', ''):
                                found_files.add(os.path.basename(resource))
        except Exception:
            pass
print("Files that EVER had Centralized Schemas defined:")
for f in sorted(found_files):
    print(f)
