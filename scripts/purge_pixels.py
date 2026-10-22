with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

import re

# 1. Remove litespeed_docref script at head start
c = re.sub(r'<script\s+data-no-optimize="1">var\s+litespeed_docref=.*?</script>\s*', '', c)

# 2. Remove litespeed_vary script
c = re.sub(r'<script\s+data-no-optimize="1">var\s+litespeed_vary=.*?</script>\s*', '', c)

# 3. Remove google_gtagjs inline script block
c = re.sub(r'<script[^>]*id="google_gtagjs-js-after"[^>]*>.*?</script>', '', c, flags=re.DOTALL)

# 4. Remove googlesitekit content events inline script
c = re.sub(r'<script[^>]*>\s*window\._googlesitekit\s*=.*?</script>', '', c, flags=re.DOTALL)

# 5. Remove any leftover HTML comments mentioning GTM / RD
c = re.sub(r'<!--\s*Legacy GTM.*?(?:-->)', '', c)
c = re.sub(r'<!--\s*Legacy RD.*?(?:-->)', '', c)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("Purge completed successfully!")
