import re

file_path = r"d:\PlantaAgro\credito\index.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

original_len = len(content)
print(f"Original file length: {original_len}")

# 1. Fix CSS syntax error: empty ruleset ';}{}'
if ";}{}" in content:
    content = content.replace(";}{}", ";}")
    print("Fixed empty ruleset ;}{}")

# 2. Add Safari vendor prefixes
# user-select: none -> -webkit-user-select: none; user-select: none;
content = re.sub(r'(?<!-webkit-)user-select:\s*none;', '-webkit-user-select: none;\n  user-select: none;', content)
print("Updated user-select with -webkit prefix")

# backdrop-filter: blur(4px); -> -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
content = re.sub(r'(?<!-webkit-)backdrop-filter:\s*blur\(4px\);', '-webkit-backdrop-filter: blur(4px);\n  backdrop-filter: blur(4px);', content)
print("Updated backdrop-filter with -webkit prefix")

# 3. Fix broken aria-hidden inside data-settings attributes
# Notice instances like: aria-hidden="\"true\"" or aria-hidden="\&quot;true\&quot;"
content = re.sub(r'aria-hidden=[\"\\]*&quot;true&quot;[\"\\]*', 'aria-hidden="true"', content)
content = re.sub(r'aria-hidden=\"\\\"true\\\"\"', 'aria-hidden="true"', content)
content = re.sub(r'aria-hidden=\\\"true\\\"', 'aria-hidden="true"', content)
content = re.sub(r'aria-hidden="&quot;true&quot;"', 'aria-hidden="true"', content)
# Clean up mangled data-settings where it has <i="" fa-angle-down\"="" aria-hidden="\"true\"">
content = re.sub(r'data-settings=\"\{[^\"]*aria-hidden[^\"]*\"', '', content)
content = re.sub(r'aria-hidden=\"\"true\"\"', 'aria-hidden="true"', content)

# 4. Form element labels: range input
content = content.replace(
    '<input type="range" id="simRangeParcelas" min="1" max="60" value="6" style="flex: 1; accent-color: #00A870; cursor: pointer;">',
    '<input type="range" id="simRangeParcelas" min="1" max="60" value="6" class="sim-range-input" aria-label="Ajustar quantidade de parcelas" title="Ajustar quantidade de parcelas">'
)

# 5. Fix target="_blank" without rel="noopener noreferrer"
def fix_blank(m):
    tag = m.group(0)
    if 'rel=' not in tag:
        tag = tag.replace('target="_blank"', 'target="_blank" rel="noopener noreferrer"')
    else:
        # Check if noopener is present
        if 'noopener' not in tag:
            tag = re.sub(r'rel=[\"\']([^\"\']*)[\"\']', r'rel="\1 noopener noreferrer"', tag)
    return tag

content = re.sub(r'<a\s+[^>]*target=[\"\']_blank[\"\'][^>]*>', fix_blank, content)
print("Updated target=_blank links with rel='noopener noreferrer'")

# 6. Add title and aria-label to icon/image links without discernible text
# Logo links
content = content.replace(
    '<a href="https://plantaeagrocredito.com.br">\n<img  src="images/plantae-log-1.svg"',
    '<a href="https://plantaeagrocredito.com.br" title="Plantae Agrocrédito" aria-label="Plantae Agrocrédito">\n<img  src="images/plantae-log-1.svg"'
)
content = content.replace(
    '<a class="elementor-icon" href="#elementor-action%3Aaction%3Dpopup%3Aopen%26settings%3DeyJpZCI6IjM3NyIsInRvZ2dsZSI6ZmFsc2V9">',
    '<a class="elementor-icon" href="#menu-mobile" title="Abrir menu de navegação" aria-label="Abrir menu de navegação">'
)
content = content.replace(
    '<a href="https://carandadigital.com.br/" target="_blank" rel="noopener noreferrer">',
    '<a href="https://carandadigital.com.br/" target="_blank" rel="noopener noreferrer" title="Carandá Digital" aria-label="Carandá Digital">'
)

# Remove fetchpriority="high" to eliminate warning
content = content.replace('fetchpriority="high"', '')

# 7. Remove obsolete dead WordPress / LiteSpeed scripts at bottom (Script before/after, jQuery ui, etc.)
# Remove wp.i18n, jQuery.uiBackCompat, elementorFrontendConfig, etc.
dead_scripts_pattern = r'<script id="jquery-ui-core-js-before"[^>]*>.*?</script>\s*<script id="elementor-frontend-js-before"[^>]*>.*?</script>\s*<script id="wp-i18n-js-after"[^>]*>.*?</script>'
content = re.sub(dead_scripts_pattern, '', content, flags=re.DOTALL)

# Also remove lazyloadRunObserver and LiteSpeed comment block at end
litespeed_lazy_pattern = r'<script type="text/javascript">\(\(\)=>\{const lazyloadRunObserver.*?</script>'
content = re.sub(litespeed_lazy_pattern, '', content, flags=re.DOTALL)

footer_litespeed_comments = r'<!-- Page optimized by LiteSpeed Cache.*?QUIC\.cloud UCSS in queue -->'
content = re.sub(footer_litespeed_comments, '', content, flags=re.DOTALL)

# 8. Move inline CSS from simulator elements into the head style block
simulator_classes_css = """
/* Additional simulator classes to replace inline styles */
.sim-range-input {
  flex: 1;
  accent-color: #00A870;
  cursor: pointer;
}
.sim-parcelas-input {
  width: 100px;
  text-align: center;
  font-weight: 700;
}
.sim-flex-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.sim-loading-title {
  font-weight: 700;
  color: #013644;
  font-size: 15px;
}
.sim-loading-sub {
  font-size: 12px;
  color: #64748B;
  margin-top: 4px;
}
.sim-btn-row {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}
.sim-btn-back {
  flex: 1;
}
.sim-btn-next {
  flex: 2;
}
.sim-result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.sim-result-card {
  background: #F8FAFC;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #E2E8F0;
}
.sim-result-card-label {
  font-size: 11px;
  color: #64748B;
}
.sim-result-card-value {
  font-size: 14px;
  font-weight: 700;
  color: #013644;
}
"""

if "/* Additional simulator classes" not in content:
    content = content.replace("</style>\n\n</head>", simulator_classes_css + "\n</style>\n\n</head>")

# Replace inline styles inside simulator card
content = content.replace(
    '<div style="font-weight: 700; color: #013644; font-size: 15px;">Gerando Proposta Sob Medida...</div>',
    '<div class="sim-loading-title">Gerando Proposta Sob Medida...</div>'
)
content = content.replace(
    '<div style="font-size: 12px; color: #64748B; margin-top: 4px;">Sincronizando com a mesa de crédito</div>',
    '<div class="sim-loading-sub">Sincronizando com a mesa de crédito</div>'
)
content = content.replace(
    '<div style="display: flex; gap: 8px; align-items: center;">',
    '<div class="sim-flex-row">'
)
content = content.replace(
    'style="width: 100px; text-align: center; font-weight: 700;"',
    'class="sim-input sim-parcelas-input"'
)
content = content.replace(
    '<div style="display: flex; gap: 10px; margin-top: 15px;">',
    '<div class="sim-btn-row">'
)
content = content.replace(
    'style="flex: 1;"',
    'class="sim-btn-secondary sim-btn-back"'
)
content = content.replace(
    'style="flex: 2;"',
    'class="sim-btn-primary sim-btn-next"'
)
content = content.replace(
    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">',
    '<div class="sim-result-grid">'
)
content = content.replace(
    '<div style="background: #F8FAFC; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">\n          <div style="font-size: 11px; color: #64748B;">Total Financiado</div>\n          <div style="font-size: 14px; font-weight: 700; color: #013644;" id="resTotal">R$ 550.000,00</div>\n        </div>',
    '<div class="sim-result-card">\n          <div class="sim-result-card-label">Total Financiado</div>\n          <div class="sim-result-card-value" id="resTotal">R$ 550.000,00</div>\n        </div>'
)
content = content.replace(
    '<div style="background: #F8FAFC; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">\n          <div style="font-size: 11px; color: #64748B;">Prazo e Parcelas</div>\n          <div style="font-size: 14px; font-weight: 700; color: #013644;" id="resParcelas">6x Semestrais</div>\n        </div>',
    '<div class="sim-result-card">\n          <div class="sim-result-card-label">Prazo e Parcelas</div>\n          <div class="sim-result-card-value" id="resParcelas">6x Semestrais</div>\n        </div>'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Saved updated file!")
