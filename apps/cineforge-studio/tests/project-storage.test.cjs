const test=require("node:test");
const assert=require("node:assert/strict");
const storageApi=require("../project-storage.js");

function memoryStorage() {
  const values=new Map();
  return {
    get length(){return values.size;},
    key(index){return [...values.keys()][index] || null;},
    getItem(key){return values.has(key)?values.get(key):null;},
    setItem(key,value){values.set(String(key),String(value));},
    removeItem(key){values.delete(key);}
  };
}
function sample(revision,title,updatedAt) {
  return {schema:"cineforge.project",schema_version:2,id:"p1",revision,title,updated_at:updatedAt};
}

test("uses localStorage fallback when IndexedDB is unavailable", async()=>{
  const root={localStorage:memoryStorage()};
  const store=storageApi.createStore(root);
  const first=sample(1,"الأول","2026-11-04T10:00:00.000Z");
  const second=sample(2,"الثاني","2026-11-04T10:01:00.000Z");
  assert.equal((await store.save(first)).backend,"localStorage");
  const saved=await store.save(second);
  assert.equal(saved.snapshotCreated,true);
  assert.equal((await store.loadLatest()).title,"الثاني");
  const history=await store.listSnapshots("p1");
  assert.equal(history.length,1);
  assert.equal((await store.restoreSnapshot(history[0].id)).title,"الأول");
});

test("keeps snapshots bounded by project", async()=>{
  const root={localStorage:memoryStorage()};
  const store=storageApi.createStore(root);
  for(let revision=1;revision<=storageApi.MAX_SNAPSHOTS+4;revision++){
    await store.save(sample(revision,"v"+revision,"2026-11-04T10:"+String(revision).padStart(2,"0")+":00.000Z"));
  }
  const history=await store.listSnapshots("p1");
  assert.equal(history.length,storageApi.MAX_SNAPSHOTS);
});
