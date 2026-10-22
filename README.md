# Plantae Agrocrédito — Central de Inteligência de Tráfego & Bot do Telegram

Sistema avançado, inteligente e de alta performance para auditoria, organização, rastreamento de tráfego (inputs/outputs), roteamento dinâmico para WhatsApp com mensagens contextuais personalizadas e **controle e monitoramento 100% exclusivo via Bot do Telegram acionado por botões interativos em português**.

---

## 📋 Sumário da Auditoria & Purga Completa de Pixels

Durante a varredura profunda em todo o sistema (`index.html`, estilos e scripts), **todos os pixels e códigos legados foram 100% erradicados**:

### 1. Pixels e Rastreadores Legados Removidos:
- **Google Tag Manager (GTM) / GA4 (`GT-WRGGHJ6`):** Eliminadas as tags remotas, linker de domínios e inicializadores do `window.dataLayer`.
- **Google Site Kit (`window._googlesitekit`):** Eliminados todos os listeners, buffers de eventos (`throttledEvents`) e metadados de telemetria.
- **RD Station CloudFront Loader:** Script externo de rastreamento de formulários desativado e removido.
- **Instrumentação de Cache do LiteSpeed:**
  - Removido `litespeed_docref` (manipulação do `document.referrer`).
  - Removido `litespeed_vary` (leitura de cookie de variação).
- **Dependências Remotas:**
  - `jquery.min.js`, `litespeed-bundle.js` e `picturefill.min.js` foram baixados para a pasta local [`js/`](file:///d:/saveweb2zip-com-plantaeagrocredito-com-br/js), garantindo que a página seja 100% autônoma, sem vazamento de tráfego para servidores WordPress de terceiros.
- **Email Cloudflare:** Substituído por link de contato limpo `mailto:contato@plantaeagrocredito.com.br`.

---

## 🤖 Centro de Comando Exclusivo via Bot do Telegram

Todo o gerenciamento, visualização de métricas e controle de redirecionamentos é operado **diretamente pelo Telegram**, sem necessidade de painel web exposto:

### Funcionalidades do Bot (em Português):
- 📊 **Métricas em Tempo Real:** Relatórios completos para 24h, 7 dias e 30 dias:
  - Total de visualizações e visitantes únicos (Inputs).
  - Conversões diretas de WhatsApp e cliques em Redes Sociais (Outputs).
  - Taxas percentuais de conversão (WhatsApp % e Global %).
  - Ranking dos CTAs/botões mais eficientes do site.
- 📱 **Configurar WhatsApp:** Exibe o número ativo e permite alteração instantânea pelo chat.
- 💬 **Mensagens Contextuais Inteligentes:** Gerenciador das 10 mensagens personalizadas do site (ver, editar e restaurar padrão).
- 🔀 **Gestor de Redirecionamentos:** Ligar ou pausar tráfego para WhatsApp com 1 toque.
- 🌐 **Origens & Dispositivos:** Métricas percentuais de Mobile vs Desktop e principais canais (Google, Meta, Orgânico, Direto).
- 🔔 **Alertas Instantâneos de Leads:** Notificação push com detalhes completos a cada produtor rural que clica para simular crédito:
  - Botão acionado
  - Número de WhatsApp de destino
  - Mensagem gerada
  - Canal de origem (UTM / Referrer)
  - Dispositivo e navegador
- 📋 **Últimos 10 Leads:** Histórico cronológico recente de conversões.
- ⚙️ **Diagnóstico do Sistema:** Saúde do banco SQLite, uptime, consumo de memória e total de eventos processados.
- 🧪 **Simulação de Teste:** Botão para testar o envio de alertas em tempo real.

---

## 🌾 Roteamento Inteligente & Mensagens Contextuais

Quando o lead clica em qualquer ponto de contato:
1. O rastreador em [`js/tracker.js`](file:///d:/saveweb2zip-com-plantaeagrocredito-com-br/js/tracker.js) intercepta o evento, registra a saída (`output_whatsapp`) e envia alerta push para o Telegram.
2. Abre o WhatsApp com a mensagem personalizada correspondente à ação:
   - **Simular Crédito:** *"🌾 Olá! Estive navegando no site da Plantae Agrocrédito e gostaria de solicitar uma Simulação de Crédito Rural personalizada para o meu agronegócio."*
   - **Banner Hero:** *"🚜 Olá! Vi as opções de financiamento no site da Plantae e quero simular as taxas e prazos para a minha produção."*
   - **Quero ser Cliente:** *"🌱 Olá! Tenho interesse em me tornar cliente da Plantae Agrocrédito e ter acesso a crédito ágil para o campo."*
   - **Quero ser Parceiro:** *"🤝 Olá! Sou consultor/correspondente do agro e gostaria de saber como me tornar um parceiro oficial da Plantae."*
   - **Falar com Gerente:** *"👨‍💼 Olá! Gostaria de conversar com um gerente de contas da Plantae Agrocrédito para atendimento exclusivo."*
   - **Crédito Rural:** *"🌾 Olá! Gostaria de consultoria sobre Crédito Rural para minha lavoura/safra."*
   - **ConsignAgro:** *"💼 Olá! Gostaria de informações sobre as condições especiais do ConsignAgro da Plantae."*
   - **Seguros:** *"🛡️ Olá! Gostaria de fazer uma cotação de Seguro Agrícola / Safra com a equipe Plantae."*
   - **Botão Flutuante:** *"🌾 Olá! Estou no site da Plantae Agrocrédito e gostaria de tirar algumas dúvidas pelo WhatsApp."*

---

## 📁 Estrutura Organizada do Repositório

```
d:/saveweb2zip-com-plantaeagrocredito-com-br/
├── css/                        # Estilos originais 100% preservados
├── fonts/                      # Fontes e ícones do Elementor
├── images/                     # Imagens e banners originais da Plantae
├── js/
│   ├── jquery.min.js           # jQuery local autônomo
│   ├── litespeed-bundle.js     # Bundle interativo local
│   ├── picturefill.min.js      # Polyfill local
│   └── tracker.js              # Rastreador de inputs/outputs e roteador WhatsApp
├── server/
│   ├── server.js               # Servidor Express com APIs e Roteador Dinâmico
│   ├── db.js                   # Banco de Dados nativo SQLite (Node 24)
│   ├── analytics.js            # Motor de cálculo de métricas e porcentagens
│   └── bot/
│       └── telegram_bot.js     # Centro de comando completo via Telegram Bot
├── data/
│   └── tracker.db              # Banco de dados persistente
├── scripts/                    # Scripts de auditoria e varredura
├── .env                        # Configurações do ambiente
├── .env.example
├── README.md                   # Documentação do sistema
└── package.json
```

---

## 🚀 Como Iniciar

1. Preencha as credenciais no arquivo [`.env`](file:///d:/saveweb2zip-com-plantaeagrocredito-com-br/.env):
   ```env
   PORT=8080
   DEFAULT_WHATSAPP_NUMBER=5511999999999
   TELEGRAM_BOT_TOKEN=seu_token_aqui
   TELEGRAM_ADMIN_CHAT_ID=
   ```
2. Inicie o sistema:
   ```bash
   npm start
   ```
3. Abra o seu bot no Telegram e envie `/start` ou `/menu`.
   O painel completo com teclados de botões será exibido para você!
