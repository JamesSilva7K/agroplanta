with open('admin/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re
matches = list(re.finditer(r'style="([^"]*)"', content))
print("Found inline styles:", len(matches))
for i, m in enumerate(matches):
    print(f"{i+1}: {m.group(1)}")
