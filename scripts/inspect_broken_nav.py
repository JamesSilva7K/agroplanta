with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re
for i, m in enumerate(re.finditer(r'nav-menu\.default', content)):
    start = max(0, m.start() - 350)
    end = min(len(content), m.end() + 50)
    print(f"=== OCCURRENCE {i} ===")
    print(content[start:end])
