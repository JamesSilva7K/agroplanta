with open('admin/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Color inputs
content = content.replace(
    '<input type="color" id="primary-color-picker" class="color-input-native" value="#00A870" oninput="syncColor(\'primary\', this.value)">',
    '<input type="color" id="primary-color-picker" class="color-input-native" value="#00A870" oninput="syncColor(\'primary\', this.value)" title="Seletor de Cor Primária" aria-label="Seletor de Cor Primária">'
)
content = content.replace(
    '<input type="text" id="primary-color-hex" class="hex-input" value="#00A870" oninput="syncColor(\'primary\', this.value)">',
    '<input type="text" id="primary-color-hex" class="hex-input" value="#00A870" oninput="syncColor(\'primary\', this.value)" placeholder="#00A870" title="Código Hexadecimal Cor Primária" aria-label="Código Hexadecimal Cor Primária">'
)

content = content.replace(
    '<input type="color" id="secondary-color-picker" class="color-input-native" value="#013644" oninput="syncColor(\'secondary\', this.value)">',
    '<input type="color" id="secondary-color-picker" class="color-input-native" value="#013644" oninput="syncColor(\'secondary\', this.value)" title="Seletor de Cor Secundária" aria-label="Seletor de Cor Secundária">'
)
content = content.replace(
    '<input type="text" id="secondary-color-hex" class="hex-input" value="#013644" oninput="syncColor(\'secondary\', this.value)">',
    '<input type="text" id="secondary-color-hex" class="hex-input" value="#013644" oninput="syncColor(\'secondary\', this.value)" placeholder="#013644" title="Código Hexadecimal Cor Secundária" aria-label="Código Hexadecimal Cor Secundária">'
)

content = content.replace(
    '<input type="color" id="accent-color-picker" class="color-input-native" value="#006B59" oninput="syncColor(\'accent\', this.value)">',
    '<input type="color" id="accent-color-picker" class="color-input-native" value="#006B59" oninput="syncColor(\'accent\', this.value)" title="Seletor de Cor de Destaque" aria-label="Seletor de Cor de Destaque">'
)
content = content.replace(
    '<input type="text" id="accent-color-hex" class="hex-input" value="#006B59" oninput="syncColor(\'accent\', this.value)">',
    '<input type="text" id="accent-color-hex" class="hex-input" value="#006B59" oninput="syncColor(\'accent\', this.value)" placeholder="#006B59" title="Código Hexadecimal Cor de Destaque" aria-label="Código Hexadecimal Cor de Destaque">'
)

# 2. Banner text inputs & file inputs
content = content.replace(
    '<input type="text" id="banner-input-1" class="input-text" value="images/hero-1.png" onchange="updateBannerPreview(1, this.value)">',
    '<input type="text" id="banner-input-1" class="input-text" value="images/hero-1.png" onchange="updateBannerPreview(1, this.value)" placeholder="images/hero-1.png" title="Caminho do Banner Slide 1" aria-label="Caminho do Banner Slide 1">'
)
content = content.replace(
    '<input type="file" accept="image/*" onchange="handleImageUpload(1, this)">',
    '<input type="file" accept="image/*" onchange="handleImageUpload(1, this)" title="Upload de imagem para o Slide 1" aria-label="Upload de imagem para o Slide 1">'
)

content = content.replace(
    '<input type="text" id="banner-input-2" class="input-text" value="images/hero-2.png" onchange="updateBannerPreview(2, this.value)">',
    '<input type="text" id="banner-input-2" class="input-text" value="images/hero-2.png" onchange="updateBannerPreview(2, this.value)" placeholder="images/hero-2.png" title="Caminho do Banner Slide 2" aria-label="Caminho do Banner Slide 2">'
)
content = content.replace(
    '<input type="file" accept="image/*" onchange="handleImageUpload(2, this)">',
    '<input type="file" accept="image/*" onchange="handleImageUpload(2, this)" title="Upload de imagem para o Slide 2" aria-label="Upload de imagem para o Slide 2">'
)

content = content.replace(
    '<input type="text" id="banner-input-3" class="input-text" value="images/hero-3.png" onchange="updateBannerPreview(3, this.value)">',
    '<input type="text" id="banner-input-3" class="input-text" value="images/hero-3.png" onchange="updateBannerPreview(3, this.value)" placeholder="images/hero-3.png" title="Caminho do Banner Slide 3" aria-label="Caminho do Banner Slide 3">'
)
content = content.replace(
    '<input type="file" accept="image/*" onchange="handleImageUpload(3, this)">',
    '<input type="file" accept="image/*" onchange="handleImageUpload(3, this)" title="Upload de imagem para o Slide 3" aria-label="Upload de imagem para o Slide 3">'
)

content = content.replace(
    '<input type="text" id="banner-input-4" class="input-text" value="images/banner-davi.jpg" onchange="updateBannerPreview(4, this.value)">',
    '<input type="text" id="banner-input-4" class="input-text" value="images/banner-davi.jpg" onchange="updateBannerPreview(4, this.value)" placeholder="images/banner-davi.jpg" title="Caminho do Banner Slide 4" aria-label="Caminho do Banner Slide 4">'
)
content = content.replace(
    '<input type="file" accept="image/*" onchange="handleImageUpload(4, this)">',
    '<input type="file" accept="image/*" onchange="handleImageUpload(4, this)" title="Upload de imagem para o Slide 4" aria-label="Upload de imagem para o Slide 4">'
)

content = content.replace(
    '<input type="text" id="banner-input-mb" class="input-text" value="images/plantae-hero-1-mb.png" onchange="updateBannerPreview(\'mb\', this.value)">',
    '<input type="text" id="banner-input-mb" class="input-text" value="images/plantae-hero-1-mb.png" onchange="updateBannerPreview(\'mb\', this.value)" placeholder="images/plantae-hero-1-mb.png" title="Caminho do Banner Mobile" aria-label="Caminho do Banner Mobile">'
)
content = content.replace(
    '<input type="file" accept="image/*" onchange="handleImageUpload(\'mb\', this)">',
    '<input type="file" accept="image/*" onchange="handleImageUpload(\'mb\', this)" title="Upload de imagem para o Banner Mobile" aria-label="Upload de imagem para o Banner Mobile">'
)

# 3. WhatsApp and Search inputs
content = content.replace(
    '<input type="text" id="wa-number-input" class="input-text font-15 bold-700 w-full" placeholder="Ex: 5511999999999">',
    '<input type="text" id="wa-number-input" class="input-text font-15 bold-700 w-full" placeholder="Ex: 5511999999999" title="Número do WhatsApp Receptor" aria-label="Número do WhatsApp Receptor">'
)
content = content.replace(
    '<input type="checkbox" id="wa-redirects-active" class="custom-checkbox">',
    '<input type="checkbox" id="wa-redirects-active" class="custom-checkbox" title="Ativar redirecionamento automático" aria-label="Ativar redirecionamento automático">'
)
content = content.replace(
    '<input type="checkbox" id="wa-bot-alerts" class="custom-checkbox">',
    '<input type="checkbox" id="wa-bot-alerts" class="custom-checkbox" title="Ativar notificações no Telegram" aria-label="Ativar notificações no Telegram">'
)
content = content.replace(
    '<input type="text" id="lead-search-input" oninput="filterLeads(this.value)" class="input-text w-280" placeholder="Buscar por CTA, UTM, IP, dispositivo...">',
    '<input type="text" id="lead-search-input" oninput="filterLeads(this.value)" class="input-text w-280" placeholder="Buscar por CTA, UTM, IP, dispositivo..." title="Buscar leads" aria-label="Buscar leads">'
)

with open('admin/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated admin inputs with titles, aria-labels, and placeholders!")
