import { useState, useEffect, useRef } from "react";
import {
  Person,
  PersonPlus,
  PersonGear,
  Persons,
  LocationArrow,
  Handset,
  CircleDollar,
  Picture,
  Briefcase,
  Medal,
  TriangleRightFill,
  CircleCheck,
  TriangleExclamationFill,
  TriangleRight,
} from "@gravity-ui/icons";
import {
  sanitizeAmount,
  sanitizeFormValue,
  sanitizeName,
  sanitizePhone,
} from "../utils/inputSanitize";
import {
  Button,
  Card,
  Input,
  Label,
  TextField,
  FieldError,
  InputGroup,
  Select,
  ListBox,
  Tabs,
  Modal,
} from "@heroui/react";
import MultiImagePicker from "./MultiImagePicker";
import ImageUploadWithBgRemove from "./ImageUploadWithBgRemove";
import ImageEditorCanvas from "./ImageEditorCanvas";
import AchievementForm from "./AchievementForm";
import { useNavigate } from "react-router";
import IncomeForm from "./IncomeForm";
import MeetingForm from "./MeetingForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a base64 data-URL back to a Blob so image state stays consistent */
function base64ToBlob(dataUrl) {
  if (!dataUrl) return null;
  try {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch {
    return null;
  }
}

function parseAchieverName(savedAchiever = {}) {
  const title = savedAchiever.title || "Mr.";
  let name = savedAchiever.name || "";

  if (!savedAchiever.title && savedAchiever.achieverName) {
    const raw = savedAchiever.achieverName.trim();
    const match = raw.match(/^(Mr\.?|Mrs\.?|Dr\.?)\s*(.*)$/i);
    if (match) {
      return {
        title: match[1].endsWith(".") ? match[1] : `${match[1]}.`,
        name: match[2] || "",
      };
    }
    name = raw;
  }

  return { title, name };
}

const toBase64 = (blob) =>
  new Promise((res) => {
    if (!blob) return res(null);
    // Already a data-URL string (restored from storage)
    if (typeof blob === "string") return res(blob);
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result);
    reader.readAsDataURL(blob);
  });

// ─── Inline field error ───────────────────────────────────────────────────────
function InlineError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1 mt-1">
      <TriangleExclamationFill
        width={12}
        height={12}
        className="text-danger flex-shrink-0"
      />
      <p className="text-danger text-xs">{message}</p>
    </div>
  );
}

// ─── Upload zone ─────────────────────────────────────────────────────────────
function UploadZone({ label, hasError, onClick }) {
  return (
    <div
      onClick={onClick}
      className={[
        "flex flex-col items-center justify-center gap-2 py-5 px-4",
        "border-2 border-dashed rounded-xl cursor-pointer transition-colors",
        hasError
          ? "border-danger bg-danger-50"
          : "border-default-300 bg-default-50 hover:border-primary hover:bg-primary-50",
      ].join(" ")}
    >
      <Picture
        width={28}
        height={28}
        className={hasError ? "text-danger" : "text-primary"}
      />
      <p className="text-sm text-default-600 font-medium">{label}</p>
      <p className="text-xs text-default-400">
        PNG, JPG · Background removal supported
      </p>
    </div>
  );
}

// ─── Upload success row ───────────────────────────────────────────────────────
function UploadedRow({ onRemove }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-success-50 border border-success-200">
      <CircleCheck width={18} height={18} className="text-success" />
      <p className="text-sm text-success-700 font-medium">Photo uploaded</p>
      <button
        className="ml-auto text-xs text-default-500 underline"
        onClick={onRemove}
      >
        Remove
      </button>
    </div>
  );
}

// ─── Reusable text field with icon prefix ─────────────────────────────────────
function IconTextField({
  label,
  placeholder,
  type = "text",
  inputMode,
  icon: Icon,
  value,
  onChange,
  error,
  maxLength,
}) {
  return (
    <div>
      <TextField isInvalid={!!error} className="w-full">
        <Label className="text-xs text-accent/70 font-medium">{label}</Label>
        <InputGroup>
          <InputGroup.Prefix className="pl-3">
            <Icon width={14} height={14} className="text-primary" />
          </InputGroup.Prefix>
          <InputGroup.Input
            type={type}
            inputMode={inputMode}
            placeholder={placeholder}
            value={value}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            className="pl-2 text-xs text-foreground dark:text-white"
          />
        </InputGroup>
        <FieldError />
      </TextField>
      <InlineError message={error} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SalesExecutiveForm() {
  const [tab, setTab] = useState("team");

   useEffect(() => {
    // Force the window to top when Editor opens
    window.scrollTo(0, 0);
  }, []); // Empty array means it runs exactly once on load

  const [company, setCompany] = useState(null);
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [customFiles, setCustomFiles] = useState([]);
  const [editingType, setEditingType] = useState("main");
  const inputRef = useRef();

  const [editingImage, setEditingImage] = useState(null);
  const [onImageDone, setOnImageDone] = useState(null);

  const [achiever, setAchiever] = useState({
    title: "Mr.",
    name: "",
    achieverName: "Mr.",
  });
  const [promoter, setPromoter] = useState({});
  const [errors, setErrors] = useState({});
  const [closeFilter, setCloseFilter] = useState(() => {
    try {
      return localStorage.getItem("close_filter") || "SP";
    } catch {
      return "SP";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("close_filter", closeFilter);
    } catch {}
  }, [closeFilter]);

  function getSelType() {
    try {
      return JSON.parse(localStorage.getItem("selType")) || {};
    } catch {
      return {};
    }
  }
  const selll = getSelType();
  const isWelcome = selll?.Subtype === "WELCOME";
  const isClosing = selll?.Subtype === "CLOSING";
  const isAchievment = selll?.type === "Achievements";
  const isAnyversary = selll?.type === "Anniversary_Birthday";
  const isIncome = selll?.type === "Income";
  const isMeeting = selll?.type === "Meeting";
  const isBonanza = selll?.type === "Bonanza";
  const formImage = String(selll?.ShowCaseForm) || ""

  // ── Restore state from localStorage on mount ──────────────────────────────
  useEffect(() => {
    // 1. Company
    const da = JSON.parse(localStorage.getItem("selType")) || {};
    setSelectedType(da.type || "");
    const companyData = JSON.parse(localStorage.getItem("selectedCompany"));
    if (companyData) setCompany(companyData);

    // 2. mlmProfile (top-upline URLs set externally, e.g. from profile page)
    const mlmProfile = JSON.parse(localStorage.getItem("mlmProfile"));

    // 3. Previously saved form — takes priority over mlmProfile for selectedLinks
    const saved = JSON.parse(localStorage.getItem("mlmform"));

    if (saved) {
      // Restore tab
      if (saved.tab) setTab(saved.tab);

      // Restore achiever (image stays as base64 string; components handle both Blob & string)
      if (saved.achiever) {
        const parsed = parseAchieverName(saved.achiever);
        setAchiever({
          ...saved.achiever,
          title: parsed.title,
          name: parsed.name,
          achieverName:
            saved.achiever.achieverName ||
            `${parsed.title} ${parsed.name}`.trim(),
          image: saved.achiever.image || null,
        });
      }

      // Restore promoter
      if (saved.promoter) {
        setPromoter({
          ...saved.promoter,
          image: saved.promoter.image || null,
        });
      }

      // Restore selected upline links (saved form overrides mlmProfile)
      if (saved.selectedLinks?.length) {
        setSelectedLinks(saved.selectedLinks);
      } else if (mlmProfile?.topuplineURLs?.length) {
        setSelectedLinks(mlmProfile.topuplineURLs);
      }
    } else if (mlmProfile?.topuplineURLs?.length) {
      // No saved form yet — seed from mlmProfile
      setSelectedLinks(mlmProfile.topuplineURLs);
    }
  }, []);

  // ─── Validation ────────────────────────────────────────────────────────────
  const validate = isAchievment
    ? () => {
        const newErrors = {};
        if (!achiever.name?.trim()) newErrors.achieverName = "Name is required";
        if (!achiever.city?.trim()) newErrors.achieverCity = "City is required";

        if (tab === "self") {
          if (!promoter.name?.trim())
            newErrors.promoterName = "Name is required";
          if (!promoter.role) newErrors.promoterRole = "Role is required";
          if (!promoter.mobile?.trim())
            newErrors.promoterMobile = "Mobile is required";
          if (!promoter.image) newErrors.promoterImage = "Photo is required";
        }
        if (selectedLinks.length === 0 && customFiles.length === 0)
          newErrors.topupline = "Select at least 1 image";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
      }
    : () => {
        const newErrors = {};
        if (!achiever.name?.trim()) newErrors.achieverName = "Name is required";
        if (!achiever.city?.trim()) newErrors.achieverCity = "City is required";
        if (
          selectedType !== "Bonanza" &&
          isWelcome &&
          isAchievment &&
          !achiever.amount?.toString().trim()
        )
          newErrors.achieverAmount = "Amount is required";

        if (!achiever.image) newErrors.achieverImage = "Photo is required";

        if (tab === "self") {
          if (!promoter.name?.trim())
            newErrors.promoterName = "Name is required";
          if (!promoter.role) newErrors.promoterRole = "Role is required";
          if (!promoter.mobile?.trim())
            newErrors.promoterMobile = "Mobile is required";
          if (!promoter.image) newErrors.promoterImage = "Photo is required";
        }
        if (selectedLinks.length === 0 && customFiles.length === 0)
          newErrors.topupline = "Select at least 1 image";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
      };

  const clearError = (key) => {
    if (errors[key])
      setErrors((prev) => {
        const e = { ...prev };
        delete e[key];
        return e;
      });
  };

  const toggleLink = (link) => {
    setSelectedLinks((prev) =>
      prev.includes(link) ? prev.filter((l) => l !== link) : [...prev, link],
    );
  };

  // ─── Submit & persist ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    const formData = {
      tab,
      achiever: {
        ...achiever,
        achieverName: `${achiever.title || ""} ${achiever.name || ""}`.trim(),
        // If image is already a base64 string (restored), keep it; else convert Blob
        image: achiever.image ? await toBase64(achiever.image) : null,
      },
      promoter:
        tab === "self"
          ? {
              ...promoter,
              image: promoter.image ? await toBase64(promoter.image) : null,
            }
          : null,
      selectedLinks,
    };

    localStorage.setItem("mlmform", JSON.stringify(formData));
    navigate("/editor");
  };

  // ─── Clear saved form (optional reset button) ──────────────────────────────
  const handleReset = () => {
    localStorage.removeItem("mlmform");
    setTab("team");
    setAchiever({});
    setPromoter({});
    setSelectedLinks(() => {
      const mlmProfile = JSON.parse(localStorage.getItem("mlmProfile"));
      return mlmProfile?.topuplineURLs || [];
    });
    setCustomFiles([]);
    setErrors({});
  };

  return (
    <div className="w-full space-y-5 pt-0 pb-32">
      {/* ── Hero header image ── */}
      {formImage ? (
        <div className="relative w-full overflow-hidden rounded-b-[24px] bg-muted/10">
          <img src={formImage} alt="" className="w-full h-[130px] object-contain" />
        </div>
      ) : null}

      <div className="px-4 space-y-5">
        {/* ── Tabs ── */}
        {isMeeting ? null : (
          <div className="flex gap-1.5 p-1 bg-muted/30 rounded-2xl border border-border/50">
            {[
              { key: "team", label: "For Team", icon: <Persons width={13} height={13} /> },
              { key: "self", label: "For Self", icon: <Person width={13} height={13} /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                  tab === key ? "bg-accent text-white shadow-md shadow-accent/20" : "text-muted-foreground"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Top Upline Images ── */}
        {company && (
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
              <p className="text-[13px] font-bold text-foreground">Top Upline Photos</p>
            </div>
            <div className="w-full">
              <MultiImagePicker
                companyImages={company.topuplines || []}
                selectedLinks={selectedLinks}
                onToggleLink={(link) => { toggleLink(link); clearError("topupline"); }}
                customFiles={customFiles}
                onAddCustomFiles={(files) => { setCustomFiles(files); clearError("topupline"); }}
                onRemoveCustomFile={(i) => setCustomFiles((prev) => prev.filter((_, idx) => idx !== i))}
                inputRef={inputRef}
                inlineStrip
              />
            </div>
            <InlineError message={errors.topupline} />
          </div>
        )}

        {/* ── Meeting / Income sub-forms ── */}
        {isMeeting ? <MeetingForm /> : null}
        {isIncome ? <IncomeForm /> : null}

        {/* ── Achiever Details ── */}
        {isMeeting ? null : (
          <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
              <p className="text-[13px] font-bold text-foreground">Achiever Details</p>
            </div>

            <div className="flex gap-2 items-end">
              <div className="w-[80px]">
                <Select
                  placeholder="Title"
                  selectedKey={achiever.title || "Mr."}
                  onSelectionChange={(key) => {
                    setAchiever((p) => ({ ...p, title: key, achieverName: `${key}${p.name || ""}`.trim() }));
                  }}
                  className="w-full text-[11px]"
                >
                  <Label className="text-[11px] text-foreground/60 font-semibold">Title</Label>
                  <Select.Trigger><Select.Value style={{ fontSize: 12 }} /><Select.Indicator /></Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {["Mr.", "Mrs.", "Dr."].map((opt) => (
                        <ListBox.Item key={opt} id={opt} textValue={opt} style={{ fontSize: 12 }}>{opt}<ListBox.ItemIndicator /></ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              <div className="flex-1">
                <IconTextField
                  placeholder="Full Name"
                  icon={Person}
                  value={achiever.name || ""}
                  onChange={(v) => {
                    const sanitized = sanitizeName(v);
                    setAchiever((p) => ({ ...p, name: sanitized, achieverName: `${p.title || "Mr."} ${sanitized}`.trim() }));
                    clearError("achieverName");
                  }}
                  error={errors.achieverName}
                  maxLength={30}
                />
              </div>
            </div>

            <IconTextField
              label="From team / City"
              placeholder="City or Team Name"
              icon={LocationArrow}
              value={achiever.city || ""}
              onChange={(v) => { setAchiever((p) => ({ ...p, city: sanitizeFormValue(v, 40) })); clearError("achieverCity"); }}
              error={errors.achieverCity}
              maxLength={40}
            />

            {isClosing && (
              <div>
                <Select
                  placeholder="Select"
                  selectedKey={closeFilter}
                  onSelectionChange={(k) => setCloseFilter(k)}
                  className="w-full text-xs"
                >
                  <Label className="text-xs text-accent/70 font-medium">Filter</Label>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {["SP", "BV", "SI", "PV"].map((k) => (
                        <ListBox.Item key={k} id={k} textValue={k}>{k}<ListBox.ItemIndicator /></ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            )}

            {isAchievment || isWelcome || isAnyversary || isIncome || isBonanza ? null : (
              <IconTextField
                label={isClosing ? `Enter ${closeFilter} Amount` : "Amount (₹)"}
                placeholder="XXXX"
                type="number"
                icon={CircleDollar}
                value={achiever.amount || ""}
                onChange={(v) => { setAchiever((p) => ({ ...p, amount: sanitizeAmount(v) })); clearError("achieverAmount"); }}
                error={errors.achieverAmount}
                maxLength={7}
                inputMode="numeric"
              />
            )}

            {isAchievment ? null : (
              <div>
                <p className="text-[11px] font-semibold text-foreground/60 mb-2">Achiever Photo</p>
                <ImageUploadWithBgRemove
                  onImageReady={(img) => { setAchiever((p) => ({ ...p, image: img })); clearError("achieverImage"); }}
                  setEditingImage={setEditingImage}
                  setOnImageDone={setOnImageDone}
                  currentImage={achiever.image}
                  trigger={<UploadZone label="Upload achiever photo" hasError={!!errors.achieverImage} />}
                  setOpen={setOpen}
                  open={open}
                  type="form"
                  editingType={editingType}
                  setEditingType={setEditingType}
                />
                <InlineError message={errors.achieverImage} />
              </div>
            )}
          </div>
        )}

        {isAchievment ? (
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
              <p className="text-[13px] font-bold text-foreground">Achievement Details</p>
            </div>
            <AchievementForm editingType={editingType} setEditingType={setEditingType} />
          </div>
        ) : null}

        {!isMeeting && tab === "self" && company ? (
          <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
              <p className="text-[13px] font-bold text-foreground">Promoter Details</p>
            </div>

            <IconTextField
              label="Name"
              placeholder="Promoter full name"
              icon={PersonPlus}
              value={promoter.name || ""}
              onChange={(v) => { setPromoter((p) => ({ ...p, name: sanitizeName(v) })); clearError("promoterName"); }}
              error={errors.promoterName}
              maxLength={30}
            />

            <div>
              <Select
                placeholder="Select role"
                isInvalid={!!errors.promoterRole}
                selectedKey={promoter.role || null}
                onSelectionChange={(key) => { setPromoter((p) => ({ ...p, role: key })); clearError("promoterRole"); }}
                className="w-full text-xs"
              >
                <Label className="text-xs text-accent/70 font-medium">Role</Label>
                <Select.Trigger><Select.Value style={{ fontSize: 12 }} /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {(company.profile || []).map((p) => (
                      <ListBox.Item key={p.profilename} id={p.profilename} textValue={p.profilename} style={{ fontSize: 12 }}>
                        {p.profilename}<ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <InlineError message={errors.promoterRole} />
            </div>

            <IconTextField
              label="Mobile"
              placeholder="10-digit mobile number"
              type="tel"
              inputMode="tel"
              icon={Handset}
              value={promoter.mobile || ""}
              onChange={(v) => { setPromoter((p) => ({ ...p, mobile: sanitizePhone(v) })); clearError("promoterMobile"); }}
              error={errors.promoterMobile}
              maxLength={10}
            />

            <div>
              <p className="text-[11px] font-semibold text-foreground/60 mb-2">Promoter Photo</p>
              <ImageUploadWithBgRemove
                onImageReady={(img) => { setPromoter((p) => ({ ...p, image: img })); clearError("promoterImage"); }}
                setEditingImage={setEditingImage}
                setOnImageDone={setOnImageDone}
                currentImage={promoter.image}
                trigger={<UploadZone label="Upload promoter photo" hasError={!!errors.promoterImage} />}
                setOpen={setOpen}
                open={open}
              />
              <InlineError message={errors.promoterImage} />
            </div>
          </div>
        ) : null}
      </div>

      {isMeeting ? null : (
        <div className="fixed bottom-[58px] left-0 right-0 px-4 py-3 bg-background/95 backdrop-blur-xl border-t border-border z-30 space-y-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl text-white font-bold text-[15px] transition-all active:scale-[0.98] shadow-xl shadow-accent/20"
            style={{ background: "linear-gradient(135deg, #0e245c 0%, #1a3a8a 100%)" }}
          >
            Save &amp; Create Design
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Reset Form
          </button>
        </div>
      )}

      <Modal isOpen={open}>
        <Modal.Backdrop>
          <Modal.Container placement="center" size="full">
            <Modal.Dialog className="w-full bg-transparent shadow-none">
              <ImageEditorCanvas
                src={editingImage}
                onDone={(blob) => { onImageDone(blob); setEditingImage(null); }}
                onCancel={() => setEditingImage(null)}
                setOpen={setOpen}
              />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}