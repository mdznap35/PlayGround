const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

test("the caption engine is loaded before the editor application", () => {
  const engine = html.indexOf('src="./captions.js"');
  const application = html.indexOf('src="./app.js"');
  assert.notEqual(engine, -1, "captions.js must be loaded");
  assert.notEqual(application, -1, "app.js must be loaded");
  assert.ok(engine < application, "caption engine must load before app.js");
});

test("every literal DOM id used by app.js exists in the page", () => {
  const present = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const referenced = new Set([...app.matchAll(/\$\("([^"]+)"\)/g)].map(match => match[1]));
  const missing = [...referenced].filter(id => !present.has(id)).sort();
  assert.deepEqual(missing, [], "app.js references missing page elements");
  assert.ok(referenced.size > 0, "the contract scan found no app selectors");
});

test("the portable renderer job includes validated subtitles", () => {
  assert.match(app, /subtitles:\s*captionsEngine\.validate\(captions/);
  assert.ok(html.indexOf('src="./captions.js"') < html.indexOf('src="./app.js"'));
});


test("every literal DOM id requested by app.js exists in the studio page", () => {
  const referenced = new Set([...app.matchAll(/\$\(\s*["']([^"']+)["']\s*\)/g)].map(match => match[1]));
  const missing = [...referenced].filter(id => !html.includes('id="' + id + '"'));
  assert.deepEqual(missing, [], "Missing app DOM ids: " + missing.join(", "));
});
