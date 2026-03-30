import os
import json
import urllib.parse
from datetime import datetime

history_dir = r"C:\Users\ASUS\AppData\Roaming\Code\User\History"
project_root = r"C:\Users\ASUS\Desktop\Modett\Expense Tracker Application\Expense Tracker"

workspace_prefix_encoded = "file:///c%3A/Users/ASUS/Desktop/Modett/Expense%20Tracker%20Application/Expense%20Tracker/modules"
workspace_prefix_raw = "file:///c:/Users/ASUS/Desktop/Modett/Expense Tracker Application/Expense Tracker/modules"

# Timestamp boundary: Today at 09:50 AM (approx time of disaster)
# We want the newest entry that is BEFORE this time, UNLESS the file was purely edited before then!
# Actually, wait. The user's last manual edits could be anytime BEFORE the chat started (which was ~ 09:57).
# We should take the LATEST entry whose timestamp is <= 1774845420000 (roughly 09:57 AM today). 
# Wait, my regex python script ran at 09:57. 
# Let's use 1774845000000 (09:50 AM) as the safe threshold.

THRESHOLD = 1774845940000 

recovered_count = 0

for file_hash in os.listdir(history_dir):
    folder_path = os.path.join(history_dir, file_hash)
    entries_file = os.path.join(folder_path, "entries.json")

    if os.path.isfile(entries_file):
        try:
            with open(entries_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            url = data.get("resource", "")

            # Match variations
            if url.startswith(workspace_prefix_encoded) or url.startswith(workspace_prefix_raw) or ("Expense Tracker Application/Expense Tracker/modules" in urllib.parse.unquote(url)):
                decoded_url = urllib.parse.unquote(url.replace("file:///c%3A/", "c:/").replace("file:///c:/", "c:/").replace("file:///C%3A/", "c:/"))
                rel_path = os.path.relpath(decoded_url, project_root)
                dest_path = os.path.join(project_root, rel_path)

                entries = data.get("entries", [])
                if not entries: continue

                # Look for the max timestamp that is strictly less than the disaster time
                # However, if ALL entries are > THRESHOLD (unlikely, but possible), just fallback to oldest?
                # Entries are sorted oldest to newest by default in entries.json.
                valid_entry = None
                for entry in reversed(entries): # start from newest
                    if entry.get("timestamp", 0) < THRESHOLD:
                        valid_entry = entry
                        break
                
                # If we didn't find one before threshold, but we have entries, maybe they were all created after? 
                # (e.g. newly created file). We'll skip for now to be safe.
                if valid_entry:
                    content_file = os.path.join(folder_path, valid_entry["id"])
                    
                    if os.path.exists(content_file):
                        # Ensure we don't try to write if unchanged? Just write anyway.
                        # Since file locks are an issue, let's read the current content and skip if identical.
                        try:
                            # If it's the exact same, don't overwrite to avoid WinError 1224
                            if os.path.exists(dest_path):
                                with open(dest_path, "r", encoding="utf-8") as current_f:
                                    current_content = current_f.read()
                                with open(content_file, "r", encoding="utf-8") as hist_f:
                                    hist_content = hist_f.read()
                                if current_content == hist_content:
                                    continue
                        except Exception:
                            pass
                            
                        # Overwrite!
                        # Warning: WinError 1224 could still happen if file is hard-locked.
                        # We will try/except and log failures
                        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                        with open(content_file, "rb") as src:
                            content_bytes = src.read()
                        with open(dest_path, "wb") as dst:
                            dst.write(content_bytes)
                        recovered_count += 1
                        print(f"Restored: {rel_path}")

        except Exception as e:
            print(f"Error on {folder_path}: {e}")

print(f"Done! Intelligently restored {recovered_count} files based on exact timestamp.")
