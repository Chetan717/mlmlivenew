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
  maxImages = 7, // ✅ max limit
  inlineStrip = false,
}) {
  const [tab, setTab] = useState("company");
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const colClass =
    {
      3: "grid-cols-3",
      4: "grid-cols-4",
    }[companyGridCols] || "grid-cols-4";

  // ✅ total count
  const totalSelected = selectedLinks.length + customFiles.length;
  const isLimitReached = totalSelected >= maxImages;

  // ✅ auto close modal when limit reached (nice UX)
  useEffect(() => {
    if (isLimitReached) {
      setTimeout(() => setOpen(false), 400);
    }
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
        /* Open Picker Button */
        <div
          onClick={() => setOpen(true)}
          className="text-white h-[40px] w-[40px] flex gap-1 border border-border justify-center items-center font-semibold bg-muted/40 p-2 rounded-full transition hover:bg-muted/60"
        >
          <img src={photoupload} alt="Upload" className="w-4 h-4 text-accent" />
          {/* <p className="text-[10px] text-muted-foreground">Upload Image</p> */}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={open} onOpenChange={handleClose}>
        <Modal.Backdrop>
          <Modal.Container className="w-full">
            <Modal.Dialog className="rounded-2xl shadow-2xl bg-background border border-border">
              <Modal.CloseTrigger />

              <Modal.Header>
                <Modal.Heading className="text-[17px] font-bold mb-5 text-foreground">
                  Select Images
                </Modal.Heading>
              </Modal.Header>

              <div className="flex flex-col gap-2 justify-center items-center">
                {/* Tabs */}
                <div className="flex justify-center items-center gap-3 mb-3">
                  {[
                    { key: "company", label: "From company" },
                    { key: "upload", label: "Upload manually" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium border transition ${
                        tab === key
                          ? "bg-accent text-white border-accent"
                          : "bg-background border-border text-foreground/70 hover:border-accent/50"
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
                      <p className="text-[11px] text-muted-foreground">
                        No images found in company data.
                      </p>
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
                              className={`relative border-2 rounded-xl p-1 w-[70px] h-[70px] transition overflow-hidden bg-muted/20 ${
                                selected
                                  ? "border-accent shadow-md"
                                  : isLimitReached
                                    ? "border-border/30 opacity-50 cursor-not-allowed"
                                    : "border-border hover:border-accent"
                              }`}
                            >
                              {img.link ? (
                                <img
                                  src={img.link}
                                  alt=""
                                  className="w-[70px] h-[70px] object-contain rounded-lg"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted/40 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                                  No image
                                </div>
                              )}

                              {/* Selected Tick */}
                              {selected && (
                                <span className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow">
                                  <svg
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      d="M2 6l3 3 5-5"
                                      stroke="#fff"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
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
                  <>
                    <button
                      type="button"
                      disabled={isLimitReached}
                      onClick={() => inputRef.current?.click()}
                      className={`mb-3 px-2 py-2 text-xs rounded-lg shadow-sm font-bold transition flex items-center gap-1 ${
                        isLimitReached
                          ? "bg-muted/40 text-muted-foreground cursor-not-allowed"
                          : "bg-muted/40 text-foreground/70 hover:bg-accent/10"
                      }`}
                    >
                      <img
                        src={photoupload}
                        alt="Upload"
                        className="w-4 h-4 text-accent"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Upload Image
                      </p>
                    </button>

                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (!files.length) return;

                        const remaining = maxImages - totalSelected;
                        const allowedFiles = files.slice(0, remaining);

                        onAddCustomFiles(
                          allowedFiles.map((file) => ({
                            file,
                            previewURL: URL.createObjectURL(file),
                          })),
                        );
                        e.target.value = "";
                      }}
                    />

                    {customFiles.length > 0 && (
                      <div className={`grid ${colClass} gap-3`}>
                        {customFiles.map((item, i) => (
                          <div
                            key={i}
                            className="relative border-2 border-accent rounded-xl p-1.5 bg-muted/20 overflow-hidden"
                          >
                            <img
                              src={item.previewURL}
                              alt=""
                              className={`w-full ${thumbHeight} object-contain rounded-lg`}
                            />

                            <button
                              type="button"
                              onClick={() => onRemoveCustomFile(i)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition shadow"
                            >
                              <svg
                                viewBox="0 0 12 12"
                                fill="none"
                                className="w-3 h-3"
                              >
                                <path
                                  d="M2 2l8 8M10 2l-8 8"
                                  stroke="#fff"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Count Indicator */}
                <p
                  className={`text-xs mt-2 font-medium ${
                    isLimitReached ? "text-red-500" : "text-accent"
                  }`}
                >
                  {totalSelected} / {maxImages} image(s) selected
                </p>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
