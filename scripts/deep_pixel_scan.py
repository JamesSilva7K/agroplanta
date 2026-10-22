with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

import re

print("--- SCANNING FOR ANY TRACKING KEYWORDS ---")
keywords = ['gtag', 'google', 'sitekit', 'pixel', 'fbq', 'facebook', 'clarity', 'hotjar', 'loader', 'telemetry', 'litespeed_docref', 'litespeed_vary', 'email-protection']

for kw in keywords:
    matches = list(re.finditer(re.escape(kw), c, re.IGNORECASE))
    print(f"Keyword '{kw}': {len(matches)} occurrences")
    for m in matches[:3]:
        start = max(0, m.start() - 60)
        end = min(len(c), m.end() + 60)
        snippet = c[start:end].replace('\n', ' ')
        print(f"   [Context]: ...{snippet}...")
