import { useState, useRef, useEffect, useCallback } from "react";
import { db, app } from "@firebase-config";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import MultiImagePicker from "./MultiImagePicker";
import { ImageEditorCanvas } from "./ImageEditorCanvas";
import { toast, Button } from "@heroui/react";
import { useNavigate, useLocation } from "react-router";
import photoupload from "./photoupload.png";
import { COLLECTIONS } from "../../collections";
const storage = getStorage(app);

let _keys = []; // [{ id, key }] — all keys from Firestore
let _keyIndex = 0; // round-robin pointer
let _exhausted = new Set(); // ids of keys that returned 402 this session
let _lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // re-fetch keys every 5 min

// ── Load all keys from Firestore (no active filter) ──────────
async function loadKeys(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _keys.length > 0 && now - _lastFetch < CACHE_TTL) {
    return;
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.REMOVEBG));
    _keys = snap.docs.map((d) => ({ id: d.id, key: d.data().key }));
    _lastFetch = now;
    // Reset exhausted set on re-fetch (picks up newly added keys too)
    _exhausted = new Set();
    if (_keyIndex >= _keys.length) _keyIndex = 0;
  } catch (err) {
    console.error("[removeBg] Failed to load keys:", err);
  }
}

// ── Get next available (non-exhausted) key ───────────────────
function getNextKey() {
  const total = _keys.length;
  for (let i = 0; i < total; i++) {
    const entry = _keys[(_keyIndex + i) % total];
    if (!_exhausted.has(entry.id)) {
      // Advance pointer past this key for the next call
      _keyIndex = (_keyIndex + i + 1) % total;
      return entry;
    }
  }
  return null;
}

export async function removeBackground(file) {
  await loadKeys();

  if (_keys.length === 0) {
    // console.error("[removeBg] No keys found in Firestore 'removebg' collection.");
    return null;
  }

  // Try every key at most once per call
  const total = _keys.length;

  for (let attempt = 0; attempt < total; attempt++) {
    const keyEntry = getNextKey();

    if (!keyEntry) {
      // console.error("[removeBg] All keys are quota-exhausted for this session.");
      return null;
    }

    const fd = new FormData();
    fd.append("image_file", file);
    fd.append("size", "auto");

    try {
      const res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": keyEntry.key },
        body: fd,
      });

      if (res.ok) {
        return await res.blob();
      }

      if (res.status === 402) {
        // Quota exhausted — blacklist this key for the rest of the session
        // console.warn(`[removeBg] 🔄 Key id=${keyEntry.id} quota exhausted (402). Rotating…`);
        _exhausted.add(keyEntry.id);
        continue;
      }

      if (res.status === 429) {
        // Temporarily rate-limited — skip for this call but don't blacklist
        // console.warn(`[removeBg] 🔄 Key id=${keyEntry.id} rate-limited (429). Rotating…`);
        continue;
      }

      // Any other HTTP error — log and try next key
      const body = await res.text().catch(() => "");
      // console.warn(`[removeBg] Key id=${keyEntry.id} returned ${res.status}:`, body);
      continue;
    } catch (networkErr) {
      // console.error(`[removeBg] Network error with key id=${keyEntry.id}:`, networkErr);
      continue;
    }
  }

  // console.error("[removeBg] ❌ All keys failed for this request.");
  return null;
}

export function refreshKeys() {
  _lastFetch = 0;
  _exhausted = new Set();
}

// ════════════════════════════════════════════════════════════
// SOCIAL ICONS
// ════════════════════════════════════════════════════════════
const SocialIcon = ({ name, active }) => {
  const icons = {
    Facebook: (
      <svg
        viewBox="0 0 24 24"
        fill={active ? "#fff" : "#1877F2"}
        className="w-6 h-6"
      >
        <path d="M22 12a10 10 0 1 0-11.56 9.87V14.89h-2.9V12h2.9v-1.8c0-2.87 1.7-4.45 4.32-4.45 1.25 0 2.56.22 2.56.22v2.82h-1.44c-1.42 0-1.86.88-1.86 1.79V12h3.17l-.5 2.89h-2.67v6.98A10 10 0 0 0 22 12z" />
      </svg>
    ),
    Instagram: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={active ? "#fff" : "#f09433"} />
            <stop offset="50%" stopColor={active ? "#fff" : "#e6683c"} />
            <stop offset="100%" stopColor={active ? "#fff" : "#bc1888"} />
          </linearGradient>
        </defs>
        <path
          fill="url(#ig-grad)"
          d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.053 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.058 1.265.07 1.645.07 4.849s-.012 3.584-.07 4.85c-.053 1.17-.249 1.805-.413 2.227-.217.562-.477.96-.896 1.382-.42.419-.82.679-1.382.896-.422.164-1.057.36-2.227.413-1.265.058-1.645.07-4.85.07s-3.584-.012-4.849-.07c-1.17-.053-1.805-.249-2.227-.413a3.7 3.7 0 0 1-1.381-.896 3.7 3.7 0 0 1-.896-1.382c-.164-.422-.36-1.057-.413-2.227C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.849c.053-1.17.249-1.805.413-2.227a3.7 3.7 0 0 1 .896-1.382 3.7 3.7 0 0 1 1.381-.896c.422-.164 1.057-.36 2.227-.413C8.416 2.175 8.796 2.163 12 2.163zM12 0C8.741 0 8.332.014 7.052.072c-1.28.058-2.155.261-2.918.558a5.9 5.9 0 0 0-2.126 1.384A5.9 5.9 0 0 0 .63 4.134C.333 4.897.13 5.772.072 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.058 1.28.261 2.155.558 2.918a5.9 5.9 0 0 0 1.384 2.126 5.9 5.9 0 0 0 2.126 1.384c.763.297 1.638.5 2.918.558C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.28-.058 2.155-.261 2.918-.558a5.9 5.9 0 0 0 2.126-1.384 5.9 5.9 0 0 0 1.384-2.126c.297-.763.5-1.638.558-2.918.058-1.28.072-1.689.072-4.948s-.014-3.668-.072-4.948c-.058-1.28-.261-2.155-.558-2.918a5.9 5.9 0 0 0-1.384-2.126A5.9 5.9 0 0 0 19.866.63C19.103.333 18.228.13 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
        />
      </svg>
    ),
    Youtube: (
      <svg
        viewBox="0 0 24 24"
        fill={active ? "#fff" : "#FF0000"}
        className="w-6 h-6"
      >
        <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
      </svg>
    ),
    X: (
      <svg
        viewBox="0 0 24 24"
        fill={active ? "#fff" : "#000"}
        className="w-6 h-6"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L2.125 2.25H8.06l4.264 5.633 5.92-5.633zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  };
  return icons[name] || null;
};

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function getUserMlm() {
  try {
    return JSON.parse(localStorage.getItem("usermlm") || "{}");
  } catch {
    return {};
  }
}

const SOCIAL_PLATFORMS = ["Facebook", "Instagram", "Youtube", "X"];

const initialForm = (mobile = "") => ({
  logoSelectedLinks: [],
  logoCustomFiles: [],
  salutation: "Mr",
  name: "",
  mobile,
  designation: "",
  profileImageBlobs: [],
  profileImageBlobPreviews: [],
  existingProfileImageURLs: [],
  _pendingProfileBlobs: [],
  topupSelectedLinks: [],
  topupCustomFiles: [],
  socials: { Facebook: "", Instagram: "", Youtube: "", X: "" },
  socialSameId: "",
  socialSameSelected: [],
});

// ════════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ════════════════════════════════════════════════════════════
function DeleteConfirmModal({ userMobile, onConfirm, onCancel, deleting }) {
  const [inputMobile, setInputMobile] = useState("");
  const isMatch = inputMobile.trim() === userMobile.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-background dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        {/* Icon + Title */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-[17px] font-bold text-foreground">
            Delete Profile?
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            This action is{" "}
            <span className="font-semibold text-red-500">Permanent</span> and
            cannot be undone. Your entire MLM profile will be deleted.
          </p>
        </div>

        {/* Mobile confirmation input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide">
            Confirm by entering your mobile number
          </label>
          <input
            type="tel"
            placeholder={`Enter Mobile Number`}
            value={inputMobile}
            onChange={(e) => setInputMobile(e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 transition dark:bg-zinc-800 dark:text-white
              ${
                inputMobile.length > 0
                  ? isMatch
                    ? "border-green-400 focus:ring-green-300 bg-green-50"
                    : "border-red-300 focus:ring-red-200 bg-red-50"
                  : "border-danger/50 focus:ring-danger/20"
              }`}
          />
          {inputMobile.length > 0 && !isMatch && (
            <p className="text-xs text-red-500">Mobile number doesn't match</p>
          )}
          {isMatch && (
            <p className="text-xs text-green-600 font-medium">
              ✓ Mobile number confirmed
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-border text-foreground/80  text-sm font-medium hover:bg-muted/30 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-md"
          >
            {deleting ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Deleting…
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
                Delete Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ════════════════════════════════════════════════════════════
function DisplaySettings({ accent = false }) {
  const [showTopupline, setShowTopupline] = useState(
    () => localStorage.getItem("showTopuplineImages") ?? "yes",
  );
  const [showLogo, setShowLogo] = useState(
    () => localStorage.getItem("showCompanyLogo") ?? "yes",
  );
  const [showMobile, setShowMobile] = useState(
    () => localStorage.getItem("showMobileNumber") ?? "yes",
  );

  const toggleTopupline = () => {
    const next = showTopupline === "yes" ? "no" : "yes";
    setShowTopupline(next);
    localStorage.setItem("showTopuplineImages", next);
  };
  const toggleLogo = () => {
    const next = showLogo === "yes" ? "no" : "yes";
    setShowLogo(next);
    localStorage.setItem("showCompanyLogo", next);
  };
  const toggleMobile = () => {
    const next = showMobile === "yes" ? "no" : "yes";
    setShowMobile(next);
    localStorage.setItem("showMobileNumber", next);
  };

  return (
    <div className="bg-background rounded-2xl border border-border/60 shadow-sm p-4 space-y-5">
      <label
        className={`block text-sm font-semibold ${
          accent ? "text-accent" : "text-foreground/80"
        }`}
      >
        Display Settings
      </label>

      {/* Show Topupline Images */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground/70">
          Show Topupline Images
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={showTopupline === "yes"}
          onClick={toggleTopupline}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
            showTopupline === "yes" ? "bg-green-500" : "bg-foreground/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              showTopupline === "yes" ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Show Company Logo */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground/70">
          Show Company Logo
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={showLogo === "yes"}
          onClick={toggleLogo}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
            showLogo === "yes" ? "bg-green-500" : "bg-foreground/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              showLogo === "yes" ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Show Mobile Number */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground/70">
          Show Mobile Number
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={showMobile === "yes"}
          onClick={toggleMobile}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
            showMobile === "yes" ? "bg-green-500" : "bg-foreground/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              showMobile === "yes" ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function MLMProfilePage() {
  const navigate = useNavigate();
  const userMlm = getUserMlm();
  const userMobile = (userMlm.mobileNo || "").trim();

  const [form, setForm] = useState(initialForm(userMobile));
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("form");
  const [editorSrc, setEditorSrc] = useState(null);
  const [editingProfileIndex, setEditingProfileIndex] = useState(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [pendingProfileFile, setPendingProfileFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [existingDocId, setExistingDocId] = useState(null);
  const [showSocial, setShowSocial] = useState(() => {
    return localStorage.getItem("socialradio") ?? "yes";
  });
  const handleShowSocialChange = (val) => {
    setShowSocial(val);
    localStorage.setItem("socialradio", val);
  };
  // Delete states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const profileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const topupInputRef = useRef(null);

  const isEditMode = !!existingDocId;
  const location = useLocation();
  const isSettingsMode =
    new URLSearchParams(location.search).get("mode") === "settings";

  const company = (() => {
    try {
      return JSON.parse(localStorage.getItem("selectedCompany") || "{}");
    } catch {
      return {};
    }
  })();

  const logos = Array.isArray(company?.logos) ? company.logos : [];
  const topuplines = Array.isArray(company?.topuplines)
    ? company.topuplines
    : [];

  const designations = Array.isArray(company?.profile) ? company.profile : [];

  // ── fetchProfile (extracted so it can be called after save too) ──
  const fetchProfile = useCallback(async () => {
    if (!userMobile) {
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.MLMPROFILES),
        where("mobile", "==", userMobile),
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        setExistingDocId(docSnap.id);

        const fullName = data.fullName || "";
        const dotIdx = fullName.indexOf(".");
        const salutation = dotIdx !== -1 ? fullName.slice(0, dotIdx) : "Mr";
        const name = dotIdx !== -1 ? fullName.slice(dotIdx + 1) : fullName;

        setForm({
          logoSelectedLinks: data.logoURLs || [],
          logoCustomFiles: [],
          salutation,
          name,
          mobile: userMobile,
          designation: data.designation || "",
          profileImageBlobs: [],
          profileImageBlobPreviews: [],
          existingProfileImageURLs: data.profileImageURLs || [],
          _pendingProfileBlobs: [],
          topupSelectedLinks: data.topuplineURLs || [],
          topupCustomFiles: [],
          socials: data.socials || {
            Facebook: "",
            Instagram: "",
            Youtube: "",
            X: "",
          },
          socialSameId: "",
          socialSameSelected: [],
        });
      } else {
        setExistingDocId(null);
        setForm(initialForm(userMobile));
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setForm(initialForm(userMobile));
    } finally {
      setLoadingProfile(false);
    }
  }, [userMobile]);

  // ── Fetch on mount ─────────────────────────────────────────
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const clearError = (key) =>
    setErrors((prev) => ({ ...prev, [key]: undefined }));

  // ── Logo ───────────────────────────────────────────────────
  const handleLogoToggleLink = (link) =>
    setForm((f) => ({
      ...f,
      logoSelectedLinks: f.logoSelectedLinks.includes(link)
        ? f.logoSelectedLinks.filter((l) => l !== link)
        : [...f.logoSelectedLinks, link],
    }));

  const handleLogoAddCustomFiles = (files) =>
    setForm((f) => ({
      ...f,
      logoCustomFiles: [
        ...f.logoCustomFiles,
        ...files.map((file) => ({
          file,
          previewURL: URL.createObjectURL(file),
        })),
      ],
    }));

  const handleLogoRemoveCustomFile = (index) =>
    setForm((f) => ({
      ...f,
      logoCustomFiles: f.logoCustomFiles.filter((_, i) => i !== index),
    }));

  // ── Topupline ──────────────────────────────────────────────
  const handleTopupToggleLink = (link) =>
    setForm((f) => ({
      ...f,
      topupSelectedLinks: f.topupSelectedLinks.includes(link)
        ? f.topupSelectedLinks.filter((l) => l !== link)
        : [...f.topupSelectedLinks, link],
    }));

  const handleTopupAddCustomFiles = (files) =>
    setForm((f) => ({
      ...f,
      topupCustomFiles: [
        ...f.topupCustomFiles,
        ...files.map((file) => ({
          file,
          previewURL: URL.createObjectURL(file),
        })),
      ],
    }));

  const handleTopupRemoveCustomFile = (index) =>
    setForm((f) => ({
      ...f,
      topupCustomFiles: f.topupCustomFiles.filter((_, i) => i !== index),
    }));

  // ── Profile photo ──────────────────────────────────────────
  const handleProfileFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingProfileFile(file);
    e.target.value = "";
  };

  const processProfileFile = async (file, shouldRemoveBg) => {
    setRemovingBg(true);
    try {
      const blob = shouldRemoveBg ? (await removeBackground(file)) || file : file;
      setEditorSrc(URL.createObjectURL(blob));
      setEditingProfileIndex("new");
      setForm((f) => ({ ...f, _pendingProfileBlobs: [] }));
      setStep("editor");
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingBg(false);
    }
  };

  const handleProfileChoice = (shouldRemoveBg) => {
    const file = pendingProfileFile;
    setPendingProfileFile(null);
    if (file) processProfileFile(file, shouldRemoveBg);
  };

  const handleEditorDone = (blob) => {
    setForm((f) => {
      if (editingProfileIndex === "new") {
        const pending = f._pendingProfileBlobs || [];
        const newBlobs = [blob, ...pending];
        const newPreviews = newBlobs.map((b) => URL.createObjectURL(b));
        return {
          ...f,
          profileImageBlobs: [...f.profileImageBlobs, ...newBlobs],
          profileImageBlobPreviews: [
            ...f.profileImageBlobPreviews,
            ...newPreviews,
          ],
          _pendingProfileBlobs: [],
        };
      } else if (typeof editingProfileIndex === "number") {
        const existingCount = f.existingProfileImageURLs.length;
        if (editingProfileIndex < existingCount) {
          const urls = [...f.existingProfileImageURLs];
          urls.splice(editingProfileIndex, 1);
          return {
            ...f,
            existingProfileImageURLs: urls,
            profileImageBlobs: [...f.profileImageBlobs, blob],
            profileImageBlobPreviews: [
              ...f.profileImageBlobPreviews,
              URL.createObjectURL(blob),
            ],
          };
        } else {
          const blobIdx = editingProfileIndex - existingCount;
          const blobs = [...f.profileImageBlobs];
          const previews = [...f.profileImageBlobPreviews];
          blobs[blobIdx] = blob;
          previews[blobIdx] = URL.createObjectURL(blob);
          return {
            ...f,
            profileImageBlobs: blobs,
            profileImageBlobPreviews: previews,
          };
        }
      }
      return f;
    });
    setEditingProfileIndex(null);
    setStep("form");
    setEditorSrc(null);
  };

  const handleRemoveProfileImage = (combinedIdx) => {
    setForm((f) => {
      const existingCount = f.existingProfileImageURLs.length;
      if (combinedIdx < existingCount) {
        return {
          ...f,
          existingProfileImageURLs: f.existingProfileImageURLs.filter(
            (_, i) => i !== combinedIdx,
          ),
        };
      }
      const blobIdx = combinedIdx - existingCount;
      return {
        ...f,
        profileImageBlobs: f.profileImageBlobs.filter((_, i) => i !== blobIdx),
        profileImageBlobPreviews: f.profileImageBlobPreviews.filter(
          (_, i) => i !== blobIdx,
        ),
      };
    });
  };

  const handleEditProfileImage = async (combinedIdx) => {
    const existingCount = form.existingProfileImageURLs.length;
    if (combinedIdx < existingCount) {
      setRemovingBg(true);
      try {
        const res = await fetch(form.existingProfileImageURLs[combinedIdx]);
        if (!res.ok) throw new Error("Fetch failed");
        const blob = await res.blob();
        const blobURL = URL.createObjectURL(blob);
        setEditingProfileIndex(combinedIdx);
        setEditorSrc(blobURL);
        setStep("editor");
      } catch (err) {
        console.error("Failed to load image for editing:", err);
      } finally {
        setRemovingBg(false);
      }
    } else {
      const blobIdx = combinedIdx - existingCount;
      const blobURL = form.profileImageBlobPreviews[blobIdx];
      setEditingProfileIndex(combinedIdx);
      setEditorSrc(blobURL);
      setStep("editor");
    }
  };

  const allProfileImages = [
    ...form.existingProfileImageURLs.map((url) => ({ url, isExisting: true })),
    ...form.profileImageBlobPreviews.map((url) => ({ url, isExisting: false })),
  ];

  // ── Social ─────────────────────────────────────────────────
  const handleSocialSameToggle = (platform) => {
    setForm((f) => {
      const sel = f.socialSameSelected.includes(platform)
        ? f.socialSameSelected.filter((p) => p !== platform)
        : [...f.socialSameSelected, platform];
      const socials = { ...f.socials };
      sel.forEach((p) => (socials[p] = f.socialSameId));
      return { ...f, socialSameSelected: sel, socials };
    });
  };

  const handleSocialSameIdChange = (val) => {
    setForm((f) => {
      const socials = { ...f.socials };
      f.socialSameSelected.forEach((p) => (socials[p] = val));
      return { ...f, socialSameId: val, socials };
    });
  };

  // ── Validation ─────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.designation) e.designation = "Select a designation";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Firebase helpers ───────────────────────────────────────
  const uploadFile = async (file, path) => {
    const r = storageRef(storage, path);
    await uploadBytes(r, file);
    return getDownloadURL(r);
  };

  const uploadBlob = async (blob, path) => {
    const r = storageRef(storage, path);
    await uploadBytes(r, blob);
    return getDownloadURL(r);
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const uid = existingDocId || Date.now().toString(36);

      const uploadedLogoURLs = await Promise.all(
        form.logoCustomFiles.map((item, i) =>
          uploadFile(item.file, `mlmprofiles/${uid}/logo_custom_${i}.png`),
        ),
      );
      const allLogoURLs = [...form.logoSelectedLinks, ...uploadedLogoURLs];

      const newlyUploadedProfileURLs = await Promise.all(
        form.profileImageBlobs.map((blob, i) =>
          uploadBlob(blob, `mlmprofiles/${uid}/profile_${Date.now()}_${i}.png`),
        ),
      );
      const allProfileImageURLs = [
        ...form.existingProfileImageURLs,
        ...newlyUploadedProfileURLs,
      ];

      const uploadedTopupURLs = await Promise.all(
        form.topupCustomFiles.map((item, i) =>
          uploadFile(item.file, `mlmprofiles/${uid}/topup_custom_${i}.png`),
        ),
      );
      const allTopupURLs = [...form.topupSelectedLinks, ...uploadedTopupURLs];

      const profileData = {
        fullName: `${form.salutation}.${form.name.trim()}`,
        mobile: userMobile,
        designation: form.designation,
        logoURLs: allLogoURLs,
        profileImageURLs: allProfileImageURLs,
        topuplineURLs: allTopupURLs,
        socials: form.socials,
        companyId: company?.id || null,
        companyName: company?.name || null,
        updatedAt: serverTimestamp(),
      };

      if (isEditMode) {
        await updateDoc(doc(db, "mlmprofiles", existingDocId), profileData);
        localStorage.setItem(
          "mlmProfile",
          JSON.stringify({ id: existingDocId, ...profileData }),
        );
      } else {
        const newDoc = await addDoc(collection(db, COLLECTIONS.MLMPROFILES), {
          ...profileData,
          createdAt: serverTimestamp(),
        });
        localStorage.setItem(
          "mlmProfile",
          JSON.stringify({ id: newDoc.id, ...profileData }),
        );
      }

      toast.success(
        isEditMode
          ? "Profile updated successfully!"
          : "Profile saved successfully!",
      );

      // ✅ Re-fetch from Firestore and update state — no page reload needed
      await fetchProfile();
    } catch (err) {
      console.error("Save error:", err);
      setSaveError(err?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!existingDocId) return;
    setDeleting(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.MLMPROFILES),
        where("mobile", "==", userMobile),
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        await deleteDoc(doc(db, "mlmprofiles", snap.docs[0].id));
      }

      localStorage.removeItem("mlmProfile");

      toast.success("Profile deleted successfully.");
      setShowDeleteModal(false);

      setTimeout(() => navigate("/logout"), 800);
    } catch (err) {
      console.error("Delete error:", err);
      toast.danger("Failed to delete profile. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  // ── Editor view ────────────────────────────────────────────
  if (step === "editor" && editorSrc) {
    return (
      <div className="flex flex-col w-[100%] h-[100%] items-center justify-center bg-muted/20">
        <div className="w-full h-full bg-background rounded-2xl border border-border shadow-md ">
          <ImageEditorCanvas
            key={editorSrc}
            src={editorSrc}
            onDone={handleEditorDone}
            onCancel={() => {
              setStep("form");
              setEditorSrc(null);
              setEditingProfileIndex(null);
            }}
          />
        </div>
      </div>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────
  if (loadingProfile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-xl" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-muted/60 rounded-xl" />
        ))}
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────
  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          userMobile={userMobile}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          deleting={deleting}
        />
      )}

      {/* Background choice modal */}
      {pendingProfileFile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs rounded-2xl bg-background dark:bg-zinc-900 border border-border shadow-2xl p-5">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-accent/10 flex items-center justify-center">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent"
                >
                  <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
                </svg>
              </div>
              <p className="text-[14px] font-bold text-foreground">
                How should we use this photo?
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Choose whether to keep the image as is or remove its background.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleProfileChoice(true)}
                className="w-full py-3 rounded-xl bg-accent text-accent-foreground text-[13px] font-bold hover:opacity-90 transition-opacity"
              >
                Remove Background
              </button>
              <button
                type="button"
                onClick={() => handleProfileChoice(false)}
                className="w-full py-3 rounded-xl bg-muted/60 border border-border text-foreground text-[13px] font-bold hover:bg-muted transition-colors"
              >
                Keep Original
              </button>
              <button
                type="button"
                onClick={() => setPendingProfileFile(null)}
                className="w-full py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto p-2 bg-background">
        {/* Page header */}
        <div className="mb-2">
          <h1 className="text-[15px] font-bold text-foreground">
            {isEditMode ? "" : "Create Profile"}
          </h1>
        </div>

        <div className="flex flex-col gap-2">
          {/* Settings mode: Display Settings shown first (accent heading) */}
          {isSettingsMode && <DisplaySettings accent />}

          {/* ── LOGO ──────────────────────────────────────────── */}
          <div className="bg-background rounded-2xl border border-border p-4">
            <label className="block text-[11px] font-bold text-foreground/60 mb-2">
              Company Logo
            </label>
            <div className="flex flex-col gap-2">
              <MultiImagePicker
                companyImages={logos}
                selectedLinks={form.logoSelectedLinks}
                onToggleLink={handleLogoToggleLink}
                customFiles={form.logoCustomFiles}
                onAddCustomFiles={handleLogoAddCustomFiles}
                onRemoveCustomFile={handleLogoRemoveCustomFile}
                inputRef={logoInputRef}
                companyGridCols={4}
                thumbHeight="h-14"
                type="Logo"
                inlineStrip
              />
            </div>
          </div>

          {/* ── FULL NAME + MOBILE + DESIGNATION ─────────────── */}
          {!isSettingsMode && (
            <div className="bg-background rounded-2xl border border-border p-4">
              {/* Full Name */}
              <label className="block text-[11px] font-bold text-foreground/60 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 mb-3">
                <select
                  value={form.salutation}
                  onChange={(e) => setField("salutation", e.target.value)}
                  className="border border-border rounded-xl px-3 py-2.5 text-[13px] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                >
                  {["Mr", "Mrs", "Ms", "Dr"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={form.name}
                  onChange={(e) => {
                    setField("name", e.target.value);
                    clearError("name");
                  }}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 ${errors.name ? "border-red-400 bg-red-50" : "border-border"}`}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-500 mt-1 mb-2">{errors.name}</p>
              )}

              {/* Mobile */}
              <label className="block text-[11px] font-bold text-foreground/60 mb-2">
                Mobile Number
                {/* <span className="ml-2 text-xs font-normal text-muted-foreground/70 bg-muted/40 px-2 py-0.5 rounded-full">
                🔒 Locked
              </span> */}
              </label>
              <div className="relative mb-3">
                <input
                  type="tel"
                  value={`+91 ${userMobile}`}
                  readOnly
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-[13px] bg-muted/20 text-muted-foreground cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/70">
                  from account
                </span>
              </div>

              {/* Designation */}
              <label className="block text-[11px] font-bold text-foreground/60 mb-2">
                Designation <span className="text-red-500">*</span>
              </label>
              <select
                value={form.designation}
                onChange={(e) => {
                  setField("designation", e.target.value);
                  clearError("designation");
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 ${errors.designation ? "border-red-400 bg-red-50" : "border-border"}`}
              >
                <option value="">Select designation…</option>
                {designations.length > 0 ? (
                  designations.map((d) => (
                    <option key={d.id} value={d.profilename}>
                      {d.profilename}
                    </option>
                  ))
                ) : (
                  <option disabled>No designations in company data</option>
                )}
              </select>
              {errors.designation && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.designation}
                </p>
              )}
            </div>
          )}
          {/* ── TOPUP LINE ────────────────────────────────────── */}
          <div className="bg-background rounded-2xl border border-border p-4">
            <label className="block text-sm font-semibold text-foreground/80 mb-6">
              Topup Line Images
            </label>
            <div className="flex flex-col gap-2">
              <MultiImagePicker
                companyImages={topuplines}
                selectedLinks={form.topupSelectedLinks}
                onToggleLink={handleTopupToggleLink}
                customFiles={form.topupCustomFiles}
                onAddCustomFiles={handleTopupAddCustomFiles}
                onRemoveCustomFile={handleTopupRemoveCustomFile}
                inputRef={topupInputRef}
                companyGridCols={3}
                thumbHeight="h-16"
                type="TopupLine"
                inlineStrip
              />
            </div>
          </div>
          {/* ── PROFILE PHOTO ─────────────────────────────────── */}
          <div className="bg-background rounded-2xl  p-4">
            <label className="block text-sm font-semibold text-foreground/80 mb-5">
              Profile Photo
            </label>
            <div className="flex flex-col gap-2">
              {/* Scrollable thumbnails + pinned upload, one combined border */}
              <div className="w-full flex items-center gap-2 rounded-2xl border border-border p-2">
                {/* Horizontally scrollable thumbnails area */}
                <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {allProfileImages.length === 0 && (
                    <span className="text-[11px] text-muted-foreground px-2 py-3">
                      No images selected yet
                    </span>
                  )}
                  {allProfileImages.map(({ url, isExisting }, idx) => (
                    <div
                      key={url || `prof-${idx}`}
                      className="relative flex-shrink-0 mb-1 "
                    >
                      <img
                        src={url}
                        alt={`Profile ${idx + 1}`}
                        
                        className="w-14 h-14 rounded-full object-contain bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-600 font-bold text-transparent"
                      />
                      {/* {isExisting && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[8px] px-1 rounded-full leading-tight ring-2 ring-background">
                          saved
                        </span>
                      )} */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProfileImage(idx);
                        }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center shadow ring-2 ring-background"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {/* Circular upload icon pinned at the end (does not scroll) */}
                <button
                  type="button"
                  onClick={() =>
                    !removingBg && profileInputRef.current?.click()
                  }
                  disabled={removingBg}
                  className="flex-shrink-0 w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-accent/60 hover:bg-accent/5 flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    removingBg ? "Removing background…" : "Upload profile image"
                  }
                >
                  {removingBg ? (
                    <svg
                      className="animate-spin w-7 h-7 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                  ) : (
                    <img
                      src={photoupload}
                      alt="Upload"
                      className="w-7 h-7 opacity-70"
                    />
                  )}
                </button>
              </div>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfileFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* ── DISPLAY SETTINGS (shown at bottom in full profile mode) ── */}
          {!isSettingsMode && <DisplaySettings />}

          {/* ── SHOW SOCIAL MEDIA RADIO ──────────────────────── 
          <div className="bg-background rounded-2xl border border-border/60 shadow-sm p-4">
            <label className="block text-sm font-semibold text-foreground/80 mb-3">
              Show Social Media on Profile?
            </label>
            <div className="flex gap-4">
              {["yes", "no"].map((val) => (
                <label
                  key={val}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 cursor-pointer transition font-medium text-sm capitalize
          ${
            showSocial === val
              ? "border-accent bg-indigo-accent text-accent"
              : "border-border bg-muted/20 text-muted-foreground hover:border-accent"
          }`}
                >
                  <input
                    type="radio"
                    name="socialradio"
                    value={val}
                    checked={showSocial === val}
                    onChange={() => handleShowSocialChange(val)}
                    className="accent"
                  />
                  {val === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>
           ── SOCIAL MEDIA ──────────────────────────────────── 
          <div className="bg-background rounded-2xl border border-border/60 shadow-sm p-4">
            <label className="block text-sm font-semibold text-foreground/80 mb-3">
              Social Media Links{" "}
              <span className="text-muted-foreground/70 font-normal">(Optional)</span>
            </label>
            <div className="flex flex-col gap-3">
              {SOCIAL_PLATFORMS.map((platform) => (
                <div key={platform} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/20 border border-border flex items-center justify-center shrink-0">
                    <SocialIcon name={platform} active={false} />
                  </div>
                  <input
                    type="text"
                    placeholder={`${platform} user ID`}
                    maxLength={60}
                    value={form.socials[platform]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        socials: { ...f.socials, [platform]: e.target.value },
                      }))
                    }
                    className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-muted/20 rounded-xl border border-indigo-100">
              <p className="text-sm font-medium text-foreground/80 mb-2">
                Same ID across platforms?
              </p>
              <input
                type="text"
                placeholder="Shared user ID"
                maxLength={40}
                value={form.socialSameId}
                onChange={(e) => handleSocialSameIdChange(e.target.value)}
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 mb-3"
              />
              <p className="text-xs text-muted-foreground mb-2">
                Select platforms to apply:
              </p>
              <div className="flex gap-3 flex-wrap">
                {SOCIAL_PLATFORMS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handleSocialSameToggle(platform)}
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition ${
                      form.socialSameSelected.includes(platform)
                        ? "border-accent bg-indigo-500"
                        : "border-border bg-background hover:border-indigo-400"
                    }`}
                  >
                    <SocialIcon
                      name={platform}
                      active={form.socialSameSelected.includes(platform)}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>*/}

          {/* ── ERROR FEEDBACK ────────────────────────────────── */}
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {saveError}
            </div>
          )}

          {/* ── SAVE BUTTON ───────────────────────────────────── */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                {isEditMode ? "Updating…" : "Saving…"}
              </>
            ) : isEditMode ? (
              " Update Profile"
            ) : (
              " Save Profile"
            )}
          </button>

          {/* ── DELETE PROFILE SECTION ────────────────────────── */}
          {isEditMode && !isSettingsMode && (
            // <div className="rounded-2xl mt-4 w-full border border-red-100 bg-red-50/60 p-4">
            <Button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className=" inline-flex w-full items-center gap-2 p-3 mt-2 rounded-lg bg-background border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition shadow-sm"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              Delete My Company Profile
            </Button>
            // </div>
          )}

          {/* bottom spacing for mobile nav bars */}
          <div className="h-6" />
        </div>
      </div>
    </>
  );
}
