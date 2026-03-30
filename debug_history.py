import os, json
history_path = r"C:\Users\ASUS\AppData\Roaming\Code\User\History"
for file_hash in os.listdir(history_path):
    entries_file = os.path.join(history_path, file_hash, "entries.json")
    if os.path.exists(entries_file):
        with open(entries_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            url = data.get("resource", "")
            if "index.ts" in url and "bank-feed-sync" in url:
                print(f"Found: {url}")
                print(json.dumps(data, indent=2))
