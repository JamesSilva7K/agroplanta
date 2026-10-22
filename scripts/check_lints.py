with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

import re

blank_links = re.findall(r'<a\s+[^>]*target=[\'"]_blank[\'"][^>]*>', c)
missing_noopener = [l for l in blank_links if 'noopener' not in l]
print(f"Total target=_blank links: {len(blank_links)}, Missing noopener: {len(missing_noopener)}")

aria_hidden = re.findall(r'aria-hidden=[\'"][^\'"]*[\'"]', c)
invalid_aria = [a for a in aria_hidden if 'true' not in a and 'false' not in a]
print(f"Invalid aria-hidden: {len(invalid_aria)}")

# Check for any lingering {} in CSS
css_empty = re.findall(r';\s*\{\s*\}', c)
print(f"Empty CSS blocks {{}}: {len(css_empty)}")
