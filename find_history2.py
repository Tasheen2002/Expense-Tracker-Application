import os
import json
import urllib.parse

history_dir = r"C:\Users\ASUS\AppData\Roaming\Code\User\History"
target_string = 'export * from "./domain/entities";'

for root, dirs, files in os.walk(history_dir):
    for f in files:
        if f != 'entries.json':
            path = os.path.join(root, f)
            try:
                content = open(path, "r", encoding="utf-8").read()
                if target_string in content and "bank-connection-id" in content:
                    print(f"Found in {path}")
                    entries_path = os.path.join(root, 'entries.json')
                    if os.path.exists(entries_path):
                        data = json.load(open(entries_path, encoding='utf-8'))
                        print("Resource:", urllib.parse.unquote(data.get('resource','')))
            except:
                pass
