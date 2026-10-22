import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search for all data-settings with nav-menu
matches = re.findall(r'data-settings="[^"]*nav-menu\.default[^>]*>', content)
print("Found direct matches:", len(matches))

# Let's find any occurrences of "nav-menu.default"
for i, m in enumerate(re.finditer(r'nav-menu\.default', content)):
    start = max(0, m.start() - 150)
    end = min(len(content), m.end() + 100)
    print(f"--- Occurrence {i} ---")
    print(repr(content[start:end]))
