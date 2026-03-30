import os
import json
import urllib.parse
from datetime import datetime

history_path = r"C:\Users\ASUS\AppData\Roaming\Code\User\History"
project_path = r"C:\Users\ASUS\Desktop\Modett\Expense Tracker Application\Expense Tracker"

target_files = [
    r"modules\bank-feed-sync\index.ts",
    r"modules\budget-management\index.ts",
    r"modules\event-outbox\index.ts",
    r"modules\expense-ledger\index.ts",
    r"modules\identity-workspace\index.ts",
    r"modules\notification-dispatch\index.ts",
    r"modules\receipt-vault\index.ts",
    r"modules\cost-allocation\index.ts",
    r"modules\categorization-rules\index.ts",
    r"modules\audit-compliance\index.ts",
    r"modules\budget-planning\index.ts",
    r"modules\policy-controls\index.ts",
    r"modules\approval-workflow\index.ts"
]

def find_and_restore():
    found_count = 0
    for file_hash in os.listdir(history_path):
        entries_file = os.path.join(history_path, file_hash, "entries.json")
        if not os.path.exists(entries_file):
            continue
            
        try:
            with open(entries_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            orig_url = data.get("resource", "")
            file_url = urllib.parse.unquote(orig_url)
            file_url_norm = file_url.replace("/", "\\")
            
            matched_target = None
            for target in target_files:
                if target in file_url_norm:
                    matched_target = target
                    break
                    
            if matched_target:
                entries = data.get("entries", [])
                if not entries:
                    continue
                
                # Sort entries by timestamp descending (newest first)
                entries.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
                
                for entry in entries:
                    content_file = os.path.join(history_path, file_hash, entry["id"])
                    if not os.path.exists(content_file):
                        continue
                        
                    with open(content_file, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    # You removed wildcard exports, so we look for versions BEFORE my git checkout.
                    # Usually, these versions have no "export * from"
                    # We also want to skip the currently broken one that was just created by git checkout 
                    if "export *" not in content and "export {" in content:
                        print(f"Recovered {matched_target} from history ({entry['id']})")
                        dest_path = os.path.join(project_path, matched_target)
                        with open(dest_path, "w", encoding="utf-8") as f:
                            f.write(content)
                        found_count += 1
                        break

        except Exception as e:
            continue
            
    print(f"Restored {found_count} files from local history.")

if __name__ == "__main__":
    find_and_restore()
