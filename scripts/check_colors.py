with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re
root_match = re.search(r':root\s*\{[^}]*\}', content)
if root_match:
    print("Found :root:")
    print(root_match.group(0)[:500])

color_vars = re.findall(r'--e-global-color-[a-zA-Z0-9_-]+:\s*#[a-fA-F0-9]{3,8}', content)
print("Color vars found:", color_vars)
