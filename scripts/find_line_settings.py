with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'data-elementor-settings="{\"' in l or 'data-elementor-settings' in l:
        print(f"Line {i+1}: length {len(l)}")
        for m in ['data-elementor-settings="{"', "data-elementor-settings='{"]:
            if m in l:
                print(f"  has {m}")
