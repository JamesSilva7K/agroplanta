import re
import json
from bs4 import BeautifulSoup # if installed, otherwise regex/html.parser
from html.parser import HTMLParser

with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Let's collect links
links = []
for m in re.finditer(r'<a\s+([^>]*?)href=["\']([^"\']*)["\']([^>]*)>(.*?)</a>', html, re.DOTALL | re.IGNORECASE):
    attrs_before = m.group(1)
    href = m.group(2)
    attrs_after = m.group(3)
    inner_text = re.sub(r'<[^>]+>', ' ', m.group(4)).strip()
    links.append({
        'href': href,
        'text': inner_text[:100],
        'raw_tag': m.group(0)[:200]
    })

# Scripts
scripts = []
for m in re.finditer(r'<script([^>]*)>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
    attrs = m.group(1)
    src_match = re.search(r'src=["\']([^"\']*)["\']', attrs, re.IGNORECASE)
    src = src_match.group(1) if src_match else None
    content = m.group(2).strip()
    scripts.append({
        'src': src,
        'content_preview': content[:200] if content else ''
    })

# Forms
forms = []
for m in re.finditer(r'<form([^>]*)>(.*?)</form>', html, re.DOTALL | re.IGNORECASE):
    attrs = m.group(1)
    forms.append({
        'attrs': attrs,
        'content_preview': m.group(2)[:200]
    })

# Buttons
buttons = []
for m in re.finditer(r'<button([^>]*)>(.*?)</button>', html, re.DOTALL | re.IGNORECASE):
    buttons.append({
        'attrs': m.group(1),
        'text': re.sub(r'<[^>]+>', ' ', m.group(2)).strip()[:100]
    })

# External domains referenced
domains = set(re.findall(r'https?://[a-zA-Z0-9\.\-]+', html))

print(f"Total links: {len(links)}")
print(f"Total scripts: {len(scripts)}")
print(f"Total forms: {len(forms)}")
print(f"Total buttons: {len(buttons)}")
print(f"External domains found ({len(domains)}):")
for d in sorted(domains):
    print(" -", d)

print("\n--- SAMPLE LINKS ---")
unique_hrefs = {}
for l in links:
    h = l['href']
    if h not in unique_hrefs:
        unique_hrefs[h] = []
    unique_hrefs[h].append(l['text'])

for h, texts in unique_hrefs.items():
    print(f"Href: {h} | Occurrences: {len(texts)} | Sample text: {texts[0]}")

print("\n--- SCRIPTS ---")
for i, s in enumerate(scripts):
    print(f"Script #{i+1}: src={s['src']} | preview={s['content_preview'][:100]}")
