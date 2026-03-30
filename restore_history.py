import os
import json
import shutil
import time

history_path = r"C:\Users\ASUS\AppData\Roaming\Code\User\History"
project_path = r"C:\Users\ASUS\Desktop\Modett\Expense Tracker Application\Expense Tracker"

# The files we want to recover
target_files = [
    "modules/bank-feed-sync/index.ts",
    "modules/budget-management/index.ts",
    "modules/event-outbox/index.ts",
    "modules/expense-ledger/index.ts",
    "modules/identity-workspace/index.ts",
    "modules/notification-dispatch/index.ts",
    "modules/receipt-vault/index.ts",
    "modules/cost-allocation/index.ts",
    "modules/categorization-rules/index.ts",
    "modules/audit-compliance/index.ts"
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
                
            file_url = data.get("resource", "")
            # Check if this matched any of our target files
            matched_target = None
            for target in target_files:
                # normalize slashes for comparison
                normalized_target = target.replace("/", "\\")
                if normalized_target in file_url:
                    matched_target = target
                    break
                    
            if matched_target:
                entries = data.get("entries", [])
                if not entries:
                    continue
                    
                # We want the most recent entry that is NOT from the exact moment 
                # after I ran git checkout (which would have reinstated export *).
                # Actually, let's just look at the latest 5 entries, and read their content
                # to find one that DOES NOT have "export * from"
                
                # Sort entries by timestamp descending
                entries.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
                
                restored = False
                for entry in entries:
                    content_file = os.path.join(history_path, file_hash, entry["id"])
                    if not os.path.exists(content_file):
                        continue
                        
                    with open(content_file, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    # The user's changes REMOVED 'export *'. So if content does NOT have 'export *',
                    # and has the specific exports, it's the correct one!
                    if "export *" not in content and "export {" in content:
                        print(f"Recovering {matched_target} from history ({entry['id']})")
                        dest_path = os.path.join(project_path, matched_target.replace("/", os.sep))
                        with open(dest_path, "w", encoding="utf-8") as f:
                            f.write(content)
                        restored = True
                        found_count += 1
                        break
                        
                if not restored:
                    # Fallback to the latest one that isn't the current file content
                    pass
        except Exception as e:
            continue
            
    print(f"Restored {found_count} files.")

if __name__ == "__main__":
    find_and_restore()
