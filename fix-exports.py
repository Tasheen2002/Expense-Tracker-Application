import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content

    new_content = re.sub(
        r"export\s*\{\s*UserId,\s*WorkspaceId\s*\}\s*from\s*'(\.\./)+identity-workspace';",
        "export { WorkspaceId } from '\\g<1>identity-workspace/domain/value-objects/workspace-id.vo';\nexport { UserId } from '\\g<1>identity-workspace/domain/value-objects/user-id.vo';",
        new_content
    )

    new_content = re.sub(
        r"export\s*\{\s*ExpenseId,\s*CategoryId\s*\}\s*from\s*'(\.\./)+expense-ledger';",
        "export { ExpenseId } from '\\g<1>expense-ledger/domain/value-objects/expense-id.vo';\nexport { CategoryId } from '\\g<1>expense-ledger/domain/value-objects/category-id.vo';",
        new_content
    )

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('modules'):
    for file in files:
        if file.endswith('.ts'):
            process_file(os.path.join(root, file))
