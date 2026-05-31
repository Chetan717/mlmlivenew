import { db } from "@firebase-config";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

const TYPE_GROUPS = [
  [
    "Motivational",
    "Rank_Promotion",
    "Bonanza",
    "Welcome_Closing",
    "Good_Morning",
    "Greeting_Wishes",
    "Health_Tips",
    "Achievements",
    "Anniversary_Birthday",
    "Devotional_Spiritual",
    "Leader_Quotes",
    "Income",
    "Meeting",
    "ThankYou_Birthday_Anniversary",
    "Capping",
  ],
];

// Helper to normalize a Firestore doc into the template shape
const normalizeDoc = (doc) => ({
  id: doc.id,
  image: doc.data().Showcase_url,
  type: doc.data().SelectType,
  Subtype: doc.data().Subtype,
  ShowCaseForm: doc.data().ShowCaseForm,
  serial: doc.data().serial,
});

// ✅ No companyName parameter — fetched internally
export const fetchGeneralTemplates = async (groupIndex, company) => {
  try {
    const selectedTypes = TYPE_GROUPS[groupIndex];
    if (!selectedTypes) return [];

    const result = [];

    for (const type of selectedTypes) {
      // ── 1. Fetch General templates ────────────────────────────────────────
      const generalQuery = query(
        collection(db, "mlmtemplate"),
        where("MainType", "==", "General"),
        where("SelectType", "==", type),
        where("Active", "==", true),
        where("Launched", "==", true),
        orderBy("serial"),
      );

      const generalSnapshot = await getDocs(generalQuery);
      const generalTemplates = generalSnapshot.docs.map(normalizeDoc);

      // ── 2. Fetch MLM (company-specific) templates ─────────────────────────
      let mlmTemplates = [];

      if (company) {
        const mlmQuery = query(
          collection(db, "mlmtemplate"),
          where("MainType", "==", "MLM"),
          where("Company", "==", company),
          where("SelectType", "==", type),
          where("Active", "==", true),
          where("Launched", "==", true),
          orderBy("serial"),
        );

        const mlmSnapshot = await getDocs(mlmQuery);
        mlmTemplates = mlmSnapshot.docs.map(normalizeDoc);
      }

      // ── 3. Merge: MLM first, then General ─────────────────────────────────
      const merged = [...mlmTemplates, ...generalTemplates];

      result.push({
        type,
        templates: merged,
      });
    }

    return result;
  } catch (error) {
    console.error("General fetch error:", error);
    return [];
  }
};
