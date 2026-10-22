with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# 1. Exact fix for the 4 broken nav-menu occurrences:
nav0_bad = 'data-settings="{" submenu_icon":{"value":"<i="" fa-angle-down\\"="" aria-hidden="true">&lt;\\/i&gt;","library":"fa-solid"},"layout":"horizontal","toggle":"burger"}" data-widget_type="nav-menu.default"&gt;'
nav0_good = 'data-settings=\'{"submenu_icon":{"value":"&lt;i class=\\"fas fa-angle-down\\" aria-hidden=\\"true\\"&gt;&lt;/i&gt;","library":"fa-solid"},"layout":"horizontal","toggle":"burger"}\' data-widget_type="nav-menu.default">'

nav1_bad = 'data-settings="{" layout":"vertical","submenu_icon":{"value":"<i="" fa-chevron-down\\"="" aria-hidden="true">&lt;\\/i&gt;","library":"fa-solid"}}" data-widget_type="nav-menu.default"&gt;'
nav1_good = 'data-settings=\'{"layout":"vertical","submenu_icon":{"value":"&lt;i class=\\"fas fa-chevron-down\\" aria-hidden=\\"true\\"&gt;&lt;/i&gt;","library":"fa-solid"}}\' data-widget_type="nav-menu.default">'

content = content.replace(nav0_bad, nav0_good)
content = content.replace(nav1_bad, nav1_good)

# 2. Clean all other corrupted data-settings="{" ... }"="" into data-settings='{...}'
# Pattern: data-settings="(\{.*?\})"=""
def clean_setting(match):
    json_body = match.group(1).strip()
    # If starts with {" , clean to {"
    json_body = re.sub(r'^\{\s+', '{', json_body)
    return f"data-settings='{json_body}'"

content = re.sub(r'data-settings="(\{[^>]*?\})"(="")?', clean_setting, content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete!")
