with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Let's inspect what patterns exist for data-settings
pattern = r'data-settings=\"(\{[^>]*?\})\"(=\"\")?'
matches = list(re.finditer(r'data-settings=\"\{.*?\}', content))
print("Found data-settings regex count:", len(matches))

# Specifically check the 4 nav-menu ones:
for i, m in enumerate(re.finditer(r'nav-menu\.default', content)):
    start = max(0, m.start() - 250)
    end = min(len(content), m.end() + 20)
    print(f"NAV {i}:", content[start:end])
