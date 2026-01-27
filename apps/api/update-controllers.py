#!/usr/bin/env python3
import re
import sys

def update_controller(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import if not present
    if 'ResponseHelper' not in content:
        # Find the last import statement
        imports_end = content.rfind('import ')
        if imports_end != -1:
            line_end = content.find('\n', imports_end)
            content = (content[:line_end + 1] +
                      'import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";\n' +
                      content[line_end + 1:])

    # Replace error: any with error: unknown
    content = re.sub(r'catch \(error: any\)', 'catch (error: unknown)', content)

    # Replace error handling blocks
    replacement = '} catch (error: unknown) {\n      return ResponseHelper.error(reply, error)\n    }'

    # Pattern 1: error.message with semicolon
    pattern1 = r'\} catch \(error: unknown\) \{\s+return reply\.status\(\d+\)\.send\(\{\s+success: false,\s+statusCode: \d+,\s+message: error\.message,?\s+\}\);?\s+\}'
    content = re.sub(pattern1, replacement, content)

    # Pattern 2: error.message || 'fallback'
    pattern2 = r'\} catch \(error: unknown\) \{\s+return reply\.status\(\d+\)\.send\(\{\s+success: false,\s+statusCode: \d+,\s+message: error\.message \|\| [^\}]+\}\)\s+\}'
    content = re.sub(pattern2, replacement, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Updated {filepath}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python update-controllers.py <controller-file>")
        sys.exit(1)

    for filepath in sys.argv[1:]:
        update_controller(filepath)
