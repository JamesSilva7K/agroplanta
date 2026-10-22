with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

bad_litespeed = "let t=[];for(var d in document.querySelectorAll('script[type=\"litespeed/javascript\"]').forEach(e=>{t.push(e)}),t)await new Promise(e=>litespeed_load_one(t[d],e));"
good_litespeed = "let t=[];document.querySelectorAll('script[type=\"litespeed/javascript\"]').forEach(e=>{t.push(e)});for(var d in t)await new Promise(e=>litespeed_load_one(t[d],e));"

print("bad_litespeed found:", bad_litespeed in content)
if bad_litespeed in content:
    content = content.replace(bad_litespeed, good_litespeed)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed bad_litespeed!")
