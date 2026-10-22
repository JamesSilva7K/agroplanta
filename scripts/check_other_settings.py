with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# find all `data-settings="{" ... }"=""`
pattern = r'data-settings="(\{[^>]*?\})"(="")?'
matches = re.findall(pattern, content)
print("Matches found for corrupted data-settings:", len(matches))
for m in matches[:5]:
    print("MATCH:", m)
