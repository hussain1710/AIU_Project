// Copies each compiled bundle into its page so the pages work even without the assets/js folder.
const fs = require("fs");
const pages = { "index.html": "assets/js/faculty.js", "profile.html": "assets/js/profile.js" };
for (const [page, bundle] of Object.entries(pages)) {
  if (!fs.existsSync(page)) continue;
  const js = fs.readFileSync(bundle, "utf8").replace(/<\/script/gi, "<\\/script");
  let html = fs.readFileSync(page, "utf8");
  const re = /<!--bundle:start-->[\s\S]*?<!--bundle:end-->/;
  if (!re.test(html)) throw new Error(`bundle markers missing in ${page}`);
  html = html.replace(re, () => `<!--bundle:start--><script>\n${js}\n</script><!--bundle:end-->`);
  fs.writeFileSync(page, html);
  console.log(`inlined ${bundle} (${js.length} bytes) into ${page}`);
}
