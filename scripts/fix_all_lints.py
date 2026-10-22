import re

with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

# 1. Fix line 4: empty '{}' in CSS
c = c.replace('--widgets-spacing-column:20px;}{}', '--widgets-spacing-column:20px;}')

# 2. Fix line 22: add standard mask properties alongside -webkit-mask
c = c.replace(
    '-webkit-mask-image:url( images/circle.svg );-webkit-mask-size:contain;-webkit-mask-position:center center;-webkit-mask-repeat:no-repeat;',
    '-webkit-mask-image:url( images/circle.svg );-webkit-mask-size:contain;-webkit-mask-position:center center;-webkit-mask-repeat:no-repeat;mask-image:url( images/circle.svg );mask-size:contain;mask-position:center center;mask-repeat:no-repeat;'
)

# 3. Fix aria-hidden=\"true\" / aria-hidden=\"&quot;true&quot;\"
c = re.sub(r'aria-hidden=[\x22\x27]\\*(&quot;|\x22)true\\*(&quot;|\x22)[\x22\x27]', 'aria-hidden="true"', c)
c = c.replace('aria-hidden="\\&quot;true\\&quot;"', 'aria-hidden="true"')
c = c.replace('aria-hidden="\\"true\\""', 'aria-hidden="true"')

# 4. Fix data-elementor-settings broken attribute around line 377
# The malformed data-elementor-settings="{" a11y_navigation...}"=""
pattern = r'data-elementor-settings="\{\"\s*a11y_navigation[^"]*\}\"=\"\"'
replacement = 'data-elementor-settings=\'{"a11y_navigation":"yes","triggers":{"page_load_delay":1,"page_load":"yes"},"timing":{"times_times":1,"times_period":"day","times":"yes"}}\''
c = re.sub(pattern, replacement, c)

# In case the regex didn't catch the exact string, let's also do a direct substring fix:
broken_str = 'data-elementor-settings="{" a11y_navigation":"yes","triggers":{"page_load_delay":1,"page_load":"yes"},"timing":{"times_times":1,"times_period":"day","times":"yes"}}"=""'
fixed_str = 'data-elementor-settings=\'{"a11y_navigation":"yes","triggers":{"page_load_delay":1,"page_load":"yes"},"timing":{"times_times":1,"times_period":"day","times":"yes"}}\''
if broken_str in c:
    c = c.replace(broken_str, fixed_str)
    print("Fixed broken data-elementor-settings directly!")

# 5. Fix links with target="_blank" missing rel="noopener"
# If target="_blank" exists without rel= or without noopener
def fix_blank_link(m):
    tag = m.group(0)
    if 'rel=' in tag:
        if 'noopener' not in tag:
            tag = re.sub(r'rel=[\x22\x27]([^\x22\x27]*)[\x22\x27]', r'rel="\1 noopener noreferrer"', tag)
    else:
        tag = tag[:-1] + ' rel="noopener noreferrer">'
    return tag

c = re.sub(r'<a\s+[^>]*target=[\x22\x27]_blank[\x22\x27][^>]*>', fix_blank_link, c)

# 6. Add title / aria-label to icon links that lack discernible text
def add_discernible_text(m):
    tag = m.group(0)
    if 'title=' not in tag and 'aria-label=' not in tag:
        # Check href or content to determine sensible label
        label = "Acessar link"
        if 'instagram' in tag: label = "Acessar Instagram da Plantae Agrocrédito"
        elif 'facebook' in tag: label = "Acessar Facebook da Plantae Agrocrédito"
        elif 'linkedin' in tag: label = "Acessar LinkedIn da Plantae Agrocrédito"
        elif 'softsaaspif' in tag: label = "Ouvidoria e Canal de Denúncias"
        elif 'ib.plantae' in tag: label = "Acesse sua conta Plantae Internet Banking"
        elif 'popup' in tag: label = "Abrir menu"
        tag = tag[:-1] + f' aria-label="{label}" title="{label}">'
    return tag

c = re.sub(r'<a\s+[^>]*class=[\x22\x27][^\x22\x27]*elementor-icon[^\x22\x27]*[\x22\x27][^>]*>', add_discernible_text, c)

# 7. Remove unsupported speculationrules if present
c = re.sub(r'<script\s+type=[\x22\x27]speculationrules[\x22\x27]>.*?</script>\s*', '', c, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("All lints and syntax fixes applied successfully to index.html!")
