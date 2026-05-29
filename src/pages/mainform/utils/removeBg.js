import { collection, getDocs } from "firebase/firestore";
import { db } from "@firebase-config";

let _keys = [];
let _keyIndex = 0;
let _exhausted = new Set();
let _lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadKeys(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _keys.length > 0 && now - _lastFetch < CACHE_TTL) return;

  try {
    const snap = await getDocs(collection(db, "removebg"));
    _keys = snap.docs.map((d) => ({ id: d.id, key: d.data().key }));
    _lastFetch = now;
    _exhausted = new Set();
    if (_keyIndex >= _keys.length) _keyIndex = 0;
  } catch (err) {
    // console.error("[removeBg] Failed to load keys:", err);
  }
}

function getNextKey() {
  const total = _keys.length;
  for (let i = 0; i < total; i++) {
    const entry = _keys[(_keyIndex + i) % total];
    if (!_exhausted.has(entry.id)) {
      _keyIndex = (_keyIndex + i + 1) % total;
      return entry;
    }
  }
  return null;
}

export async function removeBg(file) {
  await loadKeys();

  if (_keys.length === 0) throw new Error("No remove.bg keys found in Firestore");

  const total = _keys.length;

  for (let attempt = 0; attempt < total; attempt++) {
    const keyEntry = getNextKey();

    if (!keyEntry) throw new Error("All remove.bg keys exhausted");

    const formData = new FormData();
    formData.append("image_file", file);
    formData.append("size", "auto");

    try {
      const res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": keyEntry.key },
        body: formData,
      });

      if (res.status === 200) return await res.blob();

      if (res.status === 402) {
        _exhausted.add(keyEntry.id); // quota exhausted — skip for session
        continue;
      }

      // 429 or anything else — skip this key, try next
      continue;

    } catch {
      continue;
    }
  }

  throw new Error("All remove.bg keys exhausted");
}

export function refreshRemoveBgKeys() {
  _lastFetch = 0;
  _exhausted = new Set();
}