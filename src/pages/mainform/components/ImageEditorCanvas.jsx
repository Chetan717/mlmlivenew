import { useState, useRef, useCallback, useEffect } from "react";

// ── Helpers ───────────────────────────────────────────────────────
function containDims(imgW, imgH, boxW, boxH) {
  const ia = imgW / imgH, ba = boxW / boxH;
  return ia > ba ? { dw: boxW, dh: boxW / ia } : { dw: boxH * ia, dh: boxH };
}

function getSelType() {
  try { return JSON.parse(localStorage.getItem("selType")) || {}; }
  catch { return {}; }
}

// ── Component ─────────────────────────────────────────────────────
export default function ImageEditorCanvas({
  src,
  onDone,
  onCancel,
  setOpen,
  editingType,
  setEditingType,
}) {
  const [currentSrc,    setCurrentSrc]    = useState(src);
  const [reopenedOnce,  setReopenedOnce]  = useState(false);

  // ── Ratio logic ───────────────────────────────────────────────
  const selll   = getSelType();
  const isAchv  = selll?.type === "Achievements";

  const ASPECT_RATIO =
    editingType === "proof"   ? 2 / 2 :
    editingType === "feature" ? 2 / 2 :
    editingType === "main"    ? 2 / 1 :
                                2 / 2.5;

  const INITIAL_W = 0.8;
  const INITIAL_H = INITIAL_W / ASPECT_RATIO;
  const INITIAL_CROP = {
    x: (1 - INITIAL_W) / 2,
    y: (1 - INITIAL_H) / 2,
    w: INITIAL_W,
    h: INITIAL_H,
  };

  // ── Canvas size (responsive) ──────────────────────────────────
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const imgRef       = useRef(null);
  const dragRef      = useRef(null);
  const rafRef       = useRef(null);   // ← rAF handle to avoid duplicate frames

  const [canvasW, setCanvasW] = useState(300);
  const [canvasH, setCanvasH] = useState(340);
  const canvasSizeRef = useRef({ w: 300, h: 340 }); // ← always-current size for draw()

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      const cw = Math.max(200, Math.min(width - 16, 360));
      const ch = Math.round(cw / ASPECT_RATIO);
      const clampedH = Math.min(ch, 400);
      canvasSizeRef.current = { w: cw, h: clampedH };
      setCanvasW(cw);
      setCanvasH(clampedH);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [ASPECT_RATIO]);

  // ── Core state ────────────────────────────────────────────────
  const [rotation, setRotation] = useState(0);
  const [flipH,    setFlipH]    = useState(false);
  const [flipV,    setFlipV]    = useState(false);
  const [imgScale, setImgScale] = useState(50);
  const [tab,      setTab]      = useState("crop");

  // ─────────────────────────────────────────────────────────────
  // KEY FIX: crop lives in BOTH a ref (for zero-lag drawing) AND
  // state (only for re-renders that actually need it, e.g. reset).
  // During drag we only touch the ref and schedule a rAF draw.
  // ─────────────────────────────────────────────────────────────
  const cropRef   = useRef({ ...INITIAL_CROP });
  const [crop, _setCrop] = useState({ ...INITIAL_CROP });

  // Sync both ref and state together (used outside of drag)
  const setCrop = useCallback((val) => {
    const next = typeof val === "function" ? val(cropRef.current) : val;
    cropRef.current = next;
    _setCrop(next);
  }, []);

  // Mirror mutable values in refs so draw() never closes over stale state
  const rotationRef = useRef(0);
  const flipHRef    = useRef(false);
  const flipVRef    = useRef(false);
  const imgScaleRef = useRef(50);

  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => { flipHRef.current    = flipH;     }, [flipH]);
  useEffect(() => { flipVRef.current    = flipV;     }, [flipV]);
  useEffect(() => { imgScaleRef.current = imgScale;  }, [imgScale]);

  // ── Sync src + reset when parent reopens editor ───────────────
  useEffect(() => {
    setCurrentSrc(src);
    setReopenedOnce(false);
    const ic = { ...INITIAL_CROP };
    cropRef.current = ic;
    _setCrop(ic);
    setRotation(0); setFlipH(false); setFlipV(false); setImgScale(50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // ── Draw — reads ONLY from refs, never from state ─────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;

    const { w: canvasW, h: canvasH } = canvasSizeRef.current;
    const rotation = rotationRef.current;
    const flipH    = flipHRef.current;
    const flipV    = flipVRef.current;
    const imgScale = imgScaleRef.current;
    const { x, y, w, h } = cropRef.current;

    const dpr = window.devicePixelRatio || 1;
    canvas.width        = canvasW * dpr;
    canvas.height       = canvasH * dpr;
    canvas.style.width  = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Draw image
    const rot90 = rotation % 180 !== 0;
    const srcW  = rot90 ? img.naturalHeight : img.naturalWidth;
    const srcH  = rot90 ? img.naturalWidth  : img.naturalHeight;
    const sf    = imgScale / 50;
    const { dw, dh } = containDims(srcW, srcH, canvasW * sf, canvasH * sf);

    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    // Crop overlay
    const px = x * canvasW, py = y * canvasH;
    const pw = w * canvasW, ph = h * canvasH;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(0,       0,       canvasW,           py);
    ctx.fillRect(0,       py + ph, canvasW,           canvasH - py - ph);
    ctx.fillRect(0,       py,      px,                ph);
    ctx.fillRect(px + pw, py,      canvasW - px - pw, ph);

    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth   = 1.6;
    ctx.strokeRect(px, py, pw, ph);

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth   = 0.8;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(px + (pw/3)*i, py); ctx.lineTo(px + (pw/3)*i, py+ph); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py + (ph/3)*i); ctx.lineTo(px+pw, py + (ph/3)*i); ctx.stroke();
    }

    // L-bracket corner handles
    const BL = 16, BT = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth   = BT;
    ctx.lineCap     = "square";
    [[px, py, 1, 1], [px+pw, py, -1, 1], [px, py+ph, 1, -1], [px+pw, py+ph, -1, -1]]
      .forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx + sx*BL, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy*BL);
        ctx.stroke();
      });
    ctx.restore();
  }, []); // ← no deps — always reads from refs

  // ── Schedule a single rAF draw (deduplicated) ─────────────────
  const scheduleDraw = useCallback(() => {
    if (rafRef.current) return;            // already queued
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  // ── Load image ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentSrc) return;
    imgRef.current = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    let objectUrl = null;
    img.onload  = () => { imgRef.current = img; scheduleDraw(); };
    img.onerror = (e) => console.error("ImageEditorCanvas load error:", currentSrc, e);
    if (currentSrc instanceof Blob) { objectUrl = URL.createObjectURL(currentSrc); img.src = objectUrl; }
    else img.src = currentSrc;
    return () => {
      img.onload = null; img.onerror = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [currentSrc, scheduleDraw]);

  // Re-draw whenever state-driven values change (not during drag)
  useEffect(() => {
    if (imgRef.current) scheduleDraw();
  }, [rotation, flipH, flipV, imgScale, crop, canvasW, canvasH, scheduleDraw]);

  // ── Pointer helpers ───────────────────────────────────────────
  const normPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { nx: (cx - rect.left) / rect.width, ny: (cy - rect.top) / rect.height };
  };

  const hitTest = (nx, ny) => {
    const { x, y, w, h } = cropRef.current;
    const { w: cw, h: ch } = canvasSizeRef.current;
    const HX = 18 / cw, HY = 18 / ch;
    for (const c of [
      { t: "tl", cx: x,     cy: y     },
      { t: "tr", cx: x + w, cy: y     },
      { t: "bl", cx: x,     cy: y + h },
      { t: "br", cx: x + w, cy: y + h },
    ]) {
      if (Math.abs(nx - c.cx) < HX && Math.abs(ny - c.cy) < HY) return c.t;
    }
    if (nx > x && nx < x+w && ny > y && ny < y+h) return "move";
    return null;
  };

  const onDown = (e) => {
    e.preventDefault();
    const { nx, ny } = normPos(e);
    const type = hitTest(nx, ny);
    if (!type) return;
    dragRef.current = { type, sx: nx, sy: ny, oc: { ...cropRef.current } };
  };

  const onMove = (e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const { nx, ny } = normPos(e);
    const { type, sx, sy, oc } = dragRef.current;
    const dx = nx - sx, dy = ny - sy;
    const MIN = 0.08;

    // ── Compute next crop entirely in local vars — no setState ──
    let { x, y, w, h } = oc;

    if (type === "move") {
      x = Math.max(0, Math.min(1 - w, oc.x + dx));
      y = Math.max(0, Math.min(1 - h, oc.y + dy));
    } else {
      const dMain = Math.abs(dx) > Math.abs(dy) ? dx : dy * ASPECT_RATIO;

      if (type === "br") { w = Math.max(MIN, oc.w + dMain); h = w / ASPECT_RATIO; }
      else if (type === "bl") { w = Math.max(MIN, oc.w - dMain); h = w / ASPECT_RATIO; x = oc.x + oc.w - w; }
      else if (type === "tr") { w = Math.max(MIN, oc.w + dMain); h = w / ASPECT_RATIO; y = oc.y + oc.h - h; }
      else if (type === "tl") { w = Math.max(MIN, oc.w - dMain); h = w / ASPECT_RATIO; x = oc.x + oc.w - w; y = oc.y + oc.h - h; }

      x = Math.max(0, x); y = Math.max(0, y);
      if (x + w > 1) { w = 1 - x; h = w / ASPECT_RATIO; }
      if (y + h > 1) { h = 1 - y; w = h * ASPECT_RATIO; }
    }

    // Write directly to ref — zero React overhead
    cropRef.current = { x, y, w, h };

    // Schedule one rAF draw (skips duplicate frames automatically)
    scheduleDraw();
  };

  const onMoveCursor = (e) => {
    const { nx, ny } = normPos(e);
    const t = hitTest(nx, ny);
    const map = { tl:"nwse-resize", tr:"nesw-resize", bl:"nesw-resize", br:"nwse-resize", move:"move" };
    canvasRef.current.style.cursor = map[t] || "crosshair";
  };

  // On release: sync ref → state (one render, after drag ends)
  const onUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
      _setCrop({ ...cropRef.current }); // sync state so downstream consumers stay consistent
    }
  };

  // ── Export ────────────────────────────────────────────────────
  const handleDone = () => {
    const img = imgRef.current;
    if (!img) return;

    const OUTPUT_SIZE = Math.max(img.naturalWidth, img.naturalHeight, 1024);
    const OUTPUT_H    = OUTPUT_SIZE * (canvasH / canvasW);
    const rotation    = rotationRef.current;
    const flipH       = flipHRef.current;
    const flipV       = flipVRef.current;
    const imgScale    = imgScaleRef.current;
    const rot90 = rotation % 180 !== 0;
    const srcW  = rot90 ? img.naturalHeight : img.naturalWidth;
    const srcH  = rot90 ? img.naturalWidth  : img.naturalHeight;
    const sf    = imgScale / 50;
    const { dw, dh } = containDims(srcW, srcH, OUTPUT_SIZE * sf, OUTPUT_H * sf);

    const full = document.createElement("canvas");
    full.width = OUTPUT_SIZE; full.height = OUTPUT_H;
    const ctx = full.getContext("2d");
    ctx.save();
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_H / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
    ctx.restore();

    const { x, y, w, h } = cropRef.current;
    const rawW = Math.round(w * OUTPUT_SIZE);
    const rawH = Math.round(h * OUTPUT_H);
    const MAX  = 900;
    const scale = Math.min(MAX / rawW, MAX / rawH, 1);
    const finalW = Math.round(rawW * scale);
    const finalH = Math.round(rawH * scale);

    const cropped = document.createElement("canvas");
    cropped.width = finalW; cropped.height = finalH;
    const cCtx = cropped.getContext("2d");
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = "high";
    cCtx.drawImage(full, x*OUTPUT_SIZE, y*OUTPUT_H, w*OUTPUT_SIZE, h*OUTPUT_H, 0, 0, finalW, finalH);

    cropped.toBlob((blob) => {
      onDone(blob);
      if (isAchv) {
        if (!reopenedOnce) { setReopenedOnce(true); setCurrentSrc(blob); return; }
        setOpen(false); return;
      }
      setOpen(false);
    }, "image/png");
  };

  const onCancelClick = () => { setOpen(false); onCancel(); };

  const ratioLabel =
    editingType === "proof"   ? "1:1" :
    editingType === "feature" ? "1:1" :
    editingType === "main"    ? "2:1" : "2:3";

  // ── UI ────────────────────────────────────────────────────────
  const tabs = [
    { id: "rotate", label: "Rotate", icon: "↺" },
    { id: "flip",   label: "Flip",   icon: "⇄" },
    { id: "crop",   label: "Crop",   icon: "⊡" },
    { id: "scale",  label: "Scale",  icon: "⤢" },
  ];

  const btnBase = {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 3, padding: "10px 6px", flex: 1,
  };

  return (
    <div ref={containerRef} className="rounded-xl" style={{
      display: "flex", justifyItems: "center", flexDirection: "column",
      height: "100%", width: "100%",
      backgroundColor: "#181818",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      userSelect: "none",
    }}>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", borderBottom: "1px solid #2c2c2c", flexShrink: 0,
      }}>
        <button onClick={onCancelClick} style={{ background:"none", border:"none", color:"#aaa", fontSize:15, cursor:"pointer", padding:"4px 6px" }}>✕</button>
        <button onClick={handleDone} style={{ background:"none", border:"none", color:"#f97316", fontSize:15, fontWeight:700, cursor:"pointer", padding:"4px 6px" }}>Done</button>
      </div>

      {/* ── Canvas ── */}
      <div style={{
        flex: 1, display:"flex", width:"100%",
        backgroundColor: "#111", overflow:"hidden", minHeight: 300,
      }}>
        <canvas
          ref={canvasRef}
          style={{ touchAction:"none", display:"block" }}
          onMouseDown={onDown}
          onMouseMove={(e) => { onMove(e); onMoveCursor(e); }}
          onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        />
      </div>

      {/* ── Tab-specific controls ── */}
      <div style={{ backgroundColor:"#f4f4f4", borderTop:"1px solid #e0e0e0", flexShrink: 0 }}>
        {tab === "rotate" && (
          <div style={{ padding:"5px 8px", display:"flex", justifyContent:"center", gap:14 }}>
            <button onClick={() => setRotation(r => r - 90)} style={{ padding:"4px 8px", backgroundColor:"#fff", border:"1px solid #ddd", borderRadius:10, fontSize:14, cursor:"pointer" }}>↺</button>
            <button onClick={() => setRotation(r => r + 90)} style={{ padding:"4px 8px", backgroundColor:"#fff", border:"1px solid #ddd", borderRadius:10, fontSize:14, cursor:"pointer" }}>↻</button>
          </div>
        )}
        {tab === "flip" && (
          <div style={{ padding:"5px 8px", display:"flex", justifyContent:"center", gap:10 }}>
            {[["⇄", flipH, () => setFlipH(v => !v)], ["⇅", flipV, () => setFlipV(v => !v)]].map(([label, active, fn]) => (
              <button key={label} onClick={fn} style={{
                padding:"4px 8px",
                backgroundColor: active ? "#f97316" : "#fff",
                color: active ? "#fff" : "#333",
                border:"1px solid #ddd", borderRadius:10,
                fontSize:14, fontWeight:600, cursor:"pointer",
              }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Scale slider ── */}
      <div style={{ backgroundColor:"#f4f4f4", padding:"4px 18px 10px", borderTop:"1px solid #e8e8e8", flexShrink: 0 }}>
        <div style={{ textAlign:"center", fontSize:14, fontWeight:700, color:"#f97316", marginBottom:4 }}>
          {imgScale}%
        </div>
        <div style={{ position:"relative", height:34, display:"flex", alignItems:"center" }}>
          <div style={{
            position:"absolute", left:0, right:0,
            display:"flex", justifyContent:"space-between", alignItems:"flex-end",
            height:18, pointerEvents:"none", padding:"0 2px",
          }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} style={{
                width: 1.5,
                height: i % 5 === 0 ? 13 : 6,
                backgroundColor: i === 17 ? "#f97316" : "#bbb",
                borderRadius: 1,
              }} />
            ))}
          </div>
          <input type="range" min={10} max={150} step={1} value={imgScale}
            onChange={(e) => setImgScale(Number(e.target.value))}
            style={{ width:"100%", appearance:"none", WebkitAppearance:"none", background:"transparent", height:34, cursor:"pointer", position:"relative", zIndex:1 }}
          />
        </div>
        <style>{`
          input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:5px;height:26px;background:#f97316;border-radius:3px;cursor:pointer;}
          input[type=range]::-webkit-slider-runnable-track{background:transparent;height:34px;}
        `}</style>
      </div>

      {/* ── Bottom tab bar ── */}
      <div className="rounded-b-xl" style={{ backgroundColor:"#1e1e1e", display:"flex", borderTop:"1px solid #2a2a2a", flexShrink: 0 }}>
        <button
          onClick={() => {
            setRotation(0); setFlipH(false); setFlipV(false); setImgScale(50);
            setCrop({ ...INITIAL_CROP });
          }}
          style={{ ...btnBase }}
        >
          <span style={{ fontSize:18, color:"#888" }}>↺</span>
          <span style={{ fontSize:9, color:"#666" }}>Reset</span>
        </button>
        {tabs.map(({ id, label, icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              ...btnBase,
              borderTop: active ? "2.5px solid #f97316" : "2.5px solid transparent",
            }}>
              <span style={{ fontSize:18, color: active ? "#f97316" : "#888" }}>{icon}</span>
              <span style={{ fontSize:9, color: active ? "#f97316" : "#777", fontWeight: active ? 700 : 400 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}