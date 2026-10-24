import re

with open(r"d:\PlantaAgro\credito\index.html", "r", encoding="utf-8") as f:
    c = f.read()

print("--- 1. Checking aria-hidden ---")
bad_aria = []
for m in re.finditer(r'aria-hidden=[^\s>]+', c):
    val = m.group(0)
    if '\"true\"' in val or '&quot;' in val or '\\' in val:
        bad_aria.append(val)
print("Bad aria-hidden count:", len(bad_aria), bad_aria)

print("\n--- 2. Checking target=_blank without noopener ---")
missing_noopener = []
for m in re.finditer(r'<a\s+[^>]*target=[\"\']_blank[\"\'][^>]*>', c):
    tag = m.group(0)
    if 'noopener' not in tag:
        missing_noopener.append(tag)
print("Missing noopener count:", len(missing_noopener), missing_noopener)

print("\n--- 3. Checking empty ruleset ;}{} ---")
print("Has ;}{}:", ";}{}" in c)

print("\n--- 4. Checking range input label ---")
idx = c.find('id="simRangeParcelas"')
if idx != -1:
    print("Range tag snippet:", c[idx-30:idx+150])

print("\n--- 5. Checking dead scripts ---")
print("Has wp.i18n:", "wp.i18n" in c)
print("Has elementorFrontendConfig:", "elementorFrontendConfig" in c)
print("Has DOMContentLiteSpeedLoaded:", "DOMContentLiteSpeedLoaded" in c)

print("\n--- 6. Checking remaining inline styles in simulator ---")
card_start = c.find('id="plantae-simulator-card"')
card_end = c.find('</script>', card_start)
card_html = c[card_start:card_end]
inline_styles = re.findall(r'style=\"[^\"]*\"', card_html)
print("Simulator inline styles count:", len(inline_styles))
for s in inline_styles:
    print("  Style:", s)
