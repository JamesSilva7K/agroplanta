import re

print("--- 1. Updating credito/index.html navigation & links ---")
credito_path = r"d:\PlantaAgro\credito\index.html"
with open(credito_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Fix Logo links to point to "/"
html = re.sub(
    r'<a\s+href=[\"\']https?:\/\/plantaeagrocredito\.com\.br[\"\']\s+title=[\"\']Plantae Agrocrédito[\"\']\s+aria-label=[\"\']Plantae Agrocrédito[\"\']>',
    r'<a href="/" title="Plantae Agrocrédito" aria-label="Plantae Agrocrédito">',
    html
)
html = html.replace('href="https://plantaeagrocredito.com.br"', 'href="/"')

# 2. Fix Breadcrumbs "Home" to point to "/"
html = html.replace('<a href="https://plantaeagrocredito.com.br/">Home</a>', '<a href="/">Home</a>')

# 3. Fix Menu "Início" to point to "/"
html = html.replace('<a href="https://plantaeagrocredito.com.br/" class="elementor-item">Início</a>', '<a href="/" class="elementor-item">Início</a>')
html = html.replace('<a href="https://plantaeagrocredito.com.br/" class="elementor-item" tabindex="-1">Início</a>', '<a href="/" class="elementor-item" tabindex="-1">Início</a>')
html = html.replace('<a href="https://plantaeagrocredito.com.br/" class="elementor-item">Plantae Agrocrédito</a>', '<a href="/" class="elementor-item">Plantae Agrocrédito</a>')
html = html.replace('<a href="https://plantaeagrocredito.com.br/" class="elementor-item" tabindex="-1">Plantae Agrocrédito</a>', '<a href="/" class="elementor-item" tabindex="-1">Plantae Agrocrédito</a>')

# 4. Fix Submenu / Context WhatsApp Links
menu_replacements = [
    ('https://plantaeagrocredito.com.br/quem-somos/', '/r/whatsapp?action=cta_quem_somos'),
    ('https://plantaeagrocredito.com.br/blog/category/blog/', '/r/whatsapp?action=cta_orientacao_financeira'),
    ('https://plantaeagrocredito.com.br/governanca-corporativa/', '/r/whatsapp?action=cta_governanca'),
    ('https://plantaeagrocredito.com.br/documentos-e-publicacoes/', '/r/whatsapp?action=cta_documentos'),
    ('https://plantaeagrocredito.com.br/correspondentes/', '/r/whatsapp?action=cta_correspondentes'),
    ('https://plantaeagrocredito.com.br/na-midia/', '/r/whatsapp?action=cta_na_midia'),
    ('https://plantaeagrocredito.com.br/consignagro/', '/r/whatsapp?action=cta_consignagro'),
    ('https://plantaeagrocredito.com.br/seguros/', '/r/whatsapp?action=cta_seguros'),
    ('https://plantaeagrocredito.com.br/fale-conosco/', '/r/whatsapp?action=cta_atendimento_geral'),
    ('https://materiais.plantaeagrocredito.com.br/lp-whatsapp', '/r/whatsapp?action=cta_atendimento_geral'),
    # Crédito rural and solicite should scroll to simulator on this page
    ('https://plantaeagrocredito.com.br/credito-rural/', '#plantae-simulator-card'),
    ('https://plantaeagrocredito.com.br/solicite-seu-credito/', '#plantae-simulator-card'),
]

for old_url, new_url in menu_replacements:
    html = html.replace(f'href="{old_url}"', f'href="{new_url}"')

# 5. Fix SIMULAR CRÉDITO header buttons
html = html.replace(
    '<a class="elementor-button elementor-button-link elementor-size-sm btn-simular-credito" href="/credito">',
    '<a class="elementor-button elementor-button-link elementor-size-sm btn-simular-credito" href="#plantae-simulator-card">'
)
html = html.replace(
    '<a class="elementor-button elementor-size-sm elementor-animation-grow" role="button">',
    '<a class="elementor-button elementor-size-sm elementor-animation-grow" href="#plantae-simulator-card" role="button">'
)

# 6. Fix Cloudflare email protection with clean mailto
html = re.sub(
    r'<a\s+href=[\"\']/cdn-cgi/l/email-protection[^\"]*[\"\'][^>]*>.*?</a>',
    r'<a href="mailto:faleconosco@plantaeagrocredito.com.br" class="elementor-icon" tabindex="-1" aria-label="E-mail"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="29" viewBox="0 0 36 29" fill="none"><path d="M32.4 0.171387H3.6C1.62 0.171387 0.018 1.79139 0.018 3.77139L0 25.3714C0 27.3514 1.62 28.9714 3.6 28.9714H32.4C34.38 28.9714 36 27.3514 36 25.3714V3.77139C36 1.79139 34.38 0.171387 32.4 0.171387ZM32.4 25.3714H3.6V7.37139L18 16.3714L32.4 7.37139V25.3714ZM18 12.7714L3.6 3.77139H32.4L18 12.7714Z" fill="#BEFAE0"></path></svg></a>',
    html,
    count=1
)
html = html.replace(
    '<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="2244434e47414d4c4d51414d62524e434c5643474345504d415047464b564d0c414d4f0c4050">[email&nbsp;protected]</a>',
    '<a href="mailto:faleconosco@plantaeagrocredito.com.br">faleconosco@plantaeagrocredito.com.br</a>'
)

with open(credito_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Updated credito/index.html links successfully!")

print("\n--- 2. Updating js/tracker.js routing intelligence ---")
tracker_path = r"d:\PlantaAgro\js\tracker.js"
with open(tracker_path, "r", encoding="utf-8") as f:
    js = f.read()

# Replace rewriteLegacyLinks logic so it NEVER turns home links to #
old_rewrite_block = """        // If pointing to old landing pages or WordPress domain
        if (lowerHref.includes('plantaeagrocredito.com.br') || lowerHref.includes('lp-whatsapp')) {
          if (lowerHref.replace(/\/+$/, '') === 'https://plantaeagrocredito.com.br' || lowerHref === 'https://plantaeagrocredito.com.br/') {
            a.setAttribute('href', '#');
            return;
          }
          if (lowerHref.includes('simule') || lowerHref.includes('solicite')) {
            a.setAttribute('href', '#credit-simulator');
            return;
          }
          const actionKey = getActionKeyForElement(a, href, text);
          a.setAttribute('href', '/r/whatsapp?action=' + encodeURIComponent(actionKey));
        }"""

new_rewrite_block = """        // If pointing to home or root, keep as "/"
        if (lowerHref === '/' || lowerHref === '' || lowerText === 'início' || lowerText === 'inicio' || lowerText === 'home' || a.closest('.logo-padrao')) {
          a.setAttribute('href', '/');
          return;
        }

        // If pointing to old landing pages or WordPress domain
        if (lowerHref.includes('plantaeagrocredito.com.br') || lowerHref.includes('lp-whatsapp')) {
          if (lowerHref.replace(/\/+$/, '') === 'https://plantaeagrocredito.com.br' || lowerHref === 'https://plantaeagrocredito.com.br/') {
            a.setAttribute('href', '/');
            return;
          }
          if (lowerHref.includes('simule') || lowerHref.includes('solicite') || lowerHref.includes('credito-rural')) {
            a.setAttribute('href', '#plantae-simulator-card');
            return;
          }
          const actionKey = getActionKeyForElement(a, href, text);
          a.setAttribute('href', '/r/whatsapp?action=' + encodeURIComponent(actionKey));
        }"""

if old_rewrite_block in js:
    js = js.replace(old_rewrite_block, new_rewrite_block)
    print("Replaced old_rewrite_block in tracker.js")
else:
    print("WARNING: old_rewrite_block not found exactly, doing targeted replacement")
    js = js.replace("a.setAttribute('href', '#');", "a.setAttribute('href', '/');")

# In setupLinkInterceptors:
# 1. Exempt "/" and "Início" from interception
# 2. Smoothly scroll to #plantae-simulator-card if on simulation page
interceptor_update = """      // 1. Navigation back to Home / Início / Logo MUST proceed naturally
      if (href === '/' || lowerHref === '/' || lowerText === 'início' || lowerText === 'inicio' || lowerText === 'home' || target.closest('.logo-padrao')) {
        return; // Natural navigation to homepage
      }

      // 2. Internal portal links that MUST NOT be redirected to WhatsApp
      if (lowerHref.includes('softsaaspif') || lowerHref.includes('ib.plantaeagrocredito')) {
        return; // Opens client portal / ombudsman naturally
      }
      if (lowerHref.startsWith('mailto:') || lowerHref.startsWith('tel:')) {
        return; // Native mail / tel
      }"""

js = js.replace(
    "// Avoid intercepting internal authorized portals or privacy policy anchor\n      if (lowerHref.includes('softsaaspif') || lowerHref.includes('ib.plantaeagrocredito')) return;",
    "// Avoid intercepting internal authorized portals or privacy policy anchor\n      if (lowerHref.includes('softsaaspif') || lowerHref.includes('ib.plantaeagrocredito')) return;\n      if (href === '/' || lowerHref === '/' || lowerText === 'início' || lowerText === 'inicio' || lowerText === 'home' || target.closest('.logo-padrao')) return;"
)

# Smooth scroll on simulation page for simulation buttons
old_sim_check = """      if (isSimulationCta && !target.closest('#credit-simulator-form') && !target.closest('#sim-result-box')) {
        e.preventDefault();
        trackEvent('input_simulation_click', {
          action_key: 'cta_ir_para_consulta',
          button_text: text || 'Simular Crédito'
        });
        window.location.href = '/consulta';
        return;
      }"""

new_sim_check = """      if (isSimulationCta && !target.closest('#credit-simulator-form') && !target.closest('#sim-result-box') && !target.closest('#plantae-simulator-card')) {
        const simCard = document.getElementById('plantae-simulator-card');
        if (simCard) {
          e.preventDefault();
          trackEvent('input_simulation_click', {
            action_key: 'cta_scroll_simulador',
            button_text: text || 'Simular Crédito'
          });
          simCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        e.preventDefault();
        trackEvent('input_simulation_click', {
          action_key: 'cta_ir_para_credito',
          button_text: text || 'Simular Crédito'
        });
        window.location.href = '/credito';
        return;
      }"""

if old_sim_check in js:
    js = js.replace(old_sim_check, new_sim_check)
    print("Replaced old_sim_check in tracker.js")
else:
    print("WARNING: old_sim_check not found exactly")

with open(tracker_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Updated js/tracker.js successfully!")
