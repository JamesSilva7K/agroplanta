import re

with open(r"d:\PlantaAgro\credito\index.html", "r", encoding="utf-8") as f:
    c = f.read()

print("--- Checking All Anchor Tags in credito/index.html ---")
matches = re.findall(r'<a\s+[^>]*>(?:(?!</a>).)*?</a>', c, flags=re.DOTALL)
print(f"Total <a> tags: {len(matches)}")
for m in matches:
    clean_tag = re.sub(r'\s+', ' ', m).strip()
    if any(k in clean_tag.lower() for k in ['início', 'inicio', 'home', 'plantae', 'simular', 'conta', 'atendimento', 'fale']):
        print("  Anchor:", clean_tag[:120])
