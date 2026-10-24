/**
 * Plantae Agrocrédito - Intelligent Tracking, Dynamic Theming & WhatsApp Routing Engine
 * Automatically tracks page inputs and exits, session duration, device types,
 * dynamically injects primary colors and banners configured by the Supreme Admin,
 * intercepts CTA clicks, routes to context-aware WhatsApp messages,
 * and monitors social media traffic.
 */

(function () {
  'use strict';

  // 1. Session & Timing Management
  const STORAGE_KEY = 'plantae_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = 'pl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  const pageStartTime = Date.now();
  let exitRecorded = false;

  // Parse UTM parameters
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source') || '';
  const utmMedium = urlParams.get('utm_medium') || '';
  const utmCampaign = urlParams.get('utm_campaign') || '';

  // Device detection
  function getDeviceType() {
    const width = window.innerWidth;
    const ua = navigator.userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(ua) || (width >= 768 && width <= 1024)) {
      return 'Tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua) || width < 768) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  // 2. Track Event via Beacon / Fetch
  function trackEvent(type, data = {}) {
    const duration = Math.max(0, Math.round((Date.now() - pageStartTime) / 1000));
    const payload = {
      type: type,
      session_id: sessionId,
      referrer: document.referrer || '',
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      device: getDeviceType(),
      os: navigator.platform || '',
      duration_seconds: duration,
      ...data
    };

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/track/event', blob);
      } else {
        fetch('/api/track/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {
      // Fallback silent
    }
  }

  // 3. Register Page Input (Visit) & Exit (Unload)
  window.addEventListener('DOMContentLoaded', function () {
    trackEvent('input', {
      action_key: 'page_view',
      button_text: document.title
    });
    applyDynamicThemeAndBanners();
    setupLinkInterceptors();
    initCreditSimulator();
    injectFloatingWhatsApp();
  });

  // Track Exits
  function recordExit() {
    if (exitRecorded) return;
    exitRecorded = true;
    trackEvent('exit', {
      action_key: 'page_exit',
      button_text: 'Saída da Página'
    });
  }

  window.addEventListener('beforeunload', recordExit);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      recordExit();
    }
  });

  let activeWhatsAppNumber = '5518981115624';

  // Intelligent Brazilian Phone Formatter
  function formatBrazilianPhone(raw) {
    if (!raw) return '(18) 98111-5624';
    const clean = String(raw).replace(/\D/g, '');
    let num = clean;
    if (num.startsWith('55') && num.length > 10) {
      num = num.substring(2);
    }
    if (num.length === 11) {
      return `(${num.substring(0, 2)}) ${num.substring(2, 7)}-${num.substring(7)}`;
    }
    if (num.length === 10) {
      return `(${num.substring(0, 2)}) ${num.substring(2, 6)}-${num.substring(6)}`;
    }
    return raw;
  }

  // Intelligent Synchronizer across DOM and Storage
  function syncPhoneDisplay(rawNumber) {
    if (!rawNumber) return;
    const clean = String(rawNumber).replace(/\D/g, '');
    if (!clean) return;

    activeWhatsAppNumber = clean;
    try {
      localStorage.setItem('plantae_synced_phone', clean);
    } catch (e) {}

    const formatted = formatBrazilianPhone(clean);

    // 1. Explicit ID / Data Attribute targets
    const explicitTargets = document.querySelectorAll('#plantae-atendimento-phone, [data-dynamic-phone], .plantae-phone-display');
    explicitTargets.forEach(function (el) {
      el.textContent = formatted;
    });

    // 2. Intelligent search in Elementor icon boxes for Atendimento
    const iconBoxes = document.querySelectorAll('.elementor-widget-icon-box');
    iconBoxes.forEach(function (box) {
      const title = box.querySelector('.elementor-icon-box-title');
      if (title && /atendimento/i.test(title.textContent)) {
        const desc = box.querySelector('.elementor-icon-box-description');
        if (desc) {
          desc.textContent = formatted;
          desc.setAttribute('data-dynamic-phone', 'true');
        }
        const links = box.querySelectorAll('a');
        links.forEach(function (link) {
          link.setAttribute('href', '/r/whatsapp?action=cta_atendimento_geral');
          link.setAttribute('title', 'Atendimento: ' + formatted);
        });
      }
    });

    // 3. Expose globally for other scripts & consultation page
    window.PlantaeConfig = window.PlantaeConfig || {};
    window.PlantaeConfig.whatsapp_number = clean;
    window.PlantaeConfig.formatted_phone = formatted;

    try {
      window.dispatchEvent(new CustomEvent('plantae:phone-updated', {
        detail: { raw: clean, formatted: formatted }
      }));
    } catch (e) {}
  }

  // Instant pre-render from cache to avoid visual delay
  try {
    const cachedPhone = localStorage.getItem('plantae_synced_phone');
    if (cachedPhone) {
      syncPhoneDisplay(cachedPhone);
    }
  } catch (e) {}

  // 4. Dynamic Theme, Phone & Banner Engine (Supreme Admin Customizations)
  function applyDynamicThemeAndBanners() {
    function processConfig(cfg) {
      if (!cfg) return;

      if (cfg.whatsapp_number) {
        syncPhoneDisplay(cfg.whatsapp_number);
      }

      const primary = cfg.primary_color || '#00A870';
      const secondary = cfg.secondary_color || '#013644';
      const accent = cfg.accent_color || '#006B59';

      // Inject / Update dynamic style tag
      let styleTag = document.getElementById('plantae-dynamic-theme-style');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'plantae-dynamic-theme-style';
        document.head.appendChild(styleTag);
      }

      styleTag.textContent = `
        :root {
          --e-global-color-primary: ${primary} !important;
          --e-global-color-secondary: ${secondary} !important;
          --e-global-color-accent: ${accent} !important;
        }
        .elementor-button:not(.elementor-element-ba0e491 .elementor-button),
        .elementor-button-link:not(.elementor-element-ba0e491 .elementor-button) {
          background-color: ${primary} !important;
          color: #FFFFFF !important;
        }
        .elementor-element .elementor-button:not(.elementor-element-ba0e491 .elementor-button):hover {
          background-color: ${accent} !important;
          color: #FFFFFF !important;
        }
        /* Header Buttons: Visual Identity Guarantee (Image 3) */
        .elementor-element-7cff2b1 .elementor-button,
        .elementor-element-7cff2b1 a.elementor-button {
          background-color: ${primary} !important;
          color: #FFFFFF !important;
          border: 1.5px solid ${primary} !important;
          border-radius: 8px !important;
          padding: 10px 18px !important;
        }
        .elementor-element-7cff2b1 .elementor-button .elementor-button-text {
          color: #FFFFFF !important;
          font-weight: 700 !important;
        }
        .elementor-element-7cff2b1 .elementor-button:hover {
          background-color: ${accent} !important;
          border-color: ${accent} !important;
          color: #FFFFFF !important;
        }
        .elementor-element-ba0e491 .elementor-button,
        .elementor-element-ba0e491 a.elementor-button {
          background-color: #FFFFFF !important;
          color: ${primary} !important;
          border: 1.5px solid ${primary} !important;
          border-radius: 8px !important;
          padding: 10px 18px !important;
        }
        .elementor-element-ba0e491 .elementor-button .elementor-button-text {
          color: ${primary} !important;
          font-weight: 700 !important;
        }
        .elementor-element-ba0e491 .elementor-button:hover {
          background-color: ${primary} !important;
          color: #FFFFFF !important;
        }
        .elementor-element-ba0e491 .elementor-button:hover .elementor-button-text {
          color: #FFFFFF !important;
        }
        .p-wa-btn {
          background: linear-gradient(135deg, ${primary} 0%, ${accent} 100%) !important;
          box-shadow: 0 4px 20px ${primary}77 !important;
        }
        .p-wa-tooltip {
          background: ${secondary} !important;
        }
        ${cfg.banner_slide_1 ? `.elementor-element-3a816aa .elementor-repeater-item-827dc45 .swiper-slide-bg { background-image: url("${cfg.banner_slide_1}") !important; }` : ''}
        ${cfg.banner_slide_2 ? `.elementor-element-3a816aa .elementor-repeater-item-545cebe .swiper-slide-bg { background-image: url("${cfg.banner_slide_2}") !important; }` : ''}
        ${cfg.banner_slide_3 ? `.elementor-element-3a816aa .elementor-repeater-item-592bb07 .swiper-slide-bg { background-image: url("${cfg.banner_slide_3}") !important; }` : ''}
        ${cfg.banner_slide_4 ? `.elementor-element-3a816aa .elementor-repeater-item-8657dfc .swiper-slide-bg { background-image: url("${cfg.banner_slide_4}") !important; }` : ''}
        ${cfg.banner_mobile ? `.elementor-element-486e352 .elementor-repeater-item-8657dfc .swiper-slide-bg { background-image: url("${cfg.banner_mobile}") !important; }` : ''}
      `;

      // Automatically sanitize and rewrite any remaining legacy links in DOM
      rewriteLegacyLinks();
    }

    fetch('/api/config')
      .then(function (res) {
        if (!res.ok) throw new Error('API config status ' + res.status);
        return res.json();
      })
      .then(processConfig)
      .catch(function () {
        // Fallback for static servers like Vercel
        fetch('/api/config.json')
          .then(function (r) {
            if (!r.ok) throw new Error('Static config status ' + r.status);
            return r.json();
          })
          .then(processConfig)
          .catch(function () {});
      });
  }

  // Rewrite any legacy external links on the page directly to smart router
  function rewriteLegacyLinks() {
    try {
      const anchors = document.querySelectorAll('a[href]');
      anchors.forEach(function (a) {
        const href = a.getAttribute('href') || '';
        const lowerHref = href.toLowerCase();
        const text = (a.textContent || '').trim();
        const lowerText = text.toLowerCase();

        // Keep ACESSE SUA CONTA / Internet Banking Portal clean & direct
        if (lowerHref.includes('ib.plantaeagrocredito') || /acesse\s+sua\s+conta/i.test(lowerText) || a.classList.contains('btn-acesse-conta')) {
          a.setAttribute('href', 'https://ib.plantaeagrocredito.com.br/');
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          return;
        }

        // Skip internal portals, legitimate anchors, and telephone/mail links
        if (lowerHref.includes('softsaaspif')) return;
        if (lowerHref.startsWith('#') || lowerHref.startsWith('tel:') || lowerHref.startsWith('mailto:')) return;
        if (lowerHref.includes('instagram.com') || lowerHref.includes('facebook.com') || lowerHref.includes('linkedin.com')) return;

        // If pointing to home or root, keep as "/"
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
        }
      });
    } catch (e) {}
  }

  // 5. Map Elements to Context Action Keys
  function getActionKeyForElement(el, href, text) {
    const lowerText = (text || '').toLowerCase();
    const lowerHref = (href || '').toLowerCase();

    // Check if href already provides an explicit action
    if (lowerHref.includes('/r/whatsapp')) {
      const match = lowerHref.match(/[?&]action=([^&#]+)/i);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }

    if (lowerText.includes('quero ser um parceiro')) return 'cta_quero_ser_parceiro';
    if (lowerText.includes('quero ser um cliente')) return 'cta_quero_ser_cliente';
    if (lowerText.includes('gerente')) return 'cta_falar_gerente';
    if (lowerText.includes('faça uma simulação') || lowerText.includes('faca uma simulacao')) return 'cta_faca_simulacao';
    if (lowerText.includes('simular crédito') || lowerText.includes('simule seu')) return 'cta_simular_credito';
    if (lowerText.includes('ler matérias') || lowerText.includes('na mídia') || lowerHref.includes('na-midia')) return 'cta_na_midia';
    if (lowerText.includes('quem somos') || lowerHref.includes('quem-somos')) return 'cta_quem_somos';
    if (lowerText.includes('orientação financeira') || lowerHref.includes('blog')) return 'cta_orientacao_financeira';
    if (lowerText.includes('correspondentes') || lowerHref.includes('correspondentes')) return 'cta_correspondentes';
    if (lowerText.includes('governança') || lowerHref.includes('governanca')) return 'cta_governanca';
    if (lowerText.includes('documentos') || lowerHref.includes('documentos')) return 'cta_documentos';
    if (lowerText.includes('consignagro') || lowerHref.includes('consignagro')) return 'cta_consignagro';
    if (lowerText.includes('seguro') || lowerHref.includes('seguros')) return 'cta_seguros';
    if (lowerText.includes('crédito rural') || lowerHref.includes('credito-rural')) return 'cta_credito_rural';
    if (lowerText.includes('solicite seu') || lowerText.includes('solicitar crédito') || lowerHref.includes('solicite-seu-credito')) return 'cta_simular_credito';
    if (lowerText.includes('atendimento') || lowerText.includes('fale conosco') || lowerHref.includes('fale-conosco')) return 'cta_atendimento_geral';

    if (lowerHref.includes('lp-whatsapp')) return 'cta_faca_simulacao';

    return 'cta_atendimento_geral';
  }

  // 6. Intercept CTAs and Route to WhatsApp or Simulator
  function setupLinkInterceptors() {
    document.addEventListener('click', function (e) {
      const target = e.target.closest('a, button');
      if (!target) return;

      const href = target.getAttribute('href') || '';
      const lowerHref = href.toLowerCase();
      const text = (target.textContent || '').trim();
      const lowerText = text.toLowerCase();

      // Check for ACESSE SUA CONTA / Internet Banking Portal (MUST NEVER REDIRECT TO WHATSAPP)
      const isAcesseConta = 
        lowerHref.includes('ib.plantaeagrocredito.com.br') ||
        target.classList.contains('btn-acesse-conta') ||
        target.closest('.btn-acesse-conta') ||
        /acesse\s+sua\s+conta/i.test(lowerText);

      if (isAcesseConta) {
        trackEvent('portal_access', {
          action_key: 'acesse_sua_conta',
          button_text: text || 'ACESSE SUA CONTA'
        });
        if (!target.getAttribute('href') || target.getAttribute('href') === '#' || target.getAttribute('href').includes('whatsapp')) {
          target.setAttribute('href', 'https://ib.plantaeagrocredito.com.br/');
        }
        target.setAttribute('target', '_blank');
        target.setAttribute('rel', 'noopener noreferrer');
        return; // Allow natural browser navigation directly to Internet Banking
      }

      // Check for Social Media Links
      if (lowerHref.includes('instagram.com')) {
        trackEvent('output_social', { action_key: 'instagram', button_text: 'Instagram' });
        return;
      }
      if (lowerHref.includes('linkedin.com')) {
        trackEvent('output_social', { action_key: 'linkedin', button_text: 'LinkedIn' });
        return;
      }
      if (lowerHref.includes('facebook.com')) {
        trackEvent('output_social', { action_key: 'facebook', button_text: 'Facebook' });
        return;
      }

      // Check for Simulation CTAs (Scrolls smoothly to the Simulator Card)
      const isSimulationCta = 
        lowerHref.includes('simule-seu-credito') ||
        lowerHref.includes('solicite-seu-credito') ||
        lowerHref.includes('#credit-simulator') ||
        /simular|simulaç/i.test(text);

      if (isSimulationCta && !target.closest('#credit-simulator-form') && !target.closest('#sim-result-box') && !target.closest('#plantae-simulator-card')) {
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
      }

      // Check for WhatsApp / Conversion CTAs
      const isConversionCta = 
        lowerHref.includes('/r/whatsapp') ||
        lowerHref.includes('lp-whatsapp') ||
        lowerHref.includes('plantaeagrocredito.com.br') ||
        target.classList.contains('elementor-button') ||
        /crédito|consignagro|seguro|falar com um gerente|atendimento|matérias|quem somos|orientação|governança|documentos|correspondentes/i.test(text);

      // Avoid intercepting internal authorized portals or privacy policy anchor
      if (lowerHref.includes('softsaaspif') || lowerHref.includes('ib.plantaeagrocredito')) return;
      if (href === '/' || lowerHref === '/' || lowerText === 'início' || lowerText === 'inicio' || lowerText === 'home' || target.closest('.logo-padrao')) return;
      if (lowerHref === '#' && !isConversionCta) return;
      if (lowerHref.startsWith('#content') || lowerHref.startsWith('#elementor-action')) return;
      if (lowerHref.includes('politica-de-privacidade') && !target.classList.contains('elementor-button')) return;

      if (isConversionCta) {
        e.preventDefault();
        const actionKey = getActionKeyForElement(target, href, text);

        // Track Output Event
        trackEvent('output_whatsapp', {
          action_key: actionKey,
          button_text: text || actionKey
        });

        // Request Dynamic Context WhatsApp URL
        const queryParams = new URLSearchParams({
          action: actionKey,
          btn: text.substring(0, 50),
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          sid: sessionId
        });

        fetch('/r/whatsapp?' + queryParams.toString(), {
          headers: { 'Accept': 'application/json' }
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data && data.redirect_url) {
              window.open(data.redirect_url, '_blank');
            } else {
              window.open('https://wa.me/' + activeWhatsAppNumber, '_blank');
            }
          })
          .catch(function () {
            window.open('https://wa.me/' + activeWhatsAppNumber, '_blank');
          });
      }
    }, true);
  }

  // 7. Intelligent Credit Simulator Engine (Matching Image 1 & Image 2)
  let countdownTimer = null;
  window._lastSimRedirectUrl = null;

  function scrollToSimulator() {
    const simSection = document.getElementById('simulador-credito');
    if (simSection) {
      simSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const card = document.getElementById('plantae-simulator-box');
      if (card) {
        card.classList.add('sim-highlight');
        setTimeout(function () { card.classList.remove('sim-highlight'); }, 1400);
      }
      const creditInput = document.getElementById('sim-credit-value');
      if (creditInput) {
        setTimeout(function () { creditInput.focus(); }, 600);
      }
    }
  }

  function formatBRLMask(val) {
    const digits = val.replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function initCreditSimulator() {
    const creditInput = document.getElementById('sim-credit-value');
    const installmentsInput = document.getElementById('sim-installments');
    const frequencySelect = document.getElementById('sim-frequency');

    if (!creditInput || !installmentsInput || !frequencySelect) return;

    // Real-Time Currency Mask
    creditInput.addEventListener('input', function (e) {
      const formatted = formatBRLMask(e.target.value);
      e.target.value = formatted;
      if (formatted) {
        creditInput.classList.remove('input-error');
        const err = document.getElementById('err-credit-value');
        if (err) err.textContent = '';
      }
    });

    installmentsInput.addEventListener('input', function () {
      installmentsInput.classList.remove('input-error');
      const err = document.getElementById('err-installments');
      if (err) err.textContent = '';
    });

    frequencySelect.addEventListener('change', function () {
      frequencySelect.classList.remove('input-error');
      const err = document.getElementById('err-frequency');
      if (err) err.textContent = '';
    });
  }

  window.handleSimulationSubmit = function (e) {
    if (e) e.preventDefault();

    const creditInput = document.getElementById('sim-credit-value');
    const installmentsInput = document.getElementById('sim-installments');
    const frequencySelect = document.getElementById('sim-frequency');
    const form = document.getElementById('credit-simulator-form');
    const resultBox = document.getElementById('sim-result-box');

    if (!creditInput || !installmentsInput || !frequencySelect) return false;

    // 1. Real Validations
    let hasError = false;

    const rawCredit = creditInput.value.replace(/\D/g, '');
    const numCredit = rawCredit ? parseInt(rawCredit, 10) / 100 : 0;
    if (!rawCredit || numCredit < 10000) {
      creditInput.classList.add('input-error');
      const err = document.getElementById('err-credit-value');
      if (err) err.textContent = 'Informe um valor mínimo de R$ 10.000,00';
      hasError = true;
    }

    const numInstallments = parseInt(installmentsInput.value, 10);
    if (!numInstallments || numInstallments < 1 || numInstallments > 120) {
      installmentsInput.classList.add('input-error');
      const err = document.getElementById('err-installments');
      if (err) err.textContent = 'Informe entre 1 e 120 parcelas';
      hasError = true;
    }

    const frequency = frequencySelect.value;
    if (!frequency || frequency === 'Selecione') {
      frequencySelect.classList.add('input-error');
      const err = document.getElementById('err-frequency');
      if (err) err.textContent = 'Selecione a frequência desejada';
      hasError = true;
    }

    if (hasError) return false;

    // 2. Intelligent Calculation Engine (Agro benchmarks)
    let rate = 0.0119; // Mensal (~1.19% a.m.)
    if (frequency === 'Semestral') rate = 0.0735;
    else if (frequency === 'Anual') rate = 0.152;
    else if (frequency === 'A definir') rate = 0.0119;

    let pmt = 0;
    try {
      pmt = numCredit * (rate / (1 - Math.pow(1 + rate, -numInstallments)));
    } catch (err) {
      pmt = numCredit / numInstallments;
    }

    const pmtFormatted = pmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedCredit = numCredit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 3. Populate Result View
    document.getElementById('res-credit-value').textContent = formattedCredit;
    document.getElementById('res-installments-freq').textContent = `${numInstallments} parcelas (${frequency})`;
    document.getElementById('res-parcel-val').textContent = `${pmtFormatted}*`;

    const submitBtn = document.getElementById('btn-simular');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>CALCULANDO...</span>';

    const payload = {
      credit_value: formattedCredit,
      installments: numInstallments,
      frequency: frequency,
      estimated_installment: pmtFormatted,
      session_id: sessionId,
      referrer: document.referrer || '',
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      device: getDeviceType()
    };

    fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>SIMULAR</span>';

        if (data && data.success) {
          window._lastSimRedirectUrl = data.redirect_url;

          // Transition to result box
          form.style.display = 'none';
          resultBox.style.display = 'block';

          // Countdown auto redirect
          let seconds = 3;
          const cdSpan = document.getElementById('countdown');
          if (cdSpan) cdSpan.textContent = seconds;

          if (countdownTimer) clearInterval(countdownTimer);
          countdownTimer = setInterval(function () {
            seconds--;
            if (cdSpan) cdSpan.textContent = seconds;
            if (seconds <= 0) {
              clearInterval(countdownTimer);
              window.finalizeSimulationWhatsApp();
            }
          }, 1000);
        } else {
          alert(data.error || 'Não foi possível registrar a simulação. Tente novamente.');
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>SIMULAR</span>';
        const waMsg = encodeURIComponent(`🌾 Olá! Simulação Plantae Agrocrédito: ${formattedCredit} em ${numInstallments}x (${frequency})`);
        window._lastSimRedirectUrl = `https://wa.me/5511999999999?text=${waMsg}`;
        form.style.display = 'none';
        resultBox.style.display = 'block';
      });

    return false;
  };

  window.finalizeSimulationWhatsApp = function () {
    if (countdownTimer) clearInterval(countdownTimer);
    if (window._lastSimRedirectUrl) {
      window.open(window._lastSimRedirectUrl, '_blank');
    } else {
      window.open('https://wa.me/5511999999999', '_blank');
    }
  };

  window.resetSimulationForm = function () {
    if (countdownTimer) clearInterval(countdownTimer);
    const form = document.getElementById('credit-simulator-form');
    const resultBox = document.getElementById('sim-result-box');
    if (form && resultBox) {
      resultBox.style.display = 'none';
      form.style.display = 'block';
      form.reset();
    }
  };

  // 7. Modern Floating WhatsApp Button
  function injectFloatingWhatsApp() {
    if (document.getElementById('plantae-wa-float')) return;

    const floatBtn = document.createElement('div');
    floatBtn.id = 'plantae-wa-float';
    floatBtn.innerHTML = `
      <a href="/consulta" class="p-wa-tooltip" title="Clique para fazer sua simulação">
        <span>Simular Crédito Rural 🌾</span>
      </a>
      <button class="p-wa-btn" aria-label="Falar no WhatsApp" title="Falar no WhatsApp">
        <svg viewBox="0 0 32 32" width="34" height="34" fill="#ffffff">
          <path d="M16 2C8.28 2 2 8.28 2 16c0 2.58.7 5.04 2.03 7.18L2 30l7.04-1.99C11.12 29.28 13.52 30 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.54c-2.22 0-4.38-.6-6.26-1.74l-.45-.27-4.64 1.31 1.33-4.52-.29-.47A11.45 11.45 0 014.54 16c0-6.32 5.14-11.46 11.46-11.46s11.46 5.14 11.46 11.46-5.14 11.54-11.46 11.54zm6.29-8.63c-.34-.17-2.04-1.01-2.36-1.12-.32-.12-.55-.17-.78.17-.23.35-.9 1.12-1.1 1.35-.2.23-.41.26-.75.09-.34-.17-1.45-.53-2.76-1.7-1.02-.91-1.71-2.03-1.91-2.37-.2-.35-.02-.53.15-.7.15-.15.35-.41.52-.61.17-.2.23-.35.35-.58.12-.23.06-.44-.03-.61-.09-.17-.78-1.89-1.07-2.58-.28-.68-.57-.59-.78-.6h-.67c-.23 0-.61.09-.93.44-.32.35-1.22 1.2-1.22 2.92s1.25 3.39 1.42 3.62c.17.23 2.45 3.75 5.95 5.25.83.36 1.48.57 1.99.73.84.27 1.6.23 2.2.14.67-.1 2.04-.83 2.33-1.64.29-.81.29-1.5.2-1.64-.08-.15-.31-.23-.65-.4z"/>
        </svg>
      </button>
    `;

    const styles = document.createElement('style');
    styles.textContent = `
      #plantae-wa-float {
        position: fixed;
        bottom: 26px;
        right: 26px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'Open Sans', -apple-system, sans-serif;
      }
      .p-wa-btn {
        width: 62px;
        height: 62px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00A870 0%, #008f5d 100%);
        border: none;
        box-shadow: 0 4px 20px rgba(0, 168, 112, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        animation: p-pulse 2.5s infinite;
      }
      .p-wa-btn:hover {
        transform: scale(1.12);
        box-shadow: 0 8px 25px rgba(0, 168, 112, 0.65);
      }
      .p-wa-tooltip {
        background: #013644;
        color: #ffffff;
        padding: 8px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(1, 54, 68, 0.3);
        white-space: nowrap;
        text-decoration: none;
        cursor: pointer;
        pointer-events: auto;
        animation: p-float 3s ease-in-out infinite;
        transition: background 0.2s ease, transform 0.2s ease;
      }
      .p-wa-tooltip:hover {
        background: #00A870;
        color: #ffffff;
      }
      @keyframes p-pulse {
        0% { box-shadow: 0 0 0 0 rgba(0, 168, 112, 0.6); }
        70% { box-shadow: 0 0 0 16px rgba(0, 168, 112, 0); }
        100% { box-shadow: 0 0 0 0 rgba(0, 168, 112, 0); }
      }
      @keyframes p-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      @media (max-width: 768px) {
        #plantae-wa-float { bottom: 18px; right: 18px; }
        .p-wa-tooltip { display: none; }
        .p-wa-btn { width: 56px; height: 56px; }
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(floatBtn);

    floatBtn.querySelector('.p-wa-btn').addEventListener('click', function () {
      trackEvent('output_whatsapp', {
        action_key: 'cta_whatsapp_flutuante',
        button_text: 'Botão Flutuante WhatsApp'
      });

      const queryParams = new URLSearchParams({
        action: 'cta_whatsapp_flutuante',
        btn: 'WhatsApp Flutuante',
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        sid: sessionId
      });

      fetch('/r/whatsapp?' + queryParams.toString(), {
        headers: { 'Accept': 'application/json' }
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.redirect_url) {
            window.open(data.redirect_url, '_blank');
          } else {
            window.open('https://wa.me/' + activeWhatsAppNumber, '_blank');
          }
        })
        .catch(function () {
          window.open('https://wa.me/' + activeWhatsAppNumber, '_blank');
        });
    });
  }
})();
