import re

with open(r"d:\PlantaAgro\credito\index.html", "r", encoding="utf-8") as f:
    c = f.read()

anchors = re.findall(r'<a\s+[^>]*>.*?</a>', c, flags=re.DOTALL)
print(f"Total anchors in credito/index.html: {len(anchors)}")

for i, a in enumerate(anchors):
    m_href = re.search(r'href=[\"\']([^\"\']*)[\"\']', a)
    href = m_href.group(1) if m_href else ""
    text = re.sub(r'<[^>]+>', '', a).strip()
    if not text:
        # Check if img inside
        img = re.search(r'<img[^>]*src=[\"\']([^\"\']*)[\"\']', a)
        text = f"[IMG: {img.group(1)}]" if img else "[EMPTY/ICON]"
    print(f"{i+1:02d}. href='{href}' | text='{text}'")
