import { useState, useEffect } from "react";
import { Modal } from "@heroui/react";
import photoupload from "./photoupload.png";

export default function MultiImagePicker({
  companyImages,
  selectedLinks,
  onToggleLink,
  customFiles,
  onAddCustomFiles,
  onRemoveCustomFile,
  inputRef,
  companyGridCols = 4,
  thumbHeight = "h-10",
  type,
  maxImages = 7,
  inlineStrip = false,
}) {
  const [tab, setTab]   = useState("company");
  const [open, setOpen] = useState(false);

  const handleClose = () => setOpen(false);

  const colClass = { 3: "grid-cols-3", 4: "grid-cols-3" }[companyGridCols] || "grid-cols-3";

  const totalSelected = selectedLinks.length + customFiles.length;
  const allowed       = type === "Logo" ? 3 : maxImages;
  const isLimitReached = totalSelected >= allowed;

  useEffect(() => {
    if (isLimitReached) setTimeout(() => setOpen(false), 400);
  }, [isLimitReached]);

  return (
    <>
      {inlineStrip ? (
        /* ── Inline layout: scrollable thumbnails + pinned upload, one combined border ── */
        <div className="w-full flex items-center gap-2 rounded-2xl border border-border p-2">
          {/* Horizontally scrollable thumbnails area */}
          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {totalSelected === 0 && (
              <span className="text-[11px] text-muted-foreground px-2 py-3">
                No images selected yet
              </span>
            )}
            {selectedLinks.map((link, i) => (
              <div key={link || `sel-${i}`} className="relative flex-shrink-0">
                <img
                  src={link}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-600 font-bold text-transparent"
                />
                <button
                  type="button"
                  onClick={() => onToggleLink(link)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center shadow ring-2 ring-background"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
            {customFiles.map((item, i) => (
              <div
                key={item.previewURL || `cus-${i}`}
                className="relative flex-shrink-0"
              >
                <img
                  src={item.previewURL}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-2 border-accent/50 bg-muted/30"
                />
                <button
                  type="button"
                  onClick={() => onRemoveCustomFile(i)}
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
            onClick={() => setOpen(true)}
            disabled={isLimitReached}
            className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-dashed border-border hover:border-accent/60 hover:bg-accent/5 flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
            title={isLimitReached ? "Limit reached" : "Add image"}
          >
            <img
              src={photoupload}
              alt="Upload"
              className="w-5 h-5 opacity-70"
            />
          </button>
        </div>
      ) : (
        /* ── Trigger button ── */
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 border-dashed border-border hover:border-accent/60 bg-muted/20 hover:bg-accent/5 cursor-pointer transition-all duration-200 group"
        >
          <div className="w-9 h-9 rounded-xl bg-muted/40 border border-border group-hover:bg-accent/10 group-hover:border-accent/30 flex items-center justify-center transition-all duration-200 flex-shrink-0">
            <img
              src={photoupload}
              alt=""
              className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity"
            />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-semibold text-foreground group-hover:text-accent transition-colors">
              {totalSelected > 0
                ? `${totalSelected} image${totalSelected > 1 ? "s" : ""} selected`
                : "Upload Image"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {totalSelected > 0
                ? `Tap to manage · max ${allowed}`
                : `From company or your gallery · max ${allowed}`}
            </p>
          </div>
          {totalSelected > 0 && (
            <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          )}
        </button>
      )}

      {/* ── Modal ── */}
      <Modal isOpen={open} onOpenChange={handleClose}>
        <Modal.Backdrop>
          <Modal.Container className="w-full">
            <Modal.Dialog className="rounded-3xl shadow-2xl bg-background border border-border overflow-hidden">
              <Modal.CloseTrigger />

              {/* Header */}
              <Modal.Header className="px-5 pt-5 pb-3 border-b border-border">
                <Modal.Heading className="text-[17px] font-display font-bold text-foreground">
                  Select Images
                </Modal.Heading>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {totalSelected} of {allowed} selected
                </p>
              </Modal.Header>

              <div className="flex flex-col gap-4 p-5">
                {/* ── Tab bar ── */}
                <div className="flex gap-1.5 p-1 bg-muted/30 rounded-2xl">
                  {[
                    { key: "company", label: "Company Photos" },
                    { key: "upload", label: "Upload New" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold transition-all duration-200 ${
                        tab === key
                          ? "bg-accent text-white shadow-md shadow-accent/20"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── Company Images ── */}
                {tab === "company" && (
                  <>
                    {companyImages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                          </svg>
                        </div>
                        <p className="text-[12px] text-muted-foreground font-medium">
                          No company images found
                        </p>
                      </div>
                    ) : (
                      <div className={`grid ${colClass} gap-3`}>
                        {companyImages.map((img) => {
                          const selected = selectedLinks.includes(img.link);
                          return (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => {
                                if (!selected && isLimitReached) return;
                                onToggleLink(img.link);
                              }}
                              className={`relative border-2 rounded-xl overflow-hidden transition-all duration-150 aspect-square ${
                                selected
                                  ? "border-accent shadow-md shadow-accent/20 scale-95"
                                  : isLimitReached
                                    ? "border-border opacity-40 cursor-not-allowed"
                                    : "border-border hover:border-accent/60 hover:scale-95"
                              }`}
                            >
                              {img.link ? (
                                <img
                                  src={img.link}
                                  alt=""
                                  className="w-full h-full object-contain bg-muted/20"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                                  <span className="text-[10px] text-muted-foreground">
                                    No image
                                  </span>
                                </div>
                              )}
                              {selected && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow">
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                  >
                                    <path
                                      d="M2 6l3 3 5-5"
                                      stroke="white"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* ── Upload Tab ── */}
                {tab === "upload" && (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      disabled={isLimitReached}
                      onClick={() => inputRef.current?.click()}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed transition-all duration-200 ${
                        isLimitReached
                          ? "border-border bg-muted/20 opacity-50 cursor-not-allowed"
                          : "border-border hover:border-accent/60 bg-muted/20 hover:bg-accent/5 cursor-pointer group"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-muted/40 border border-border group-hover:bg-accent/10 group-hover:border-accent/30 flex items-center justify-center flex-shrink-0 transition-all">
                        <img src={photoupload} alt="" className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-[13px] font-semibold text-foreground group-hover:text-accent transition-colors">
                          {isLimitReached
                            ? "Image limit reached"
                            : "Choose from gallery"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          JPG, PNG, WEBP
                        </p>
                      </div>
                    </button>

                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (!files.length) return;
                        if (totalSelected >= allowed) return;
                        onAddCustomFiles([files[0]]);
                        e.target.value = "";
                      }}
                    />

                    {customFiles.length > 0 && (
                      <div className={`grid ${colClass} gap-3`}>
                        {customFiles.map((item, i) => (
                          <div
                            key={i}
                            className="relative border-2 border-accent/40 rounded-xl overflow-hidden aspect-square"
                          >
                            <img
                              src={item.previewURL}
                              alt=""
                              className={`w-full ${thumbHeight} object-contain bg-muted/20`}
                            />
                            <button
                              type="button"
                              onClick={() => onRemoveCustomFile(i)}
                              className="absolute top-1 right-1 w-5 h-5 bg-danger/80 hover:bg-danger rounded-full flex items-center justify-center transition-colors shadow"
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M2 2l8 8M10 2l-8 8"
                                  stroke="white"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Count indicator */}
                <div
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl ${isLimitReached ? "bg-danger/8 border border-danger/20" : "bg-muted/30"}`}
                >
                  {isLimitReached ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="text-danger"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                  ) : (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                  <p
                    className={`text-[11px] font-bold ${isLimitReached ? "text-danger" : "text-accent"}`}
                  >
                    {totalSelected} / {allowed}{" "}
                    {isLimitReached ? "— limit reached" : "images selected"}
                  </p>
                </div>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
