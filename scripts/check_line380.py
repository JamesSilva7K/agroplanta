with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

line380 = lines[379] # 0-indexed line 380
print("Line 380 length:", len(line380))

import re
scripts = re.findall(r'<script[^>]*>(.*?)</script>', line380)
print("Found scripts on line 380:", len(scripts))

for i, s in enumerate(scripts):
    print(f"--- Script {i} length {len(s)} ---")
    print(s[:100], "...", s[-100:] if len(s) > 100 else "")
