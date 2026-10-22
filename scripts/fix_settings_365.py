with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's fix line 365 data-elementor-settings first
bad_settings_365 = 'data-elementor-settings="{" entrance_animation":"fadeinright","exit_animation":"fadeinright","entrance_animation_duration":{"unit":"px","size":0.5,"sizes":[]},"a11y_navigation":"yes","timing":[]}"=""'
good_settings_365 = 'data-elementor-settings=\'{"entrance_animation":"fadeinright","exit_animation":"fadeinright","entrance_animation_duration":{"unit":"px","size":0.5,"sizes":[]},"a11y_navigation":"yes","timing":[]}\''

if bad_settings_365 in content:
    content = content.replace(bad_settings_365, good_settings_365)
    print("Replaced bad_settings_365!")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
