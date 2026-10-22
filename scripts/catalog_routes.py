from bs4 import BeautifulSoup
import re
import json

with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Let's inspect all <a> tags
links_report = []
for m in re.finditer(r'<a\s+([^>]*?)>(.*?)</a>', html, re.DOTALL | re.IGNORECASE):
    attrs = m.group(1)
    text = re.sub(r'<[^>]+>', ' ', m.group(2)).strip()
    href_m = re.search(r'href=["\']([^"\']*)["\']', attrs)
    href = href_m.group(1) if href_m else ''
    class_m = re.search(r'class=["\']([^"\']*)["\']', attrs)
    cls = class_m.group(1) if class_m else ''
    id_m = re.search(r'id=["\']([^"\']*)["\']', attrs)
    tag_id = id_m.group(1) if id_m else ''
    links_report.append({
        'href': href,
        'text': text,
        'class': cls,
        'id': tag_id
    })

print(f"Total links: {len(links_report)}")
# Group by destination type
groups = {
    'whatsapp_conversion': [],
    'simulations_and_credit': [],
    'navigation': [],
    'social_media': [],
    'auth_external': [],
    'legal': [],
    'other': []
}

for l in links_report:
    h = l['href']
    t = l['text']
    if 'lp-whatsapp' in h or 'whatsapp' in h:
        groups['whatsapp_conversion'].append(l)
    elif 'simule' in h or 'solicite' in h or 'credito' in h or 'consignagro' in h or 'seguros' in h:
        groups['simulations_and_credit'].append(l)
    elif any(s in h for s in ['instagram', 'facebook', 'linkedin']):
        groups['social_media'].append(l)
    elif any(a in h for a in ['softsaaspif', 'ib.plantaeagrocredito']):
        groups['auth_external'].append(l)
    elif 'politica-de-privacidade' in h:
        groups['legal'].append(l)
    elif h.startswith('#') or 'quem-somos' in h or 'governanca' in h or 'documentos' in h or 'correspondentes' in h or 'na-midia' in h or 'fale-conosco' in h or 'blog' in h or h == 'https://plantaeagrocredito.com.br/':
        groups['navigation'].append(l)
    else:
        groups['other'].append(l)

for g, items in groups.items():
    print(f"\n=== GROUP: {g} ({len(items)} items) ===")
    seen = set()
    for item in items:
        key = (item['href'], item['text'])
        if key not in seen:
            seen.add(key)
            print(f"  - [{item['text']}] -> {item['href']} (class: {item['class'][:40]})")
