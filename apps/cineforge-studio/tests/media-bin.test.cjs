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
    ["3","unknown_source"],
    ["3","license_unspecified"],
    ["4","source_reference_missing"]
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


test("package audit includes only referenced media and audits rights only for used assets", () => {
  const image = {id:"img-000001",name:"scene.webp",kind:"image",source_type:"user",license:"غير محدد"};
  const voice = {id:"aud-000002",name:"voice.wav",kind:"audio",source_type:"user",license:"غير محدد"};
  const unusedUnknown = {id:"old-000003",name:"unused.png",kind:"image",source_type:"unknown",license:"غير محدد"};
  const unusedVideo = {id:"vid-000004",name:"unused.mp4",kind:"video",source_type:"unknown",license:"غير محدد"};
  const job = {
    scenes:[{image_file:media.projectPath(image)},{image_file:media.projectPath(image)}],
    voiceover_file:media.projectPath(voice),
    music_file:null
  };
  const report = media.auditPackageAssets(job,[image,voice,unusedUnknown,unusedVideo]);
  assert.equal(report.ok,true);
  assert.deepEqual(report.referenced_paths,[media.projectPath(image),media.projectPath(voice)]);
  assert.deepEqual(report.assets.map(item=>item.id),[image.id,voice.id]);
  assert.deepEqual(report.unreferenced_assets.map(item=>item.id),[unusedUnknown.id,unusedVideo.id]);
  assert.equal(report.rights_audit.checked_assets,2);
  assert.equal(report.rights_audit.ok,true);
  assert.equal(report.missing_paths.length,0);
});

test("package audit reports missing referenced files and invalid library records", () => {
  const image = {id:"img-000001",name:"scene.webp",kind:"image",source_type:"user"};
  const invalid = {id:"bad-000002",name:"payload.exe",kind:"unknown",source_type:"unknown"};
  const report = media.auditPackageAssets({
    scenes:[{image_file:media.projectPath(image)},{image_file:"assets/missing-image.webp"}],
    voiceover_file:null,music_file:null
  },[invalid]);
  assert.equal(report.ok,false);
  assert.deepEqual(report.missing_paths,[media.projectPath(image),"assets/missing-image.webp"]);
  assert.equal(report.invalid_records.length,1);
  assert.equal(report.invalid_records[0].asset_id,invalid.id);
});

test("user-created assets do not require an external license field", () => {
  const report = media.auditRights([
    {id:"owned",name:"own.png",source_type:"user",license:"غير محدد"}
  ]);
  assert.equal(report.ok,true);
  assert.equal(report.issue_count,0);
});

test("package audit rejects malformed inputs", () => {
  assert.throws(()=>media.auditPackageAssets(null,[]),/مهمة الرندر/);
  assert.throws(()=>media.auditPackageAssets({scenes:[]},{}),/سجلات مكتبة/);
});


test("inspects still-image dimensions and closes the decoded bitmap", async () => {
  let closed = false;
  const metadata = await media.inspectMediaMetadata(
    {name:"poster.png"},
    {createImageBitmap:async () => ({width:1920,height:1080,close:() => {closed=true;}})}
  );
  assert.deepEqual(metadata,{width:1920,height:1080,duration_seconds:null,metadata_status:"available"});
  assert.equal(closed,true);
});

test("inspects local video dimensions and duration without uploading the file", async () => {
  let revoked = false;
  let requestedTag = "";
  const platform = {
    URL:{
      createObjectURL:()=>"blob:local-video",
      revokeObjectURL:value=>{revoked=value==="blob:local-video";}
    },
    document:{
      createElement(tag) {
        requestedTag=tag;
        return {
          videoWidth:1280,videoHeight:720,duration:12.5,
          set src(value) { assert.equal(value,"blob:local-video"); queueMicrotask(()=>this.onloadedmetadata()); },
          removeAttribute(){},load(){}
        };
      }
    }
  };
  const metadata = await media.inspectMediaMetadata({name:"take.mp4"},platform);
  assert.deepEqual(metadata,{width:1280,height:720,duration_seconds:12.5,metadata_status:"available"});
  assert.equal(requestedTag,"video");
  assert.equal(revoked,true);
});

test("inspects audio duration and leaves visual dimensions empty", async () => {
  const platform = {
    URL:{createObjectURL:()=>"blob:local-audio",revokeObjectURL:()=>{}},
    document:{
      createElement(tag) {
        assert.equal(tag,"audio");
        return {
          duration:83.25,
          set src(_value) { queueMicrotask(()=>this.onloadedmetadata()); },
          removeAttribute(){},load(){}
        };
      }
    }
  };
  const metadata = await media.inspectMediaMetadata({name:"voice.wav"},platform);
  assert.deepEqual(metadata,{width:null,height:null,duration_seconds:83.25,metadata_status:"available"});
});

test("metadata inspection degrades safely when browser decoding is unavailable", async () => {
  const metadata = await media.inspectMediaMetadata({name:"unreadable.webp"},{});
  assert.deepEqual(metadata,{width:null,height:null,duration_seconds:null,metadata_status:"unavailable"});
});


test("package audit warns about still-image aspect ratios that differ from the project format", () => {
  const square = {id:"sq-000001",name:"square.png",kind:"image",source_type:"user",width:1080,height:1080,metadata_status:"available"};
  const landscape = {id:"ls-000002",name:"wide.webp",kind:"image",source_type:"user",width:1920,height:1080,metadata_status:"available"};
  const job = {aspect:"16:9",scenes:[{image_file:media.projectPath(square)},{image_file:media.projectPath(landscape)}]};
  const report = media.auditPackageAssets(job,[square,landscape]);
  assert.deepEqual(report.aspect_mismatches.map(item=>item.asset_id),[square.id]);
  assert.equal(report.ok,true,"aspect mismatch is a review warning, not a missing-file failure");
});
