/**
 * Plantae Agrocrédito - Advanced Telegram Bot Engine
 * Exclusivo Centro de Comando & Monitoramento via Telegram
 * Interface 100% orientada a botões interativos (Inline Keyboards) em Português.
 */

const { 
  getConfig, 
  setConfig, 
  getContextMessages, 
  getContextMessage, 
  updateContextMessage, 
  resetContextMessage,
  getRecentLeads,
  getSystemStats
} = require('../db');
const { getMetrics } = require('../analytics');
const { generate7DigitToken, revokeAllAdminSessions } = require('../security');

class TelegramBotService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || '';
    this.adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || getConfig('telegram_admin_id') || '';
    this.offset = 0;
    this.isPolling = false;
    this.userStates = {}; // chatId -> { state, data }
    this.keyboardInitialized = {}; // chatId -> boolean
    this.baseUrl = `https://api.telegram.org/bot${this.token}`;
    this.startTime = Date.now();
  }

  init() {
    if (!this.token) {
      console.log('⚠️ [Telegram Bot] Nenhum TELEGRAM_BOT_TOKEN configurado no .env. Bot rodando em modo simulação/webhook.');
      return;
    }
    console.log('🤖 [Telegram Bot] Iniciando serviço de polling do Telegram...');
    this.startPolling();
  }

  async apiCall(method, payload = {}) {
    if (!this.token) return null;
    try {
      const resp = await fetch(`${this.baseUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!data.ok) {
        console.error(`❌ [Telegram Bot] Erro na chamada ${method}:`, data.description);
      }
      return data;
    } catch (err) {
      console.error(`❌ [Telegram Bot] Erro de rede em ${method}:`, err.message);
      return null;
    }
  }

  async sendMessage(chatId, text, replyMarkup = null) {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    return await this.apiCall('sendMessage', payload);
  }

  async editMessage(chatId, messageId, text, replyMarkup = null) {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML'
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    return await this.apiCall('editMessageText', payload);
  }

  async answerCallback(callbackQueryId, text = null) {
    const payload = { callback_query_id: callbackQueryId };
    if (text) payload.text = text;
    return await this.apiCall('answerCallbackQuery', payload);
  }

  // Notificação instantânea ao administrador quando um lead clica para falar no WhatsApp
  async notifyLead(leadData) {
    const alertsActive = getConfig('bot_alerts_enabled') === '1';
    const targetChat = this.adminChatId || getConfig('telegram_admin_id');
    if (!alertsActive || !targetChat || !this.token) return;

    const devIcon = leadData.device === 'Mobile' ? '📱' : '💻';
    const msg = `🚨 <b>NOVO LEAD CAPTURADO NO SITE!</b> 🚨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 <b>Ação:</b> ${leadData.button_text || leadData.action_key}\n` +
      `📱 <b>Destino WhatsApp:</b> <code>+${leadData.whatsapp_number}</code>\n` +
      `💬 <b>Mensagem Contextual Gerada:</b>\n<i>"${leadData.whatsapp_message}"</i>\n\n` +
      `📍 <b>Origem / UTM:</b> ${leadData.utm_source || leadData.referrer || 'Acesso Direto'}\n` +
      `${devIcon} <b>Dispositivo:</b> ${leadData.device} (${leadData.browser || 'Navegador'})\n` +
      `⏰ <b>Horário:</b> ${new Date().toLocaleString('pt-BR')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '📊 Ver Métricas Atualizadas', callback_data: 'menu_metrics_24h' },
          { text: '📋 Ver Últimos Leads', callback_data: 'menu_recent_leads' }
        ],
        [
          { text: '⚙️ Painel de Controle', callback_data: 'menu_main' }
        ]
      ]
    };

    await this.sendMessage(targetChat, msg, inlineKeyboard);
  }

  // Teclado Fixo Inferior de Botões (Nunca requer digitação de comandos)
  getPersistentReplyKeyboard() {
    return {
      keyboard: [
        [
          { text: '🔐 Gerar Link Criptografado' },
          { text: '📊 Métricas em Tempo Real' }
        ],
        [
          { text: '📱 WhatsApp' },
          { text: '💬 Mensagens' },
          { text: '📋 Últimos Leads' }
        ],
        [
          { text: '🧹 Limpar Testes' },
          { text: '⚙️ Diagnóstico' },
          { text: '🌿 Menu Principal' }
        ]
      ],
      resize_keyboard: true,
      is_persistent: true
    };
  }

  // Menu Principal com Teclado de Botões
  getMainMenuKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '🔐 Gerar Link Criptografado do Admin', callback_data: 'action_get_admin_link' }
        ],
        [
          { text: '📊 Métricas em Tempo Real', callback_data: 'menu_metrics_24h' },
          { text: '📱 Configurar WhatsApp', callback_data: 'menu_whatsapp' }
        ],
        [
          { text: '💬 Mensagens Contextuais', callback_data: 'menu_messages' },
          { text: '🔀 Status do Redirecionamento', callback_data: 'menu_redirect_status' }
        ],
        [
          { text: '🌐 Origens & Dispositivos', callback_data: 'menu_devices' },
          { text: '🔔 Alertas de Leads', callback_data: 'menu_alerts' }
        ],
        [
          { text: '📋 Últimos Leads', callback_data: 'menu_recent_leads' },
          { text: '⚙️ Diagnóstico do Sistema', callback_data: 'menu_diagnostics' }
        ],
        [
          { text: '🧹 Limpar Métricas de Teste', callback_data: 'action_clear_metrics' },
          { text: '🔄 Revogar Sessões do Admin', callback_data: 'action_revoke_sessions' }
        ],
        [
          { text: '🧪 Testar Alerta de Lead', callback_data: 'action_test_lead' },
          { text: '🔄 Atualizar Menu', callback_data: 'menu_main_refresh' }
        ]
      ]
    };
  }

  async showMainMenu(chatId, messageId = null) {
    const waNumber = getConfig('whatsapp_number') || 'Não configurado';
    const isRedirectActive = getConfig('redirects_active') === '1';
    const isAlertsActive = getConfig('bot_alerts_enabled') === '1';
    const stats = getSystemStats();

    const text = `🌿 <b>CENTRO DE COMANDO — PLANTAE AGROCRÉDITO</b> 🌿\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Olá, Administrador! Gestão inteligente de tráfego, rastreamento de leads e controle de WhatsApp.\n\n` +
      `📞 <b>WhatsApp de Atendimento:</b> <code>+${waNumber}</code>\n` +
      `🔀 <b>Redirecionamento:</b> ${isRedirectActive ? '🟢 <b>ATIVADO</b>' : '🔴 <b>PAUSADO</b>'}\n` +
      `🔔 <b>Alertas Instantâneos:</b> ${isAlertsActive ? '🔔 <b>LIGADOS</b>' : '🔕 <b>DESLIGADOS</b>'}\n` +
      `📦 <b>Total de Leads Gerados:</b> <b>${stats.total_leads}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 <b>Navegação 100% por Botões:</b> Não precisa digitar comandos! Toque nos botões abaixo ou no teclado para interagir:`;

    const markup = this.getMainMenuKeyboard();
    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Visualização de Métricas e Porcentagens
  async showMetrics(chatId, messageId, hours = 24) {
    const data = getMetrics(hours);
    const s = data.summary;

    let timeLabel = 'Últimas 24 horas';
    if (hours === 168) timeLabel = 'Últimos 7 dias';
    if (hours === 720) timeLabel = 'Últimos 30 dias';

    let text = `📊 <b>RELATÓRIO DE MÉTRICAS (${timeLabel.toUpperCase()})</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📥 <b>ENTRADAS DE TRÁFEGO (INPUTS):</b>\n` +
      ` • Total de Visualizações: <b>${s.total_inputs}</b>\n` +
      ` • Visitantes Únicos: <b>${s.unique_inputs}</b>\n\n` +
      `📤 <b>SAÍDAS & CONVERSÕES (OUTPUTS):</b>\n` +
      ` • Conversões para WhatsApp: <b>${s.total_whatsapp_outputs}</b> (Únicos: ${s.unique_whatsapp_outputs})\n` +
      ` • Cliques em Redes Sociais: <b>${s.total_social_outputs}</b>\n` +
      ` • Total Geral de Saídas: <b>${s.total_outputs}</b>\n\n` +
      `📈 <b>ANÁLISE PERCENTUAL & CONVERSÃO:</b>\n` +
      ` • 🎯 <b>Taxa de Conversão WhatsApp:</b> <code>${s.whatsapp_conversion_rate}%</code>\n` +
      ` • 🌐 <b>Taxa de Conversão Global:</b> <code>${s.global_conversion_rate}%</code>\n\n`;

    if (data.cta_breakdown.length > 0) {
      text += `🏆 <b>CONVERSÕES POR PONTO DE CONTATO (CTAs):</b>\n`;
      data.cta_breakdown.slice(0, 5).forEach((cta, i) => {
        text += ` ${i + 1}. <i>${cta.button_text}:</i> <b>${cta.count}</b> (${cta.percentage}%)\n`;
      });
      text += '\n';
    }

    if (data.social_breakdown.length > 0) {
      text += `👥 <b>PERFORMANCE DE REDES SOCIAIS:</b>\n`;
      data.social_breakdown.forEach(soc => {
        text += ` • <i>${soc.name}:</i> <b>${soc.count}</b> cliques (${soc.percentage}%)\n`;
      });
      text += '\n';
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const markup = {
      inline_keyboard: [
        [
          { text: '🕒 24 Horas', callback_data: 'menu_metrics_24h' },
          { text: '📅 7 Dias', callback_data: 'menu_metrics_7d' },
          { text: '📆 30 Dias', callback_data: 'menu_metrics_30d' }
        ],
        [
          { text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }
        ]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Configuração do WhatsApp
  async showWhatsAppConfig(chatId, messageId) {
    const waNumber = getConfig('whatsapp_number') || '5511999999999';
    const text = `📱 <b>GERENCIAMENTO DO NÚMERO DE WHATSAPP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Todos os leads que clicarem em botões de simulação e crédito serão direcionados para este número.\n\n` +
      `📞 <b>Número Atual:</b> <code>+${waNumber}</code>\n` +
      `🔗 <b>Link Direto de Teste:</b> https://wa.me/${waNumber}\n\n` +
      `<i>Clique abaixo para alterar o número ou retornar.</i>`;

    const markup = {
      inline_keyboard: [
        [
          { text: '✏️ Alterar Número de WhatsApp', callback_data: 'action_change_whatsapp' }
        ],
        [
          { text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }
        ]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Menu de Mensagens Contextuais Inteligentes
  async showMessagesMenu(chatId, messageId) {
    const messages = getContextMessages();
    let text = `💬 <b>MENSAGENS CONTEXTUAIS INTELIGENTES</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Cada botão do site abre o WhatsApp com um texto sob medida para o objetivo do produtor rural.\n\n` +
      `<i>Selecione um botão abaixo para visualizar ou editar a mensagem:</i>`;

    const buttons = [];
    messages.forEach((m, idx) => {
      buttons.push([{
        text: `${idx + 1}. ${m.title}`,
        callback_data: `msg_view_${m.action_key}`
      }]);
    });

    buttons.push([{ text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }]);

    const markup = { inline_keyboard: buttons };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  async showMessageDetail(chatId, messageId, actionKey) {
    const item = getContextMessage(actionKey);
    if (!item) return;

    const text = `💬 <b>MENSAGEM: ${item.title.toUpperCase()}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔑 <b>Identificador:</b> <code>${item.action_key}</code>\n\n` +
      `📝 <b>Mensagem Atual:</b>\n` +
      `<i>"${item.current_message}"</i>\n\n` +
      `📌 <b>Mensagem Padrão Original:</b>\n` +
      `<i>"${item.default_message}"</i>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const markup = {
      inline_keyboard: [
        [
          { text: '✏️ Editar esta Mensagem', callback_data: `msg_edit_${actionKey}` },
          { text: '🔄 Restaurar Padrão', callback_data: `msg_reset_${actionKey}` }
        ],
        [
          { text: '⬅️ Voltar à Lista de Mensagens', callback_data: 'menu_messages' }
        ]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Dispositivos e Origens
  async showDevicesAndSources(chatId, messageId) {
    const metrics = getMetrics(24);
    const dev = metrics.device_stats;

    let text = `🌐 <b>DISPOSITIVOS & CANAIS DE ORIGEM (24H)</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📱 <b>DIVISÃO POR DISPOSITIVO:</b>\n` +
      ` • <b>Mobile (Celular):</b> ${dev.Mobile.inputs} visitas (${dev.Mobile.input_percentage}%) | Conversão: <b>${dev.Mobile.conversion_rate}%</b>\n` +
      ` • <b>Desktop (Computador):</b> ${dev.Desktop.inputs} visitas (${dev.Desktop.input_percentage}%) | Conversão: <b>${dev.Desktop.conversion_rate}%</b>\n` +
      ` • <b>Tablets:</b> ${dev.Tablet.inputs} visitas (${dev.Tablet.input_percentage}%)\n\n` +
      `📍 <b>CANAIS DE TRÁFEGO:</b>\n`;

    if (metrics.sources.length === 0) {
      text += ` • <i>Nenhum tráfego registrado nas últimas 24h</i>\n`;
    } else {
      metrics.sources.forEach(src => {
        text += ` • <b>${src.source}:</b> ${src.count} visitas (${src.percentage}%)\n`;
      });
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const markup = {
      inline_keyboard: [
        [{ text: '🔄 Atualizar', callback_data: 'menu_devices' }],
        [{ text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Status de Redirecionamento
  async showRedirectStatus(chatId, messageId) {
    const isActive = getConfig('redirects_active') === '1';
    const text = `🔀 <b>STATUS DOS REDIRECIONAMENTOS WHATSAPP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Estado atual: ${isActive ? '🟢 <b>ATIVADO E OPERACIONAL</b>' : '🔴 <b>PAUSADO (TRÁFEGO RETIDO)</b>'}\n\n` +
      `Quando ativado, os botões do site encaminham os leads instantaneamente para o WhatsApp com a mensagem contextual configurada.\n\n` +
      `<i>Alterne o estado utilizando o botão abaixo:</i>`;

    const markup = {
      inline_keyboard: [
        [
          { 
            text: isActive ? '⏸️ Pausar Redirecionamentos' : '▶️ Ativar Redirecionamentos', 
            callback_data: 'action_toggle_redirect' 
          }
        ],
        [
          { text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }
        ]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Status de Alertas
  async showAlertsStatus(chatId, messageId) {
    const isActive = getConfig('bot_alerts_enabled') === '1';
    const text = `🔔 <b>NOTIFICAÇÕES DE LEADS NO TELEGRAM</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Estado atual: ${isActive ? '🔔 <b>ALERTAS ATIVADOS</b>' : '🔕 <b>ALERTAS DESATIVADOS</b>'}\n\n` +
      `Quando ativado, você recebe uma notificação instantânea aqui no Telegram a cada clique para falar no WhatsApp com todos os detalhes do lead.\n\n` +
      `<i>Alterne o estado utilizando o botão abaixo:</i>`;

    const markup = {
      inline_keyboard: [
        [
          { 
            text: isActive ? '🔕 Desativar Notificações' : '🔔 Ativar Notificações', 
            callback_data: 'action_toggle_alerts' 
          }
        ],
        [
          { text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }
        ]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Lista dos Últimos Leads Capturados
  async showRecentLeads(chatId, messageId) {
    const leads = getRecentLeads(8);
    let text = `📋 <b>ÚLTIMOS LEADS CAPTURADOS NO WHATSAPP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (leads.length === 0) {
      text += `<i>Nenhum lead registrado no sistema até o momento.</i>\n`;
    } else {
      leads.forEach((ld, idx) => {
        const timeStr = new Date(ld.created_at).toLocaleString('pt-BR');
        const devIcon = ld.device === 'Mobile' ? '📱' : '💻';
        text += `<b>${idx + 1}. ${ld.button_text || ld.action_key}</b>\n` +
          ` • ⏰ ${timeStr} | ${devIcon} ${ld.device}\n` +
          ` • 📍 Origem: <code>${ld.utm_source || 'Direto / Orgânico'}</code>\n` +
          ` • 💬 <i>"${(ld.whatsapp_message || '').substring(0, 65)}..."</i>\n\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const markup = {
      inline_keyboard: [
        [{ text: '🔄 Atualizar Lista', callback_data: 'menu_recent_leads' }],
        [{ text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Diagnóstico & Saúde do Sistema
  async showDiagnostics(chatId, messageId) {
    const stats = getSystemStats();
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const mins = Math.floor((uptimeSeconds % 3600) / 60);
    const secs = uptimeSeconds % 60;
    const mem = process.memoryUsage();
    const memMB = (mem.heapUsed / 1024 / 1024).toFixed(1);

    const text = `⚙️ <b>DIAGNÓSTICO & SAÚDE DO SISTEMA</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🟢 <b>Status do Servidor:</b> 100% Operacional\n` +
      `⏱️ <b>Uptime:</b> ${hours}h ${mins}m ${secs}s\n` +
      `🧠 <b>Consumo de Memória:</b> ${memMB} MB\n` +
      `🗄️ <b>Banco de Dados:</b> SQLite Nativo (Node.js 24)\n\n` +
      `📦 <b>ESTATÍSTICAS TOTAIS ARMAZENADAS:</b>\n` +
      ` • Total de Eventos Processados: <b>${stats.total_events}</b>\n` +
      ` • Entradas (Pageviews): <b>${stats.total_inputs}</b>\n` +
      ` • Conversões de WhatsApp: <b>${stats.total_leads}</b>\n` +
      ` • Saídas para Redes Sociais: <b>${stats.total_social}</b>\n\n` +
      `🤖 <b>Status da Conexão Telegram:</b> Polling Ativo\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const markup = {
      inline_keyboard: [
        [{ text: '🔄 Atualizar Diagnóstico', callback_data: 'menu_diagnostics' }],
        [{ text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Envio de Link Criptografado Exclusivo do Admin (7 Dígitos na Rota)
  async sendEncryptedAdminLink(chatId, messageId = null) {
    const code = generate7DigitToken(24);
    const port = process.env.PORT || 8080;
    const appUrl = process.env.APP_URL || `http://localhost:${port}`;
    const directAdminUrl = `${appUrl}/${code}`;

    const text = `🔐 <b>ACESSO CRIPTOGRAFADO — SUPREME ADMIN</b> 🔐\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔑 <b>Código Criptográfico de 7 Dígitos:</b> <code>${code}</code>\n` +
      `⏳ <b>Validade da Rota:</b> 24 Horas\n` +
      `👤 <b>Autorização:</b> Administrador Supremo\n\n` +
      `A palavra "admin" foi 100% criptografada e oculta. Sua rota de acesso direto é composta exclusivamente pelo seu código criptográfico de 7 dígitos:\n\n` +
      `👉 <code>${directAdminUrl}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const markup = {
      inline_keyboard: [
        [
          { text: `🚀 Acessar Painel Criptografado (/${code})`, url: directAdminUrl }
        ],
        [
          { text: '🔄 Gerar Novo Código de 7 Dígitos', callback_data: 'action_get_admin_link' },
          { text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }
        ]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Limpeza de Métricas de Teste
  async handleClearMetrics(chatId, messageId = null) {
    const { db } = require('../db');
    db.prepare('DELETE FROM events').run();

    const text = `🧹 <b>MÉTRICAS DE TESTE ZERADAS COM SUCESSO!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Todos os registros de teste e acessos simulados foram excluídos do banco de dados.\n\n` +
      `📊 <b>Status Atual do Sistema:</b>\n` +
      ` • Visitas / Entradas: <b>0</b>\n` +
      ` • Saídas / WhatsApp: <b>0</b>\n` +
      ` • Taxa de Conversão: <b>0.00%</b>\n\n` +
      `O painel agora está limpo e começará a contabilizar exclusivamente visitantes reais de suas campanhas.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const markup = {
      inline_keyboard: [
        [
          { text: '📊 Ver Métricas (Zeradas)', callback_data: 'menu_metrics_24h' }
        ],
        [
          { text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }
        ]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // Revogação e Rotação de Sessões do Admin
  async handleRevokeSessions(chatId, messageId = null) {
    revokeAllAdminSessions();

    const text = `🔄 <b>TODAS AS SESSÕES FORAM REVOGADAS!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `A chave mestra criptográfica foi rotacionada com sucesso. Qualquer link ou token anterior foi imediatamente invalidado por segurança.\n\n` +
      `Para acessar o painel novamente, gere um novo link criptografado exclusivo no botão abaixo.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const markup = {
      inline_keyboard: [
        [
          { text: '🔐 Gerar Novo Link Criptografado', callback_data: 'action_get_admin_link' }
        ],
        [
          { text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }
        ]
      ]
    };

    if (messageId) {
      await this.editMessage(chatId, messageId, text, markup);
    } else {
      await this.sendMessage(chatId, text, markup);
    }
  }

  // --- POLLING & EVENT DISPATCHER ---
  async startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;

    while (this.isPolling) {
      try {
        const res = await this.apiCall('getUpdates', {
          offset: this.offset,
          timeout: 20
        });

        if (res && res.result && res.result.length > 0) {
          for (const update of res.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        }
      } catch (e) {
        console.error('Polling error:', e.message);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  async handleUpdate(update) {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const rawText = (msg.text || '').trim();
    const text = rawText.toLowerCase();

    if (!this.adminChatId) {
      this.adminChatId = String(chatId);
      setConfig('telegram_admin_id', String(chatId));
    }

    // Inicializa o teclado fixo de botões no Telegram do usuário na primeira interação
    if (!this.keyboardInitialized[chatId]) {
      this.keyboardInitialized[chatId] = true;
      await this.sendMessage(
        chatId,
        '🎛️ <b>PAINEL 100% CONTROLADO POR BOTÕES ATIVADO!</b>\n' +
        '<i>Todos os recursos agora são acessados por botões. Você não precisa digitar comandos (/), basta tocar nos botões:</i>',
        this.getPersistentReplyKeyboard()
      );
    }

    const userState = this.userStates[chatId];

    // State machine: Editing WhatsApp Number
    if (userState && userState.state === 'WAITING_WHATSAPP_NUMBER') {
      const cleanNum = rawText.replace(/\D/g, '');
      if (cleanNum.length < 10 || cleanNum.length > 15) {
        await this.sendMessage(
          chatId, 
          '⚠️ <b>Número inválido!</b> Digite o número com DDI e DDD (exemplo: <code>5511999999999</code>):'
        );
        return;
      }
      setConfig('whatsapp_number', cleanNum);
      delete this.userStates[chatId];
      await this.sendMessage(
        chatId, 
        `✅ <b>Número de WhatsApp atualizado com sucesso para:</b> <code>+${cleanNum}</code>`
      );
      await this.showMainMenu(chatId);
      return;
    }

    // State machine: Editing Context Message
    if (userState && userState.state === 'WAITING_MESSAGE_TEXT') {
      const actionKey = userState.actionKey;
      if (rawText.length < 5) {
        await this.sendMessage(chatId, '⚠️ Mensagem muito curta! Digite uma mensagem válida:');
        return;
      }
      updateContextMessage(actionKey, rawText);
      delete this.userStates[chatId];
      await this.sendMessage(chatId, `✅ <b>Mensagem contextual atualizada com sucesso!</b>`);
      await this.showMessageDetail(chatId, null, actionKey);
      return;
    }

    // Limpa estado anterior se o usuário tocou em outro botão
    delete this.userStates[chatId];

    // 1. Link Criptografado do Admin
    if (text.includes('link') || text.includes('criptografad') || text.includes('admin') || text.includes('acesso')) {
      await this.sendEncryptedAdminLink(chatId, null);
      return;
    }

    // 2. Métricas & Relatórios
    if (text.includes('métrica') || text.includes('metrica') || text.includes('relat') || text.includes('estatística')) {
      await this.showMetrics(chatId, null, 24);
      return;
    }

    // 3. WhatsApp
    if (text.includes('whatsapp') || text.includes('número') || text.includes('numero')) {
      await this.showWhatsAppConfig(chatId, null);
      return;
    }

    // 4. Mensagens Contextuais
    if (text.includes('mensagem') || text.includes('mensagens') || text.includes('abordagem')) {
      await this.showMessagesMenu(chatId, null);
      return;
    }

    // 5. Leads
    if (text.includes('lead') || text.includes('contato')) {
      await this.showRecentLeads(chatId, null);
      return;
    }

    // 6. Limpeza de Métricas
    if (text.includes('limpar') || text.includes('zerar') || text.includes('reset')) {
      await this.handleClearMetrics(chatId, null);
      return;
    }

    // 7. Diagnóstico do Sistema
    if (text.includes('diagnóstic') || text.includes('diagnostic') || text.includes('saúde') || text.includes('status')) {
      await this.showDiagnostics(chatId, null);
      return;
    }

    // 8. Alertas
    if (text.includes('alerta') || text.includes('notifica')) {
      await this.showAlertsStatus(chatId, null);
      return;
    }

    // 9. Redirecionamento
    if (text.includes('redirecionamento') || text.includes('roteador')) {
      await this.showRedirectStatus(chatId, null);
      return;
    }

    // 10. Origens & Dispositivos
    if (text.includes('dispositivo') || text.includes('origem') || text.includes('aparelho')) {
      await this.showDevicesAndSources(chatId, null);
      return;
    }

    // 11. Revogar Sessões
    if (text.includes('revogar')) {
      await this.handleRevokeSessions(chatId, null);
      return;
    }

    // 12. Testar Lead
    if (text.includes('testar') || text.includes('teste')) {
      const waNumber = getConfig('whatsapp_number') || '5511999999999';
      await this.notifyLead({
        button_text: 'Faça uma Simulação (Teste por Botão)',
        action_key: 'cta_faca_simulacao',
        whatsapp_number: waNumber,
        whatsapp_message: '🚜 Olá! Teste de lead disparado diretamente por botão no bot.',
        utm_source: 'telegram_button_test',
        device: 'Mobile',
        browser: 'Telegram Bot'
      });
      await this.sendMessage(chatId, '✅ <b>Alerta de lead de teste enviado com sucesso!</b>');
      return;
    }

    // Default: Apresenta o Menu Principal interativo com todos os botões
    await this.showMainMenu(chatId);
  }

  async handleCallbackQuery(cb) {
    const chatId = cb.message.chat.id;
    const messageId = cb.message.message_id;
    const data = cb.data;

    await this.answerCallback(cb.id);

    if (data === 'menu_main' || data === 'menu_main_refresh') {
      delete this.userStates[chatId];
      await this.showMainMenu(chatId, messageId);
      return;
    }

    if (data === 'menu_metrics_24h') {
      await this.showMetrics(chatId, messageId, 24);
      return;
    }
    if (data === 'menu_metrics_7d') {
      await this.showMetrics(chatId, messageId, 168);
      return;
    }
    if (data === 'menu_metrics_30d') {
      await this.showMetrics(chatId, messageId, 720);
      return;
    }

    if (data === 'menu_whatsapp') {
      await this.showWhatsAppConfig(chatId, messageId);
      return;
    }

    if (data === 'action_change_whatsapp') {
      this.userStates[chatId] = { state: 'WAITING_WHATSAPP_NUMBER' };
      await this.sendMessage(
        chatId,
        '✏️ <b>Digite o novo número de WhatsApp com DDI e DDD</b>\n' +
        '<i>Exemplo: 5511987654321 ou 5567999887766</i>\n\n' +
        'Envie a mensagem de texto agora:'
      );
      return;
    }

    if (data === 'menu_messages') {
      await this.showMessagesMenu(chatId, messageId);
      return;
    }

    if (data.startsWith('msg_view_')) {
      const actionKey = data.replace('msg_view_', '');
      await this.showMessageDetail(chatId, messageId, actionKey);
      return;
    }

    if (data.startsWith('msg_edit_')) {
      const actionKey = data.replace('msg_edit_', '');
      this.userStates[chatId] = { state: 'WAITING_MESSAGE_TEXT', actionKey: actionKey };
      const item = getContextMessage(actionKey);
      await this.sendMessage(
        chatId,
        `✏️ <b>Digite a nova mensagem para: "${item.title}"</b>\n\n` +
        `<i>Envie o texto como sua próxima mensagem:</i>`
      );
      return;
    }

    if (data.startsWith('msg_reset_')) {
      const actionKey = data.replace('msg_reset_', '');
      resetContextMessage(actionKey);
      await this.showMessageDetail(chatId, messageId, actionKey);
      return;
    }

    if (data === 'menu_devices') {
      await this.showDevicesAndSources(chatId, messageId);
      return;
    }

    if (data === 'menu_redirect_status') {
      await this.showRedirectStatus(chatId, messageId);
      return;
    }

    if (data === 'action_toggle_redirect') {
      const current = getConfig('redirects_active') === '1';
      setConfig('redirects_active', current ? '0' : '1');
      await this.showRedirectStatus(chatId, messageId);
      return;
    }

    if (data === 'menu_alerts') {
      await this.showAlertsStatus(chatId, messageId);
      return;
    }

    if (data === 'action_toggle_alerts') {
      const current = getConfig('bot_alerts_enabled') === '1';
      setConfig('bot_alerts_enabled', current ? '0' : '1');
      await this.showAlertsStatus(chatId, messageId);
      return;
    }

    if (data === 'menu_recent_leads') {
      await this.showRecentLeads(chatId, messageId);
      return;
    }

    if (data === 'menu_diagnostics') {
      await this.showDiagnostics(chatId, messageId);
      return;
    }

    if (data === 'action_get_admin_link') {
      await this.sendEncryptedAdminLink(chatId, messageId);
      return;
    }

    if (data === 'action_clear_metrics') {
      await this.handleClearMetrics(chatId, messageId);
      return;
    }

    if (data === 'action_revoke_sessions') {
      await this.handleRevokeSessions(chatId, messageId);
      return;
    }

    if (data === 'action_test_lead') {
      const waNumber = getConfig('whatsapp_number') || '5511999999999';
      await this.notifyLead({
        button_text: 'Faça uma Simulação (Teste)',
        action_key: 'cta_faca_simulacao',
        whatsapp_number: waNumber,
        whatsapp_message: '🚜 Olá! Vi as opções de financiamento no site da Plantae e quero simular as taxas e prazos para a minha produção.',
        utm_source: 'google_ads_safra (Simulação)',
        device: 'Mobile',
        browser: 'Chrome Mobile'
      });
      await this.sendMessage(chatId, '✅ <b>Alerta de lead de teste enviado com sucesso!</b>');
      return;
    }
  }
}

const telegramBot = new TelegramBotService();

module.exports = {
  telegramBot
};
