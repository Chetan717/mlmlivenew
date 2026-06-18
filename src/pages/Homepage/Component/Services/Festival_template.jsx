import { db } from "@firebase-config";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { COLLECTIONS } from "../../../../collections";

const SS_KEY = "fest_v1_";
const CACHE_TTL_MS = 60 * 60 * 1000;

const _mem = new Map();

function readCache(date) {
  if (_mem.has(date)) return _mem.get(date);
  try {
    const raw = sessionStorage.getItem(SS_KEY + date);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) { sessionStorage.removeItem(SS_KEY + date); return null; }
    _mem.set(date, data);
    return data;
  } catch { return null; }
}

function writeCache(date, data) {
  _mem.set(date, data);
  try {
    sessionStorage.setItem(SS_KEY + date, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

export const Festival_template = async (Selected_date) => {
  const hit = readCache(Selected_date);
  if (hit) return hit;

  try {
    const q = query(
      collection(db, COLLECTIONS.MLMTEMPLATE),
      where("SelectType", "==", "Festival"),
      where("Active", "==", true),
      where("Launched", "==", true),
      where("Date", "==", Selected_date),
      limit(20),
    );

    const snapshot = await getDocs(q);

    const templates = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        image: data.Showcase_url || "",
        company: data.Company,
        type: data.SelectType,
        Subtype: data.Subtype || "",
        ShowCaseForm: data?.ShowCaseForm,
        serial: data?.serial,
      };
    });

    writeCache(Selected_date, templates);
    return templates;
  } catch (error) {
    console.error("Festival fetch error:", error);
    return [];
  }
};
