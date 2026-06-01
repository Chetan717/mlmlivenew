import { useRef, useState } from "react";
import { removeBg } from "../utils/removeBg";

export default function ImageUploadWithBgRemove({
  onImageReady,
  setEditingImage,
  setOnImageDone,
  currentImage,
  onRequestReEdit,
  setOpen,
  open,
  type,
  editingType,
  setEditingType,
}) {
  const inputRef = useRef();
  const [load, setLoad] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [removingBg, setRemovingBg] = useState(false);

  function getSelType() {
    try { return JSON.parse(localStorage.getItem("selType")) || {}; }
    catch { return {}; }
  }
  const selll = getSelType();
  const isAchv = selll?.type === "Achievements";

  const processFile = async (file, shouldRemoveBg) => {
    if (typeof setEditingType === "function") setEditingType(type);
    try {
      setRemovingBg(shouldRemoveBg);
      setLoad(true);
      const processed = shouldRemoveBg ? await removeBg(file) : file;
      const preview = URL.createObjectURL(processed);
      setEditingImage(preview);
      setOnImageDone(() => (blob) => { onImageReady(blob); });
      if (preview) { setOpen(true); setLoad(false); }
    } catch (err) {
      console.error(err);
      alert("Image processing failed");
      setLoad(false);
    }
  };

  const handleFile = (file) => {
    setPendingFile(file);
  };

  const handleChoice = (shouldRemoveBg) => {
    const file = pendingFile;
    setPendingFile(null);
    if (file) processFile(file, shouldRemoveBg);
  };

  const src = currentImage instanceof Blob ? URL.createObjectURL(currentImage) : currentImage;

  return (
    <>
      {load ? (
        /* Loading state */
        <div className="h-[190px] rounded-2xl border-2 border-accent/30 bg-accent/5 flex flex-col items-center justify-center gap-3">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 animate-spin text-accent/30" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4"/>
            </svg>
            <svg className="absolute inset-0 w-12 h-12 animate-spin text-accent" viewBox="0 0 48 48" fill="none" style={{ animationDuration: "0.8s" }}>
              <path d="M24 4a20 20 0 0 1 20 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[12px] font-bold text-accent">Processing image</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {removingBg ? "Removing background..." : "Preparing..."}
            </p>
          </div>
        </div>
      ) : currentImage ? (
        /* Preview state */
        <div
          onClick={() => inputRef.current?.click()}
          className="relative w-full h-[190px] rounded-2xl border-2 border-accent/40 overflow-hidden cursor-pointer group shadow-md"
        >
          <img src={src} alt="Uploaded" className="w-full h-full object-contain bg-muted/20" />
          <div className="absolute inset-0 bg-accent/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 rounded-[14px]">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z"/>
              </svg>
            </div>
            <p className="text-white text-[11px] font-bold">Tap to change</p>
          </div>
          {/* Uploaded badge */}
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-green-500/80 backdrop-blur-sm">
            <p className="text-[9px] font-bold text-white uppercase tracking-wide">Uploaded</p>
          </div>
        </div>
      ) : (
        /* Empty upload zone */
        <div
          onClick={() => inputRef.current?.click()}
          className="h-[190px] rounded-2xl border-2 border-dashed border-border hover:border-accent/60 bg-muted/20 hover:bg-accent/5 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border group-hover:bg-accent/10 group-hover:border-accent/30 flex items-center justify-center transition-all duration-200">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-accent transition-colors">
              <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-foreground group-hover:text-accent transition-colors">Upload photo</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isAchv ? "JPG, PNG supported" : "You can keep or remove the background"}
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files[0];
          if (typeof setEditingType === "function") setEditingType(type);
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {pendingFile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs rounded-2xl bg-background border border-border shadow-2xl p-5">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-accent/10 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z"/>
                </svg>
              </div>
              <p className="text-[14px] font-bold text-foreground">How should we use this photo?</p>
              <p className="text-[11px] text-muted-foreground mt-1">Choose whether to keep the image as is or remove its background.</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleChoice(true)}
                className="w-full py-3 rounded-xl bg-accent text-accent-foreground text-[13px] font-bold hover:opacity-90 transition-opacity"
              >
                Remove Background
              </button>
              <button
                type="button"
                onClick={() => handleChoice(false)}
                className="w-full py-3 rounded-xl bg-muted/60 border border-border text-foreground text-[13px] font-bold hover:bg-muted transition-colors"
              >
                Keep Original
              </button>
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                className="w-full py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
