import os
import json
import shutil
import urllib.parse

# Setup paths
history_dir = r"C:\Users\ASUS\AppData\Roaming\Code\User\History"
project_root = r"C:\Users\ASUS\Desktop\Modett\Expense Tracker Application\Expense Tracker"
workspace_prefix_encoded = "file:///c%3A/Users/ASUS/Desktop/Modett/Expense%20Tracker%20Application/Expense%20Tracker/modules"
workspace_prefix_raw = "file:///c:/Users/ASUS/Desktop/Modett/Expense Tracker Application/Expense Tracker/modules"

recovery_v1 = os.path.join(project_root, "RECOVERED_FILES", "Latest_Save")
recovery_v2 = os.path.join(project_root, "RECOVERED_FILES", "Previous_Save")

os.makedirs(recovery_v1, exist_ok=True)
os.makedirs(recovery_v2, exist_ok=True)

recovered_count = 0

for file_hash in os.listdir(history_dir):
    folder_path = os.path.join(history_dir, file_hash)
    entries_file = os.path.join(folder_path, "entries.json")
    
    if os.path.isfile(entries_file):
        try:
            with open(entries_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            url = data.get("resource", "")
            
            # Match variations of the file path in local history
            if url.startswith(workspace_prefix_encoded) or url.startswith(workspace_prefix_raw) or ("Expense Tracker Application/Expense Tracker/modules" in urllib.parse.unquote(url)):
                # Decode original file path
                decoded_url = urllib.parse.unquote(url.replace("file:///c%3A/", "c:/").replace("file:///c:/", "c:/").replace("file:///C%3A/", "c:/"))
                rel_path = os.path.relpath(decoded_url, project_root)
                
                entries = data.get("entries", [])
                if not entries: continue
                
                # Sort descending by timestamp
                entries.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
                
                valid_entries = []
                for entry in entries:
                    content_file = os.path.join(folder_path, entry["id"])
                    if os.path.exists(content_file):
                        valid_entries.append(content_file)
                
                if len(valid_entries) > 0:
                    dest_v1 = os.path.join(recovery_v1, rel_path)
                    os.makedirs(os.path.dirname(dest_v1), exist_ok=True)
                    shutil.copy2(valid_entries[0], dest_v1)
                    recovered_count += 1
                
                if len(valid_entries) > 1:
                    dest_v2 = os.path.join(recovery_v2, rel_path)
                    os.makedirs(os.path.dirname(dest_v2), exist_ok=True)
                    shutil.copy2(valid_entries[1], dest_v2)

        except Exception as e:
            pass

print(f"Extraction complete! Recovered {recovered_count} files into the 'RECOVERED_FILES' folder.")
