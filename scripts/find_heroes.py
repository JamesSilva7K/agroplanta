with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re
heroes = ['banner-davi', 'hero-1', 'hero-2', 'hero-3', 'plantae-hero-1-mb']
for h in heroes:
    matches = [m.start() for m in re.finditer(h, content)]
    print(f"Hero {h}: found at positions", matches)
    for pos in matches[:2]:
        start = max(0, pos - 100)
        end = min(len(content), pos + 100)
        print("  Snippet:", repr(content[start:end]))
