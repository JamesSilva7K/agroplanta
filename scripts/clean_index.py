import re
import shutil

# Make a pristine backup first
shutil.copyfile('index.html', 'index.html.bak')

with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Replace remote jQuery with local self-hosted jQuery
content = content.replace(
    'src="https://plantaeagrocredito.com.br/wp-includes/js/jquery/jquery.min.js"',
    'src="js/jquery.min.js"'
)

# 2. Replace remote litespeed bundle with local self-hosted bundle
content = re.sub(
    r'src="https://plantaeagrocredito\.com\.br/wp-content/litespeed/js/8b84b3967061323dbe9ede864c865d64\.js\?ver=181f5"',
    'src="js/litespeed-bundle.js"',
    content
)

# 3. Replace remote picturefill with local self-hosted picturefill
content = re.sub(
    r'https://plantaeagrocredito\.com\.br/wp-content/plugins/webp-express/js/picturefill\.min\.js',
    'js/picturefill.min.js',
    content
)

# 4. Remove legacy Google Tag Manager external script
content = re.sub(
    r'<script\s+src="https://www\.googletagmanager\.com/gtag/js\?id=GT-WRGGHJ6"[^>]*></script>',
    '<!-- Legacy GTM Removed: Managed via Plantae Smart Tracker Engine -->',
    content
)

# 5. Remove legacy GTM inline config script
content = re.sub(
    r'<script id="google_gtagjs-js-after">.*?</script>',
    '<!-- Legacy GTM inline config removed -->',
    content,
    flags=re.DOTALL
)

# 6. Remove RD Station CloudFront tracking script
content = re.sub(
    r'<script\s+type="text/javascript"\s+async\s+src="https://d335luupugsy2\.cloudfront\.net/js/loader-scripts/4b0c3fc0-e4ca-44a7-9770-1434e2af9c97-loader\.js"></script>',
    '<!-- Legacy RD Station Tracker Removed: Managed via Plantae Smart Tracker Engine -->',
    content
)

# 7. Fix Cloudflare email protection placeholder
content = content.replace(
    '/cdn-cgi/l/email-protection#3650575a535559585945555976465a575842575357514459554453525f42591855595b185444',
    'mailto:contato@plantaeagrocredito.com.br'
)
content = content.replace(
    '/cdn-cgi/l/email-protection#2741464b424448494854444867574b464953464246405548445542434e53480944484a094555',
    'mailto:contato@plantaeagrocredito.com.br'
)
content = re.sub(
    r'<a\s+href="/cdn-cgi/l/email-protection"[^>]*>.*?</a>',
    '<a href="mailto:contato@plantaeagrocredito.com.br">contato@plantaeagrocredito.com.br</a>',
    content
)

# 8. Inject our Plantae Smart Tracker script right before </body>
if 'js/tracker.js' not in content:
    content = content.replace(
        '</body>',
        '<!-- Plantae Agrocrédito Real-Time Tracking & Dynamic WhatsApp Routing Engine -->\n<script src="js/tracker.js" defer></script>\n</body>'
    )

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("index.html cleaned and upgraded successfully!")
