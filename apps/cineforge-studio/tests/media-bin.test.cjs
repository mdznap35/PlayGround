const test = require("node:test");
const assert = require("node:assert/strict");
const media = require("../media-bin.js");

test("classifies only renderer-supported images, audio and known video formats", () => {
  assert.equal(media.inferKind("frame.final.WEBP"), "image");
  assert.equal(media.inferKind("narration.m4a"), "audio");
  assert.equal(media.inferKind("shot-01.mp4"), "video");
  assert.throws(() => media.inferKind("notes.exe"), /غير مدعوم/);
});

test("builds stable renderer-relative asset paths without unsafe path segments", () => {
  const asset = { id:"12345678-aaaa-bbbb", name:"لقطة / النجوم.webp", kind:"image", source_type:"generated" };
  assert.match(media.projectPath(asset), /^assets\/12345678-/);
  assert.ok(media.projectPath({ ...asset, kind:"audio", name:"voice.wav" }).startsWith("audio/"));
  assert.throws(() => media.projectPath({ ...asset, kind:"other" }), /غير مدعومة/);
});

test("rejects absolute paths and traversal attempts in ZIP entries", () => {
  assert.equal(media.validateArchivePath("apps/cineforge-studio/jobs/assets/frame.png"), "apps/cineforge-studio/jobs/assets/frame.png");
  for (const path of ["../secret.txt", "/etc/passwd", "C:/secret.txt", "jobs/../../secret", "jobs\\\\secret.txt", "jobs//empty.txt"]) {
    assert.throws(() => media.validateArchivePath(path));
  }
});

test("CRC32 matches the standard check vector", () => {
  assert.equal(media.crc32("123456789"), 0xcbf43926);
});

test("creates a valid ZIP32 archive with UTF-8 names and an end record", async () => {
  const zip = await media.buildZip([
    { name:"project.json", data:"{}" },
    { name:"assets/لقطة.txt", data:"cinema" }
  ]);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0,true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length-22,true), 0x06054b50);
  assert.equal(view.getUint16(bytes.length-14,true), 2);
  assert.equal(zip.type, "application/zip");
});

test("rejects duplicate names and archive path traversal", async () => {
  await assert.rejects(() => media.buildZip([
    {name:"same.json",data:"1"},{name:"same.json",data:"2"}
  ]), /مكرر/);
  await assert.rejects(() => media.buildZip([{name:"../bad.json",data:"x"}]), /مسار/);
});

test("enforces the archive byte budget before returning a ZIP", async () => {
  await assert.rejects(() => media.buildZip([{name:"large.bin",data:new Uint8Array(20)}],{maxBytes:10}), /يتجاوز/);
});


test("audits rights metadata and distinguishes user-owned media from external sources", () => {
  const report = media.auditRights([
    {id:"1",name:"own.png",source_type:"user",license:"حقوقي / من إنشائي"},
    {id:"2",name:"open.png",source_type:"open_license",source_ref:"https://example.org/image",license:"CC BY 4.0"},
    {id:"3",name:"unknown.png",source_type:"unknown",license:"غير محدد"},
    {id:"4",name:"generated.png",source_type:"generated",license:"Apache 2.0"}
  ]);
  assert.equal(report.ok,false);
  assert.equal(report.checked_assets,4);
  assert.deepEqual(report.issues.map(issue => [issue.asset_id,issue.code]), [
    ["4","source_reference_missing"],
    ["3","unknown_source"],
    ["3","license_unspecified"]
  ]);
});

test("accepts complete source and permission records", () => {
  const report = media.auditRights([
    {id:"u",name:"mine.webp",source_type:"user",license:"من إنشائي"},
    {id:"g",name:"generated.png",source_type:"generated",source_ref:"Provider X / Model Y",license:"Terms reviewed"}
  ]);
  assert.equal(report.ok,true);
  assert.equal(report.issue_count,0);
});
