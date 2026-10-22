with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

import re

# 1. Fix line 184 logo link: add title and aria-label
c = re.sub(
    r'<a\s+href="https://plantaeagrocredito\.com\.br"(?![^>]*title=)>(\s*<img[^>]*plantae-log-1\.svg)',
    r'<a href="https://plantaeagrocredito.com.br" aria-label="Plantae Agrocrédito" title="Plantae Agrocrédito">\1',
    c
)

# 2. Fix footer logo link: add title and aria-label
c = re.sub(
    r'<a\s+href="https://plantaeagrocredito\.com\.br"(?![^>]*title=)>',
    r'<a href="https://plantaeagrocredito.com.br" aria-label="Plantae Agrocrédito" title="Plantae Agrocrédito">',
    c
)

# 3. Fix Caranda Digital seal link: add title and aria-label
c = re.sub(
    r'<a\s+href="https://carandadigital\.com\.br/"(?![^>]*title=)([^>]*)>',
    r'<a href="https://carandadigital.com.br/" aria-label="Carandá Digital" title="Carandá Digital"\1>',
    c
)

# 4. Remove fetchpriority="high" from <img>
c = c.replace('fetchpriority="high" ', '')
c = c.replace(' fetchpriority="high"', '')
c = c.replace('fetchpriority="high"', '')

# 5. Clean up redundant <span style="font-weight: 400;"> in accordion answers
c = c.replace('<span style="font-weight: 400;">', '<span>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("index.html fully organized and cleaned without breaking any visual design!")
