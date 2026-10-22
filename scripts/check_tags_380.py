with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

line380 = lines[379]

# Let's inspect line 380 by splitting on tags
import re
tags = re.findall(r'(<[^>]+>[^<]*)', line380)
print("Tag count:", len(tags))
for t in tags[:10]:
    print("TAG:", repr(t[:80]))
