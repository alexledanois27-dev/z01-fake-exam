const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(
  path.join(root, "scripts/launcher-ui/index.html"),
  "utf8",
);
const script = fs.readFileSync(
  path.join(root, "scripts/launcher-ui/launcher.js"),
  "utf8",
);
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("launcher renders log as text, authenticates requests and quits explicitly", async () => {
  const dom = new JSDOM(html, {
    url: "http://127.0.0.1:12345/#private-token",
    runScripts: "outside-only",
  });
  const calls = [];
  const state = {
    ready: true,
    owned: true,
    starting: false,
    message: "Prêt",
    url: "http://127.0.0.1:8092",
    log: "<img src=x onerror=alert(1)>",
    update: {
      state: "available",
      message: "Nouvelle version",
      branch: "main",
      version: "abc1234",
    },
  };
  dom.window.setTimeout = () => 0;
  dom.window.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => (url === "/api/state" ? state : {}) };
  };
  dom.window.eval(script);
  await flush();
  const document = dom.window.document;
  assert.equal(document.querySelector("#log img"), null);
  assert.equal(document.getElementById("log").textContent, state.log);
  assert.equal(document.getElementById("open").href, state.url + "/");
  assert.equal(document.getElementById("stop").disabled, false);
  assert.equal(calls[0].options.headers.Authorization, "Bearer private-token");
  document.getElementById("quit").click();
  await flush();
  assert.equal(calls.at(-1).url, "/api/quit");
  assert.equal(calls.at(-1).options.method, "POST");
  assert.equal(document.getElementById("open").hasAttribute("href"), false);
  assert.equal(document.getElementById("quit").disabled, true);
  dom.window.close();
});

test("launcher blocks external URLs and cannot stop an independent server", async () => {
  const dom = new JSDOM(html, {
    url: "http://127.0.0.1:12345/#token",
    runScripts: "outside-only",
  });
  dom.window.setTimeout = () => 0;
  dom.window.fetch = async () => ({
    ok: true,
    json: async () => ({
      ready: true,
      owned: false,
      starting: false,
      message: "Existant",
      url: "javascript:alert(1)",
      log: "",
      update: { state: "unavailable", message: "Hors ligne" },
    }),
  });
  dom.window.eval(script);
  await flush();
  assert.equal(
    dom.window.document.getElementById("open").hasAttribute("href"),
    false,
  );
  assert.equal(dom.window.document.getElementById("stop").disabled, true);
  dom.window.close();
});
