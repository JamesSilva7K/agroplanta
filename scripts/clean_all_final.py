import re

file_path = r"d:\PlantaAgro\credito\index.html"

with open(file_path, "r", encoding="utf-8") as f:
    c = f.read()

# 1. Remove picturefill LiteSpeed script
c = re.sub(r'<script type="text/javascript">document\.createElement\("picture"\);if\(!window\.HTMLPictureElement.*?</script>', '', c)

# 2. Fix broken data-settings on elementor nav-menu
# Case 1: horizontal nav menu
c = re.sub(
    r'data-settings=\"\{[^\"]*fa-angle-down[^\"]*\" data-widget_type=\"nav-menu\.default\"&gt;',
    r'data-settings=\'{"layout":"horizontal"}\' data-widget_type="nav-menu.default">',
    c
)
# Case 2: vertical nav menus
c = re.sub(
    r'data-settings=\"\{[^\"]*fa-chevron-down[^\"]*\" data-widget_type=\"nav-menu\.default\"&gt;',
    r'data-settings=\'{"layout":"vertical"}\' data-widget_type="nav-menu.default">',
    c
)

# 3. Clean up remaining inline styles in simulator
# Add extra CSS classes if needed
extra_css = """
.sim-hidden {
  display: none !important;
}
.sim-text-primary {
  color: #00A870 !important;
}
.sim-btn-whatsapp-cta {
  background: #00A870;
  font-size: 15px;
  padding: 15px 20px;
}
.sim-mb-4 {
  margin-bottom: 4px;
}
.sim-mb-14 {
  margin-bottom: 14px;
}
.sim-mt-10 {
  margin-top: 10px;
}
.sim-w-full {
  width: 100%;
}
.sim-btn-next-top0 {
  flex: 2;
  margin-top: 0;
}
"""

if ".sim-hidden" not in c:
    c = c.replace("</style>\n\n</head>", extra_css + "\n</style>\n\n</head>")

# Replace inline styles in simulator
c = c.replace('id="sim-step-2" style="display: none;"', 'id="sim-step-2" class="sim-hidden"')
c = c.replace('id="sim-step-3" style="display: none;"', 'id="sim-step-3" class="sim-hidden"')
c = c.replace('style="flex: 2; margin-top: 0;"', 'class="sim-btn-primary sim-btn-next-top0"')
c = c.replace('style="margin-bottom: 4px;"', 'class="sim-mb-4"')
c = c.replace('style="margin-bottom: 14px;"', 'class="sim-mb-14"')
c = c.replace('style="color: #00A870;"', 'class="sim-text-primary"')
c = c.replace('style="background: #00A870; font-size: 15px; padding: 15px 20px;"', 'class="sim-btn-primary sim-btn-whatsapp-cta"')
c = c.replace('style="margin-top: 10px;"', 'class="sim-btn-secondary sim-mt-10 sim-w-full"')
c = c.replace('style="width: 100%;"', 'class="sim-btn-primary sim-w-full"')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(c)

print("Clean all final completed successfully!")
