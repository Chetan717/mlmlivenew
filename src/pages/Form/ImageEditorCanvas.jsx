import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@heroui/react";

// ── Constants ─────────────────────────────────────────────────────
const CW = 300;
const CH = 340;
const RATIO = 2 / 2.5;

// ── Helpers ───────────────────────────────────────────────────────
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function coverDims(imgW, imgH, boxW, boxH) {
  const ia = imgW / imgH, ba = boxW / boxH;
  return ia > ba ? { dw: boxH * ia, dh: boxH } : { dw: boxW, dh: boxW / ia };
}

function computeFrame(canvasW, canvasH, ratio) {
  const MARGIN = 0.92;
  let fw = canvasW * MARGIN;
  let fh = fw / ratio;
  if (fh > canvasH * MARGIN) { fh = canvasH * MARGIN; fw = fh * ratio; }
  return { fw, fh, fx: (canvasW - fw) / 2, fy: (canvasH - fh) / 2 };
}

function getTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Component ─────────────────────────────────────────────────────
export function ImageEditorCanvas({ src, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const dragRef   = useRef(null);
  const pinchRef  = useRef(null);
  const rafRef    = useRef(null);

  const [rotation, setRotation] = useState(0);
  const [flipH,    setFlipH]    = useState(false);
  const [flipV,    setFlipV]    = useState(false);
  const [zoom,     setZoom]     = useState(100);
  const [tab,      setTab]      = useState("crop");
  const [isDoing,  setIsDoing]  = useState(false);

  const offsetRef = useRef({ x: 0, y: 0 });
  const [offset, _setOffset] = useState({ x: 0, y: 0 });
  const setOffset = useCallback((val) => {
    const next = typeof val === "function" ? val(offsetRef.current) : val;
    offsetRef.current = next;
    _setOffset(next);
  }, []);

  const rotationRef = useRef(0);
  const flipHRef    = useRef(false);
  const flipVRef    = useRef(false);
  const zoomRef     = useRef(100);
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => { flipHRef.current    = flipH;    }, [flipH]);
  useEffect(() => { flipVRef.current    = flipV;    }, [flipV]);
  useEffect(() => { zoomRef.current     = zoom;     }, [zoom]);

  const computeLayout = (img, fw, fh, rotation, zoomVal, offNorm) => {
    const rot90 = rotation % 180 !== 0;
    const boxW = rot90 ? fh : fw;
    const boxH = rot90 ? fw : fh;
    const cover = coverDims(img.naturalWidth, img.naturalHeight, boxW, boxH);
    const dw = cover.dw * (zoomVal / 100);
    const dh = cover.dh * (zoomVal / 100);
    const screenW = rot90 ? dh : dw;
    const screenH = rot90 ? dw : dh;
    const maxPanX = Math.max(0, (screenW - fw) / 2);
    const maxPanY = Math.max(0, (screenH - fh) / 2);
    const panX = clamp(offNorm.x * fw, -maxPanX, maxPanX);
    const panY = clamp(offNorm.y * fh, -maxPanY, maxPanY);
    return { dw, dh, panX, panY, maxPanX, maxPanY };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;

    const rotation = rotationRef.current;
    const flipH    = flipHRef.current;
    const flipV    = flipVRef.current;
    const zoomVal  = zoomRef.current;

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

    const { fw, fh, fx, fy } = computeFrame(CW, CH, RATIO);
    const { dw, dh, panX, panY } = computeLayout(img, fw, fh, rotation, zoomVal, offsetRef.current);

    ctx.save();
    ctx.translate(CW / 2 + panX, CH / 2 + panY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, CW, fy);
    ctx.fillRect(0, fy + fh, CW, CH - fy - fh);
    ctx.fillRect(0, fy, fx, fh);
    ctx.fillRect(fx + fw, fy, CW - fx - fw, fh);

    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.6;
    ctx.strokeRect(fx, fy, fw, fh);

    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(fx + (fw / 3) * i, fy); ctx.lineTo(fx + (fw / 3) * i, fy + fh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx, fy + (fh / 3) * i); ctx.lineTo(fx + fw, fy + (fh / 3) * i); ctx.stroke();
    }

    const BL = 18, BT = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = BT;
    ctx.lineCap = "square";
    [[fx, fy, 1, 1], [fx + fw, fy, -1, 1], [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1]]
      .forEach(([x, y, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(x + sx * BL, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * BL);
        ctx.stroke();
      });
    ctx.restore();
  }, []);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  // ── Load image — always start centered at cover zoom ──────────
  useEffect(() => {
    if (!src) return;
    imgRef.current = null;
    offsetRef.current = { x: 0, y: 0 };
    _setOffset({ x: 0, y: 0 });
    zoomRef.current = 100;
    setZoom(100);
    setIsDoing(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    let objectUrl = null;
    img.onload = () => { imgRef.current = img; scheduleDraw(); };
    img.onerror = (e) => console.error("img load error", e);
    if (src instanceof Blob) { objectUrl = URL.createObjectURL(src); img.src = objectUrl; }
    else img.src = src;
    return () => { img.onload = null; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, scheduleDraw]);

  useEffect(() => { if (imgRef.current) scheduleDraw(); }, [rotation, flipH, flipV, zoom, offset, scheduleDraw]);

  // ── Pointer helpers ───────────────────────────────────────────
  const normPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { nx: (cx - rect.left) / rect.width, ny: (cy - rect.top) / rect.height };
  };

  const onDown = (e) => {
    e.preventDefault();
    if (e.touches && e.touches.length >= 2) {
      pinchRef.current = { dist: getTouchDist(e.touches), zoom0: zoomRef.current };
      dragRef.current = null;
      return;
    }
    pinchRef.current = null;
    const { nx, ny } = normPos(e);
    dragRef.current = { sx: nx, sy: ny, oc: { ...offsetRef.current } };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  };

  const onMove = (e) => {
    e.preventDefault();
    if (e.touches && e.touches.length >= 2 && pinchRef.current) {
      const newDist = getTouchDist(e.touches);
      const scale = newDist / pinchRef.current.dist;
      const newZoom = clamp(Math.round(pinchRef.current.zoom0 * scale), 100, 300);
      zoomRef.current = newZoom;
      setZoom(newZoom);
      scheduleDraw();
      return;
    }
    if (!dragRef.current) return;
    const { nx, ny } = normPos(e);
    const { sx, sy, oc } = dragRef.current;
    const { fw, fh } = computeFrame(CW, CH, RATIO);
    const dFracX = ((nx - sx) * CW) / fw;
    const dFracY = ((ny - sy) * CH) / fh;
    offsetRef.current = { x: oc.x + dFracX, y: oc.y + dFracY };
    scheduleDraw();
  };

  const onUp = (e) => {
    if (e && e.touches && e.touches.length > 0) {
      if (e.touches.length < 2) pinchRef.current = null;
      return;
    }
    pinchRef.current = null;
    if (!dragRef.current) return;
    dragRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    const img = imgRef.current;
    if (img) {
      const { fw, fh } = computeFrame(CW, CH, RATIO);
      const { panX, panY } = computeLayout(img, fw, fh, rotationRef.current, zoomRef.current, offsetRef.current);
      offsetRef.current = { x: fw ? panX / fw : 0, y: fh ? panY / fh : 0 };
    }
    _setOffset({ ...offsetRef.current });
  };

  // ── Export ────────────────────────────────────────────────────
  const handleDone = () => {
    if (isDoing) return;
    const img = imgRef.current;
    if (!img) return;

    setIsDoing(true);

    const rotation = rotationRef.current;
    const flipH    = flipHRef.current;
    const flipV    = flipVRef.current;
    const zoomVal  = zoomRef.current;

    const TARGET = 800;
    const outW = RATIO >= 1 ? TARGET : Math.round(TARGET * RATIO);
    const outH = RATIO >= 1 ? Math.round(TARGET / RATIO) : TARGET;

    const { dw, dh, panX, panY } = computeLayout(img, outW, outH, rotation, zoomVal, offsetRef.current);

    const out = document.createElement("canvas");
    out.width = outW; out.height = outH;
    const ctx = out.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    ctx.translate(outW / 2 + panX, outH / 2 + panY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    const dataUrl = out.toDataURL("image/png");
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    const blob = new Blob([u8arr], { type: mime });

    setIsDoing(false);
    onDone(blob);
  };

  // ── Tabs ──────────────────────────────────────────────────────
  const tabs = [
    { id: "rotate", label: "Rotate", icon: "↺" },
    { id: "flip",   label: "Flip",   icon: "⇄" },
    { id: "crop",   label: "Crop",   icon: "⊡" },
    { id: "scale",  label: "Zoom",   icon: "⤢" },
  ];

  const btnBase = {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 4, padding: "12px 8px", flex: 1,
  };

  return (
    <div style={{
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
        <button
          onClick={onCancel}
          style={{ background:"none", border:"none", color:"#fff", fontSize:14, cursor:"pointer", padding:"4px 8px", touchAction:"manipulation" }}
        >✕</button>

        <Button
          onPress={handleDone}
          isLoading={isDoing}
          isDisabled={isDoing}
          size="sm"
          style={{
            background: isDoing ? "rgba(249,115,22,0.15)" : "linear-gradient(135deg,#ea580c,#f97316)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 12,
            minWidth: 72,
            minHeight: 36,
            border: "none",
            touchAction: "manipulation",
          }}
          spinner={
            <span style={{
              display: "inline-block", width: 14, height: 14,
              border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
              borderRadius: "50%", animation: "spin 0.7s linear infinite",
            }} />
          }
        >
          {isDoing ? "Saving…" : "Done"}
        </Button>
      </div>

      {/* ── Canvas ── */}
      <div style={{
        flex: 1, display:"flex", alignItems:"center", justifyContent:"center",
        backgroundColor: "#111", overflow:"hidden", minHeight: 30,
      }}>
        <canvas
          ref={canvasRef}
          style={{ touchAction:"none", display:"block", cursor:"grab" }}
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
          <div style={{ padding:"8px 10px", textAlign:"center", fontSize:12, color:"#888" }}>
            Drag to reposition · Pinch to zoom · Frame is fixed
          </div>
        )}
      </div>

      {/* ── Zoom slider — always visible ── */}
      <div style={{ backgroundColor:"#f4f4f4", padding:"6px 20px 12px", borderTop:"1px solid #e8e8e8" }}>
        <div style={{ textAlign:"center", fontSize:15, fontWeight:700, color:"#f97316", marginBottom:6 }}>
          {zoom}%
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
                backgroundColor: i === 0 ? "#f97316" : "#bbb",
                borderRadius: 1,
              }} />
            ))}
          </div>
          <input type="range" min={100} max={300} step={1} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width:"100%", appearance:"none", WebkitAppearance:"none", background:"transparent", height:36, cursor:"pointer", position:"relative", zIndex:1 }}
          />
        </div>
        <style>{`
          input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:5px;height:28px;background:#f97316;border-radius:3px;cursor:pointer;}
          input[type=range]::-webkit-slider-runnable-track{background:transparent;height:36px;}
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>

      {/* ── Bottom tab bar ── */}
      <div style={{ backgroundColor:"#1e1e1e", display:"flex", borderTop:"1px solid #2a2a2a" }}>
        <button
          onClick={() => { setRotation(0); setFlipH(false); setFlipV(false); setZoom(100); setOffset({ x: 0, y: 0 }); }}
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
