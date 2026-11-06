(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CineForgeProjectStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const DB_NAME = "cineforge-project-store";
  const DB_VERSION = 1;
  const PROJECTS = "projects";
  const SNAPSHOTS = "snapshots";
  const FALLBACK_PREFIX = "cineforge-project-v2:";
  const FALLBACK_SNAPSHOTS = "cineforge-project-v2-snapshots";
  const MAX_SNAPSHOTS = 12;

  function createStore(target) {
    target = target || root;
    function available() {
      try { return Boolean(target.localStorage); } catch { return false; }
    }
    function requestResult(request) {
      return new Promise((resolve,reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("فشل طلب قاعدة بيانات المشروع."));
      });
    }
    function openDatabase() {
      if (!target.indexedDB) return Promise.resolve(null);
      return new Promise((resolve,reject) => {
        const request = target.indexedDB.open(DB_NAME,DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS,{keyPath:"id"});
          if (!db.objectStoreNames.contains(SNAPSHOTS)) {
            const store = db.createObjectStore(SNAPSHOTS,{keyPath:"id"});
            store.createIndex("byProjectId","projectId",{unique:false});
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("تعذّر فتح قاعدة بيانات المشاريع."));
        request.onblocked = () => reject(new Error("قاعدة بيانات المشاريع مشغولة في تبويب آخر."));
      });
    }
    function fallbackSave(project) {
      if (!available()) throw new Error("لا يتوفر IndexedDB أو localStorage لحفظ المشروع.");
      const key = FALLBACK_PREFIX + project.id;
      const previous = target.localStorage.getItem(key);
      let snapshots = [];
      try { snapshots = JSON.parse(target.localStorage.getItem(FALLBACK_SNAPSHOTS) || "[]"); } catch {}
      let snapshotCreated = false;
      if (previous) {
        try {
          const old = JSON.parse(previous);
          if (Number(old.revision) !== Number(project.revision)) {
            const id = project.id + "::" + String(old.revision || 1) + "::" + String(old.updated_at || "");
            snapshots.unshift({id,projectId:project.id,createdAt:old.updated_at || new Date().toISOString(),project:old});
            snapshotCreated = true;
          }
        } catch {}
      }
      snapshots = snapshots.filter(item => item.projectId !== project.id)
        .concat(snapshots.filter(item => item.projectId === project.id).slice(0,MAX_SNAPSHOTS));
      target.localStorage.setItem(FALLBACK_SNAPSHOTS,JSON.stringify(snapshots));
      target.localStorage.setItem(key,JSON.stringify(project));
      return {backend:"localStorage",snapshotCreated:snapshotCreated};
    }
    async function save(project) {
      if (!project || !project.id) throw new TypeError("يجب تحديد معرّف المشروع قبل الحفظ.");
      let db;
      try { db = await openDatabase(); } catch { return fallbackSave(project); }
      if (!db) return fallbackSave(project);
      return new Promise((resolve,reject) => {
        const tx = db.transaction([PROJECTS,SNAPSHOTS],"readwrite");
        const projects = tx.objectStore(PROJECTS);
        const snapshots = tx.objectStore(SNAPSHOTS);
        let snapshotCreated = false;
        const previousRequest = projects.get(project.id);
        previousRequest.onsuccess = () => {
          const previous = previousRequest.result;
          if (previous && Number(previous.revision) !== Number(project.revision)) {
            const id = project.id + "::" + String(previous.revision || 1) + "::" + String(previous.updated_at || "");
            snapshots.put({id,projectId:project.id,createdAt:previous.updated_at || new Date().toISOString(),project:previous});
            snapshotCreated = true;
            const historyRequest = snapshots.index("byProjectId").getAll(project.id);
            historyRequest.onsuccess = () => {
              const history = historyRequest.result.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
              history.slice(MAX_SNAPSHOTS).forEach(item => snapshots.delete(item.id));
            };
          }
          projects.put(project);
        };
        tx.oncomplete = () => { db.close(); resolve({backend:"indexedDB",snapshotCreated:snapshotCreated}); };
        tx.onerror = () => {
          const error=tx.error || new Error("فشل حفظ المشروع.");
          db.close();
          try { resolve(fallbackSave(project)); } catch { reject(error); }
        };
        tx.onabort = () => {
          const error=tx.error || new Error("أُلغيت عملية حفظ المشروع.");
          db.close();
          try { resolve(fallbackSave(project)); } catch { reject(error); }
        };
      });
    }
    async function loadLatest() {
      let db;
      try { db = await openDatabase(); } catch { db = null; }
      if (db) {
        try {
          const tx = db.transaction(PROJECTS,"readonly");
          const items = await requestResult(tx.objectStore(PROJECTS).getAll());
          db.close();
          if (items.length) return items.sort((a,b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
        } catch { try { db.close(); } catch {} }
      }
      if (!available()) return null;
      const items = [];
      for (let i=0;i<target.localStorage.length;i++) {
        const key = target.localStorage.key(i);
        if (key && key.startsWith(FALLBACK_PREFIX)) {
          try { items.push(JSON.parse(target.localStorage.getItem(key))); } catch {}
        }
      }
      return items.sort((a,b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0] || null;
    }
    async function listSnapshots(projectId) {
      let db;
      try { db = await openDatabase(); } catch { db = null; }
      if (db) {
        try {
          const tx = db.transaction(SNAPSHOTS,"readonly");
          const items = await requestResult(tx.objectStore(SNAPSHOTS).index("byProjectId").getAll(projectId));
          db.close();
          return items.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        } catch { try { db.close(); } catch {} }
      }
      if (!available()) return [];
      try {
        return JSON.parse(target.localStorage.getItem(FALLBACK_SNAPSHOTS) || "[]")
          .filter(item => item.projectId === projectId)
          .sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      } catch { return []; }
    }
    async function restoreSnapshot(snapshotId) {
      let db;
      try { db = await openDatabase(); } catch { db = null; }
      if (db) {
        try {
          const tx = db.transaction(SNAPSHOTS,"readonly");
          const item = await requestResult(tx.objectStore(SNAPSHOTS).get(snapshotId));
          db.close();
          if (item && item.project) return item.project;
        } catch { try { db.close(); } catch {} }
      }
      if (!available()) return null;
      try {
        const item = JSON.parse(target.localStorage.getItem(FALLBACK_SNAPSHOTS) || "[]").find(entry => entry.id === snapshotId);
        return item && item.project ? item.project : null;
      } catch { return null; }
    }
    return {save,loadLatest,listSnapshots,restoreSnapshot};
  }
  const defaultStore = createStore(root);
  return Object.assign({createStore,MAX_SNAPSHOTS},defaultStore);
});
