with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# 1. Fix the 4 specific broken nav-menu ones
nav0_bad = 'data-settings="{" submenu_icon":{"value":"<i="" fa-angle-down\\"="" aria-hidden="true">&lt;\\/i&gt;","library":"fa-solid"},"layout":"horizontal","toggle":"burger"}" data-widget_type="nav-menu.default"&gt;'
nav0_good = 'data-settings=\'{"submenu_icon":{"value":"&lt;i class=\\"fas fa-angle-down\\" aria-hidden=\\"true\\"&gt;&lt;/i&gt;","library":"fa-solid"},"layout":"horizontal","toggle":"burger"}\' data-widget_type="nav-menu.default">'

nav1_bad = 'data-settings="{" layout":"vertical","submenu_icon":{"value":"<i="" fa-chevron-down\\"="" aria-hidden="true">&lt;\\/i&gt;","library":"fa-solid"}}" data-widget_type="nav-menu.default"&gt;'
nav1_good = 'data-settings=\'{"layout":"vertical","submenu_icon":{"value":"&lt;i class=\\"fas fa-chevron-down\\" aria-hidden=\\"true\\"&gt;&lt;/i&gt;","library":"fa-solid"}}\' data-widget_type="nav-menu.default">'

print("nav0 found:", nav0_bad in content)
print("nav1 count:", content.count(nav1_bad))
