import os, json, urllib.parse, datetime

history_dir = r"C:\Users\ASUS\AppData\Roaming\Code\User\History"

for folder in os.listdir(history_dir):
    entries_file = os.path.join(history_dir, folder, 'entries.json')
    if os.path.exists(entries_file):
        try:
            with open(entries_file, encoding='utf-8') as f:
                data = json.load(f)
            url = urllib.parse.unquote(data.get('resource', ''))
            if 'attachment.routes.ts' in url:
                print(f"File: {url}")
                entries = data.get('entries', [])
                for e in entries[-10:]:  # last 10
                    ts = e.get('timestamp')
                    dt = datetime.datetime.fromtimestamp(ts/1000).strftime('%Y-%m-%d %H:%M:%S')
                    print(f"  {e.get('id')} / {ts} / {dt} / {e.get('source', '')}")
                    
                # Check contents for "204"
                for e in entries:
                    content_path = os.path.join(history_dir, folder, e.get('id'))
                    if os.path.exists(content_path):
                        with open(content_path, encoding='utf-8') as cf:
                            content = cf.read()
                            if '204:' in content or 'createSuccessResponseSchema' in content:
                                ts = e.get('timestamp')
                                dt = datetime.datetime.fromtimestamp(ts/1000).strftime('%Y-%m-%d %H:%M:%S')
                                print(f"    -> FOUND target pattern in {e.get('id')}! Timestamp: {dt}")
                print("-" * 50)
        except Exception as e:
            pass
