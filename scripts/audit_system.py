import os
import re

def check_file(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()
    urls = re.findall(r'url\([\'"]?(https?://[^\)\'"]+)', c)
    srcs = re.findall(r'src=[\'"](https?://[^\'"]+)', c)
    return urls + srcs

external = []
for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith(('.html', '.css', '.js')):
            fp = os.path.join(root, file)
            exts = check_file(fp)
            if exts:
                external.append((fp, exts))

print(f"Files with external URLs: {len(external)}")
for fp, urls in external:
    print(f"\n{fp}:")
    for u in sorted(set(urls)):
        print(f"   -> {u}")
