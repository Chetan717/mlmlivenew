import { db } from "@firebase-config";
import { COLLECTIONS } from "../../../../collections";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";

const normalizeDoc = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    image: data.Showcase_url || "",
    company: data.Company,
    Subtype: data.Subtype,
    type: data.SelectType,
    ShowCaseForm: data?.ShowCaseForm,
    serial: data?.serial,
    MainType: data.MainType,
  };
};

export const Alltemplateservice = async (
  Selected_type,
  lastDoc = null,
  pageSize = 12,
  companyName,
) => {
  try {
    const generalConstraints = [
      where("SelectType", "==", `${Selected_type}`),
      where("MainType", "==", "General"),
      where("Active", "==", true),
      where("Launched", "==", true),
      orderBy("serial"),
      limit(pageSize),
    ];

    const mlmConstraints = companyName
      ? [
          where("SelectType", "==", `${Selected_type}`),
          where("MainType", "==", "MLM"),
          where("Company", "==", companyName),
          where("Active", "==", true),
          where("Launched", "==", true),
          orderBy("serial"),
          limit(pageSize),
        ]
      : null;

    if (lastDoc) {
      generalConstraints.splice(-1, 0, startAfter(lastDoc));
      if (mlmConstraints) mlmConstraints.splice(-1, 0, startAfter(lastDoc));
    }

    const generalQuery = query(collection(db, COLLECTIONS.MLMTEMPLATE), ...generalConstraints);

    const [generalSnapshot, mlmSnapshot] = await Promise.all([
      getDocs(generalQuery),
      mlmConstraints
        ? getDocs(query(collection(db, COLLECTIONS.MLMTEMPLATE), ...mlmConstraints))
        : Promise.resolve({ docs: [] }),
    ]);

    const mlmTemplates = mlmSnapshot.docs.map(normalizeDoc);
    const generalTemplates = generalSnapshot.docs.map(normalizeDoc);

    const templates = [...mlmTemplates, ...generalTemplates];

    const newLastDoc =
      generalSnapshot.docs[generalSnapshot.docs.length - 1] || null;
    const hasMore = generalSnapshot.docs.length === pageSize || mlmSnapshot.docs.length === pageSize;

    return { templates, lastDoc: newLastDoc, hasMore };
  } catch (error) {
    console.error("Template fetch error:", error);
    return { templates: [], lastDoc: null, hasMore: false };
  }
};
