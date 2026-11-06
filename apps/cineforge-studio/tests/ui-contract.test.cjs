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


test("the pre-export review controls exist and the full-library option is opt-in", () => {
  for (const id of ["preflightButton","preflightSummary","preflightReport","includeUnusedMedia"]) {
    assert.ok(html.includes('id="' + id + '"'), "Missing preflight control: " + id);
  }
  const option = html.match(/<input\\b(?=[^>]*\\bid="includeUnusedMedia")[^>]*>/);
  assert.ok(option, "Full-library checkbox must exist");
  assert.doesNotMatch(option[0], /\\bchecked(?:\\s|=|>)/i, "Full-library export must be disabled by default");
  assert.match(app, /\$\("preflightButton"\)\.addEventListener\("click",\s*runExportPreflight\)/);
});

test("project packages default to referenced assets and opt into the whole library explicitly", () => {
  assert.match(app, /mediaBin\.auditPackageAssets\(job,\s*records\)/);
  assert.match(app, /const packageRecords = includeUnused \? records : packageAudit\.assets/);
  assert.match(app, /const includeUnused = \$\("includeUnusedMedia"\)\.checked/);
  assert.match(app, /mediaBin\.auditRights\(packageRecords\)/);
});
