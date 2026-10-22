// Test the exact line:
// for(var d in document.querySelectorAll('...').forEach(...),t)
const badSnippet = "for(var d in document.querySelectorAll('script[type=\"litespeed/javascript\"]').forEach(e=>{t.push(e)}),t) await new Promise(e=>litespeed_load_one(t[d],e));";
console.log("Snippet:", badSnippet);
