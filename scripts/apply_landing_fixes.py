import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the simulator section
pattern_sim = re.compile(
    r'\r?\n<!-- =+ -->\r?\n<!-- PLANTAE AGROCRÉDITO - SIMULADOR INTELIGENTE.*?-->\r?\n<!-- =+ -->\r?\n\r?\n<section id="simulador-credito".*?</section>\r?\n',
    re.DOTALL
)

new_content, n_sim = pattern_sim.subn('\n', content)
print(f"Simulator section removed: {n_sim} occurrence(s)")

# 2. Update the CTA FAÇA UMA SIMULAÇÃO button link
target_cta = 'href="/r/whatsapp?action=cta_faca_simulacao"'
replacement_cta = 'href="/consulta"'
if target_cta in new_content:
    new_content = new_content.replace(target_cta, replacement_cta)
    print("FAÇA UMA SIMULAÇÃO button link updated to /consulta")
else:
    print("Warning: target_cta not found")

# 3. Insert Marco Aurélio's avatar
marco_target = '<div class="elementor-element elementor-element-4142a4c e-con-full e-flex e-con e-child" data-id="4142a4c" data-element_type="container" data-e-type="container">'
marco_avatar = (
    '<div class="elementor-element elementor-element-4142a4c e-con-full e-flex e-con e-child" data-id="4142a4c" data-element_type="container" data-e-type="container">'
    '<div class="elementor-element testimonial-avatar-marco elementor-widget elementor-widget-image" data-element_type="widget" data-widget_type="image.default">'
    '<div class="elementor-widget-container"><picture>'
    '<img src="images/plantae-marco-aurelio.png" loading="lazy" decoding="async" width="96" height="96" class="attachment-full size-full" alt="Marco Aurélio Nicolela">'
    '</picture></div></div>'
)

if marco_target in new_content:
    new_content = new_content.replace(marco_target, marco_avatar, 1)
    print("Marco Aurélio avatar inserted into Depoimentos")
else:
    print("Warning: marco_target not found")

# 4. Enhance lazyload background observer so background images on cards and hero load immediately
old_lazyload = "const events=['DOMContentLiteSpeedLoaded','elementor/lazyload/observe',];events.forEach((event)=>{document.addEventListener(event,lazyloadRunObserver)})"
new_lazyload = (
    "const events=['DOMContentLoaded','DOMContentLiteSpeedLoaded','elementor/lazyload/observe','load'];"
    "events.forEach((event)=>{document.addEventListener(event,lazyloadRunObserver)});"
    "if(document.readyState!=='loading'){lazyloadRunObserver();}"
)

if old_lazyload in new_content:
    new_content = new_content.replace(old_lazyload, new_lazyload, 1)
    print("Lazyload script updated for non-WordPress static environments")
else:
    print("Warning: old_lazyload script pattern not found")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("index.html updated successfully!")
