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

test("all caption editor controls required by app.js exist in the page", () => {
  const ids = [
    "captionScene", "captionStart", "captionEnd", "captionText",
    "captionSaveButton", "captionCancelButton", "captionList", "captionStatus",
    "captionFile", "captionImportButton", "captionExportSrtButton", "captionExportVttButton"
  ];
  for (const id of ids) {
    assert.ok(html.includes('id="' + id + '"'), "missing #" + id);
    assert.ok(app.includes('$("' + id + '")'), "app.js does not reference #" + id);
  }
});

test("the portable renderer job includes validated subtitles", () => {
  assert.match(app, /subtitles:\s*captionsEngine\.validate\(captions/);
  assert.ok(html.indexOf('src="./captions.js"') < html.indexOf('src="./app.js"'));
});
