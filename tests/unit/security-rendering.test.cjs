const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "../..");
function renderer(withParser = true, withSanitizer = true) {
  const dom = new JSDOM("<main></main>", {
    runScripts: "outside-only",
    url: "http://localhost",
  });
  const w = dom.window;
  if (withParser)
    w.eval(fs.readFileSync(path.join(root, "vendor/marked.min.js"), "utf8"));
  if (withSanitizer)
    w.eval(fs.readFileSync(path.join(root, "vendor/purify.min.js"), "utf8"));
  w.eval(
    `function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')} function highlightGo(s){return escapeHtml(s)}`,
  );
  w.eval(fs.readFileSync(path.join(root, "frontend/app/markdown.js"), "utf8"));
  return { dom, w };
}
const payloads = [
  "<script>window.pwned=1</script>",
  '<img src=x onerror="window.pwned=1">',
  '<svg onload="window.pwned=1"><a href="javascript:alert(1)">x</a></svg>',
  "[ouvrir](javascript:alert%281%29)",
  '<a href="jav&#x61;script:alert(1)">x</a>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=1 onerror=alert(1)>">',
  '<object data="data:text/html,<script>alert(1)</script>"></object>',
  "```go\n</code><img src=x onerror=alert(1)>\n```",
];
test("malicious Markdown is inert with the real parser, sanitizer and fallback", () => {
  for (const parser of [true, false]) {
    const { dom, w } = renderer(parser);
    for (const payload of payloads) {
      const main = w.document.querySelector("main");
      main.innerHTML = w.markdownToHtml(payload);
      w.highlightMarkdownCode(main);
      assert.equal(
        main.querySelector("script,iframe,object,embed"),
        null,
        payload,
      );
      for (const el of main.querySelectorAll("*"))
        for (const a of el.attributes) {
          assert.ok(!/^on/i.test(a.name), payload);
          if (/^(href|src|xlink:href)$/i.test(a.name))
            assert.ok(
              !/^\s*(javascript|vbscript|data:text\/html):/i.test(a.value),
              payload,
            );
        }
      assert.equal(w.pwned, undefined);
    }
    dom.window.close();
  }
});
test("missing sanitizer fails closed to plain text", () => {
  const { dom, w } = renderer(true, false);
  const main = w.document.querySelector("main");
  main.innerHTML = w.markdownToHtml(payloads.join("\n"));
  assert.equal(main.children.length, 0);
  dom.window.close();
});
test("statements cannot overlay the application or impersonate a login form", () => {
  const { dom, w } = renderer();
  const main = w.document.querySelector("main");
  main.innerHTML = w.markdownToHtml(
    '<form><input type="password"><button>Connexion</button></form><style>body{display:none}</style><div style="position:fixed;inset:0;z-index:999999">Fausse interface</div>',
  );
  assert.equal(main.querySelector("form,input,button,style,[style]"), null);
  dom.window.close();
});

test("statements preserve the GCD Wikipedia reference", () => {
  const { dom, w } = renderer();
  const md =
    "In mathematics, the [greatest common divisor](https://en.wikipedia.org/wiki/Greatest_common_divisor) is a divisor.";
  const main = w.document.querySelector("main");
  main.innerHTML = w.markdownToHtml(md);
  assert.equal(
    main.querySelector("a").getAttribute("href"),
    "https://en.wikipedia.org/wiki/Greatest_common_divisor",
  );
  dom.window.close();
});
