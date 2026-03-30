import os, json

history_dir = r"C:\Users\ASUS\AppData\Roaming\Code\User\History"
for root, dirs, files in os.walk(history_dir):
    for f in files:
        if f == 'entries.json':
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8') as data_file:
                    data = json.load(data_file)
                    res = data.get('resource', '')
                    if 'modules' in res and 'index.ts' in res:
                        print(f"File: {res}")
                        print(f"Path: {path}")
                        
                        entries = data.get('entries', [])
                        if entries:
                            latest_entry = entries[-1]
                            content_path = os.path.join(root, latest_entry['id'])
                            print(f"Latest Backup: {content_path}")
            except Exception as e:
                pass
