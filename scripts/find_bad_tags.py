import re

with open(r"d:\PlantaAgro\credito\index.html", "r", encoding="utf-8") as f:
    c = f.read()

print("--- Searching DOMContentLiteSpeedLoaded ---")
for m in re.finditer(r'DOMContentLiteSpeedLoaded', c):
    idx = m.start()
    print("Found at:", idx)
    print(c[max(0, idx-80):min(len(c), idx+180)])
    print("="*40)

print("\n--- Searching aria-hidden with backslashes ---")
for m in re.finditer(r'aria-hidden=[^\s>]+', c):
    val = m.group(0)
    if "\\" in val or "&quot;" in val or '""' in val:
        idx = m.start()
        print("Found bad aria at:", idx, repr(val))
        print(c[max(0, idx-60):min(len(c), idx+100)])
        print("="*40)
