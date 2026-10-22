with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re
# check for &gt; right before <div or <p or <span
matches = re.findall(r'.{0,30}&gt;<.{0,30}', content)
for m in matches:
    print('AMP GT BEFORE TAG:', repr(m))

# check for data-settings="{"
matches2 = re.findall(r'.{0,30}data-settings="\{".{0,30}', content)
for m in matches2:
    print('BROKEN DATA-SETTINGS:', repr(m))
