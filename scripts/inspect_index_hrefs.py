import re

with open(r"d:\PlantaAgro\index.html", "r", encoding="utf-8") as f:
    c = f.read()

matches = re.findall(r'<a\s+[^>]*href=[\"\']([^\"\']+)[\"\'][^>]*>(?:(?!</a>).)*?</a>', c, flags=re.DOTALL)
print("--- Unique hrefs in index.html ---")
hrefs = set()
for h in re.findall(r'href=[\"\']([^\"\']+)[\"\']', c):
    if not h.startswith('#') and not h.startswith('data:'):
        hrefs.add(h)

for h in sorted(hrefs):
    print(" ", h)
