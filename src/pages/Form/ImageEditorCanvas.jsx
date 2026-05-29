import { useState, useRef, useCallback, useEffect } from "react";

// ── Constants ─────────────────────────────────────────────────────
const CW = 300;          // canvas display width  (px)
const CH = 340;          // canvas display height (px)
const RATIO = 2 / 2.5;    // crop box width/height = 1:2 portrait (locked)

// Initial crop box: centred, fills ~80% of canvas width
const initCrop = () => {
  const w = 0.78;
  const h = w / RATIO;          // 1.56 — taller than canvas, so clamp
  const hClamped = Math.min(h, 0.92);
  const wClamped = hClamped * RATIO;
  return {
    x: (1 - wClamped) / 2,
    y: (1 - hClamped) / 2,
    w: wClamped,
    h: hClamped,
  };
};
const INITIAL_CROP = initCrop();

// ── Helpers ───────────────────────────────────────────────────────
function containDims(imgW, imgH, boxW, boxH) {
  const ia = imgW / imgH, ba = boxW / boxH;
  return ia > ba
    ? { dw: boxW, dh: boxW / ia }
    : { dw: boxH * ia, dh: boxH };
}

// ── Component ─────────────────────────────────────────────────────
export function ImageEditorCanvas({ src, onDone, onCancel }) {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const dragRef    = useRef(null);

  const [rotation, setRotation] = useState(0);
  const [flipH,    setFlipH]    = useState(false);
  const [flipV,    setFlipV]    = useState(false);
  const [imgScale, setImgScale] = useState(50);   // 10–150, image zoom
  const [crop,     setCrop]     = useState(INITIAL_CROP);
  const [tab,      setTab]      = useState("crop");

  // ── Draw ──────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = CW * dpr;
    canvas.height = CH * dpr;
    canvas.style.width  = `${CW}px`;
    canvas.style.height = `${CH}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, CW, CH);

    // ── Draw image (zoomed + rotated + flipped) ────────────────
    const rot90  = rotation % 180 !== 0;
    const srcW   = rot90 ? img.naturalHeight : img.naturalWidth;
    const srcH   = rot90 ? img.naturalWidth  : img.naturalHeight;
    const sf     = imgScale / 50;                       // 1.0 = "100%"
    const { dw, dh } = containDims(srcW, srcH, CW * sf, CH * sf);

    ctx.save();
    ctx.translate(CW / 2, CH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    // ── Crop overlay (always visible) ─────────────────────────
    const { x, y, w, h } = crop;
    const px = x * CW, py = y * CH, pw = w * CW, ph = h * CH;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(0,        0,        CW,           py);
    ctx.fillRect(0,        py + ph,  CW,           CH - py - ph);
    ctx.fillRect(0,        py,       px,           ph);
    ctx.fillRect(px + pw,  py,       CW - px - pw, ph);

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth   = 1.6;
    ctx.strokeRect(px, py, pw, ph);

    // Rule-of-thirds grid
    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ctx.lineWidth   = 0.8;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(px + (pw/3)*i, py); ctx.lineTo(px + (pw/3)*i, py+ph); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py + (ph/3)*i); ctx.lineTo(px+pw, py + (ph/3)*i); ctx.stroke();
    }

    // Corner L-brackets
    const BL = 18, BT = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth   = BT;
    ctx.lineCap     = "square";
    const corners = [
      [px,      py,      1,  1],
      [px+pw,   py,     -1,  1],
      [px,      py+ph,   1, -1],
      [px+pw,   py+ph,  -1, -1],
    ];
    corners.forEach(([cx, cy, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(cx + sx*BL, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy*BL); ctx.stroke();
    });
    ctx.restore();
  }, [rotation, flipH, flipV, imgScale, crop]);

  // ── Load image ────────────────────────────────────────────────
  useEffect(() => {
    if (!src) return;
    imgRef.current = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    let objectUrl = null;
    img.onload = () => { imgRef.current = img; draw(); };
    img.onerror = (e) => console.error("img load error", e);
    if (src instanceof Blob) { objectUrl = URL.createObjectURL(src); img.src = objectUrl; }
    else img.src = src;
    return () => { img.onload = null; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, draw]);

  useEffect(() => { if (imgRef.current) draw(); }, [draw]);

  // ── Pointer helpers ───────────────────────────────────────────
  const normPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { nx: (cx - rect.left) / rect.width, ny: (cy - rect.top) / rect.height };
  };

  const hitTest = (nx, ny) => {
    const { x, y, w, h } = crop;
    const HX = 20 / CW, HY = 20 / CH;
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
    dragRef.current = { type, sx: nx, sy: ny, oc: { ...crop } };
  };

  const onMove = (e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const { nx, ny } = normPos(e);
    const { type, sx, sy, oc } = dragRef.current;
    const dx = nx - sx, dy = ny - sy;
    const MIN = 0.08;

    setCrop(() => {
      let { x, y, w, h } = oc;

      if (type === "move") {
        x = Math.max(0, Math.min(1 - w, oc.x + dx));
        y = Math.max(0, Math.min(1 - h, oc.y + dy));
        return { x, y, w, h };
      }

      // Resize locked to 1:2 — drive from whichever drag axis gives more motion
      const dMain = Math.abs(dx) > Math.abs(dy) ? dx : dy * RATIO;

      if (type === "br") {
        w = Math.max(MIN, oc.w + dMain);
        h = w / RATIO;
      } else if (type === "bl") {
        w = Math.max(MIN, oc.w - dMain);
        h = w / RATIO;
        x = oc.x + oc.w - w;
      } else if (type === "tr") {
        w = Math.max(MIN, oc.w + dMain);
        h = w / RATIO;
        y = oc.y + oc.h - h;
      } else if (type === "tl") {
        w = Math.max(MIN, oc.w - dMain);
        h = w / RATIO;
        x = oc.x + oc.w - w;
        y = oc.y + oc.h - h;
      }

      // Clamp inside canvas
      x = Math.max(0, x);
      y = Math.max(0, y);
      if (x + w > 1) { w = 1 - x; h = w / RATIO; }
      if (y + h > 1) { h = 1 - y; w = h * RATIO; }

      return { x, y, w, h };
    });
  };

  const onUp = () => { dragRef.current = null; };

  // ── Export ────────────────────────────────────────────────────
  const handleDone = () => {
    const img = imgRef.current;
    if (!img) return;
    const OUT = Math.max(img.naturalWidth, img.naturalHeight, 1024);
    const OUT_H = OUT * (CH / CW);
    const rot90 = rotation % 180 !== 0;
    const srcW = rot90 ? img.naturalHeight : img.naturalWidth;
    const srcH = rot90 ? img.naturalWidth  : img.naturalHeight;
    const sf = imgScale / 50;
    const { dw, dh } = containDims(srcW, srcH, OUT * sf, OUT_H * sf);

    const full = document.createElement("canvas");
    full.width = OUT; full.height = OUT_H;
    const ctx = full.getContext("2d");
    ctx.save();
    ctx.translate(OUT / 2, OUT_H / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
    ctx.restore();

    const { x, y, w, h } = crop;
    const out = document.createElement("canvas");
    out.width  = Math.round(w * OUT);
    out.height = Math.round(h * OUT_H);
    out.getContext("2d").drawImage(full, x*OUT, y*OUT_H, w*OUT, h*OUT_H, 0, 0, out.width, out.height);
    out.toBlob((blob) => onDone(blob), "image/png");
  };

  // ── Tabs ──────────────────────────────────────────────────────
  const tabs = [
    { id: "rotate", label: "Rotate", icon: "↺" },
    { id: "flip",   label: "Flip",   icon: "⇄" },
    { id: "crop",   label: "Crop",   icon: "⊡" },
    { id: "scale",  label: "Scale",  icon: "⤢" },
  ];

  const btnBase = {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 4, padding: "12px 8px", flex: 1,
  };

  return (
    <div  style={{
      display: "flex", flexDirection: "column",
      height: "100%", width: "100%",
      backgroundColor: "#181818",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      userSelect: "none",
    }}>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 10px",
        borderBottom: "1px solid #2c2c2c",
      }}>
        <button onClick={onCancel} style={{ background:"none", border:"none", color:"#fff", fontSize:14, cursor:"pointer", padding:"4px 8px" }}>✕</button>
        {/* <span style={{ color:"#fff", fontSize:17, fontWeight:600 }}>Edit Image</span> */}
        <button onClick={handleDone} style={{ background:"none", border:"none", color:"#f97316", fontSize:14, fontWeight:700, cursor:"pointer", padding:"4px 8px" }}>Done</button>
      </div>

      {/* ── Canvas ── */}
      <div style={{
        flex: 1, display:"flex", alignItems:"center", justifyContent:"center",
        backgroundColor: "#111", overflow:"hidden", minHeight: 30,
      }}>0
        <canvas
          ref={canvasRef}
          style={{ touchAction:"none", display:"block" }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        />
      </div>

      {/* ── Tab-specific controls ── */}
      <div style={{ backgroundColor:"#f4f4f4", borderTop:"1px solid #e0e0e0" }}>
        {tab === "rotate" && (
          <div style={{ padding:"6px 10px", display:"flex", justifyContent:"center", gap:16 }}>
            <button onClick={() => setRotation(r => r - 90)} style={{ padding:"6px 8px", backgroundColor:"#fff", border:"1px solid #ddd", borderRadius:10, fontSize:14, cursor:"pointer" }}>↺</button>
            <button onClick={() => setRotation(r => r + 90)} style={{ padding:"6px 8px", backgroundColor:"#fff", border:"1px solid #ddd", borderRadius:10, fontSize:14, cursor:"pointer" }}>↻</button>
          </div>
        )}
        {tab === "flip" && (
          <div style={{ padding:"6px 10px", display:"flex", justifyContent:"center", gap:12 }}>
            {[["⇄", flipH, () => setFlipH(v => !v)], ["⇅", flipV, () => setFlipV(v => !v)]].map(([label, active, fn]) => (
              <button key={label} onClick={fn} style={{
                padding:"6px 12px",
                backgroundColor: active ? "#f97316" : "#fff",
                color: active ? "#fff" : "#333",
                border:"1px solid #ddd", borderRadius:10,
                fontSize:14, fontWeight:600, cursor:"pointer",
              }}>{label}</button>
            ))}
          </div>
        )}
        {tab === "crop" && (
          null
          // <div style={{ padding:"12px 20px", display:"flex", justifyContent:"center", alignItems:"center", gap:16 }}>
          //   <span style={{ fontSize:13, color:"#888" }}>1 : 2 portrait · drag handles to resize</span>
          //   <button onClick={() => setCrop(INITIAL_CROP)} style={{
          //     padding:"6px 16px", backgroundColor:"#fff", border:"1px solid #ddd",
          //     borderRadius:10, fontSize:13, color:"#555", cursor:"pointer",
          //   }}>↺</button>
          // </div>
        )}
        {/* {tab === "scale" && (
          <div style={{ padding:"10px 20px 4px", display:"flex", justifyContent:"center" }}>
            <span style={{ fontSize:13, color:"#888" }}>Drag slider below to zoom image</span>
          </div>
        )} */}
      </div>

      {/* ── Scale slider — always visible ── */}
      <div style={{ backgroundColor:"#f4f4f4", padding:"6px 20px 12px", borderTop:"1px solid #e8e8e8" }}>
        <div style={{ textAlign:"center", fontSize:15, fontWeight:700, color:"#f97316", marginBottom:6 }}>
          {imgScale}%
        </div>
        <div style={{ position:"relative", height:36, display:"flex", alignItems:"center" }}>
          <div style={{
            position:"absolute", left:0, right:0,
            display:"flex", justifyContent:"space-between", alignItems:"flex-end",
            height:20, pointerEvents:"none", padding:"0 2px",
          }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} style={{
                width: 1.5,
                height: i % 5 === 0 ? 14 : 7,
                backgroundColor: i === 17 ? "#f97316" : "#bbb",
                borderRadius: 1,
              }} />
            ))}
          </div>
          <input type="range" min={10} max={150} step={1} value={imgScale}
            onChange={(e) => setImgScale(Number(e.target.value))}
            style={{ width:"100%", appearance:"none", WebkitAppearance:"none", background:"transparent", height:36, cursor:"pointer", position:"relative", zIndex:1 }}
          />
        </div>
        <style>{`
          input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:5px;height:28px;background:#f97316;border-radius:3px;cursor:pointer;}
          input[type=range]::-webkit-slider-runnable-track{background:transparent;height:36px;}
        `}</style>
      </div>

      {/* ── Bottom tab bar ── */}
      <div style={{ backgroundColor:"#1e1e1e", display:"flex", borderTop:"1px solid #2a2a2a" }}>
        {/* Reset-all button */}
        <button
          onClick={() => { setRotation(0); setFlipH(false); setFlipV(false); setImgScale(50); setCrop(INITIAL_CROP); }}
          style={{ ...btnBase }}
        >
          <span style={{ fontSize:20, color:"#888" }}>↺</span>
          <span style={{ fontSize:10, color:"#666" }}>Reset</span>
        </button>

        {tabs.map(({ id, label, icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              ...btnBase,
              borderTop: active ? "2.5px solid #f97316" : "2.5px solid transparent",
            }}>
              <span style={{ fontSize:20, color: active ? "#f97316" : "#888" }}>{icon}</span>
              <span style={{ fontSize:10, color: active ? "#f97316" : "#777", fontWeight: active ? 700 : 400 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}