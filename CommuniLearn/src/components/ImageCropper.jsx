import React, { useRef, useState, useEffect } from 'react';

// Lightweight image cropper. Props:
// - src: image src (object URL or data URL)
// - onCancel()
// - onCrop(dataUrl)
export default function ImageCropper({ src, onCancel, onCrop, exportSize = 320 }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      setImgObj(img);
      // center image in container
      const cw = 400; const ch = 400;
      const w = img.naturalWidth; const h = img.naturalHeight;
      // initial scale to cover container
      const s = Math.max(cw / w, ch / h);
      setScale(s);
      // center
      const dispW = w * s; const dispH = h * s;
      setPos({ x: (cw - dispW) / 2, y: (ch - dispH) / 2 });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      e.preventDefault();
      const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
      const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      setPos({ x: posStart.current.x + dx, y: posStart.current.y + dy });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const startDrag = (e) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX ?? (e.touches && e.touches[0].clientX), y: e.clientY ?? (e.touches && e.touches[0].clientY) };
    posStart.current = { ...pos };
  };

  const doCrop = () => {
    if (!imgObj || !containerRef.current) return;
    const containerSize = 400; // px
    const cropSize = 320; // export area in px before scaling to exportSize
    // crop box is centered and square with size 320 within the container
    const cropBoxSize = 320;

    // position of crop box relative to container
    const cropLeft = (containerSize - cropBoxSize) / 2;
    const cropTop = (containerSize - cropBoxSize) / 2;

    // Calculate source coords in original image
    const sx = Math.max(0, (cropLeft - pos.x) / scale);
    const sy = Math.max(0, (cropTop - pos.y) / scale);
    const sSize = cropBoxSize / scale;
    const sWidth = Math.min(imgObj.naturalWidth - sx, sSize);
    const sHeight = Math.min(imgObj.naturalHeight - sy, sSize);

    const canvas = document.createElement('canvas');
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext('2d');
    // fill background transparent
    ctx.clearRect(0, 0, exportSize, exportSize);
    try {
      // draw circular clipped image so corners are transparent
      ctx.save();
      ctx.beginPath();
      ctx.arc(exportSize / 2, exportSize / 2, exportSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(imgObj, sx, sy, sWidth, sHeight, 0, 0, exportSize, exportSize);
      ctx.restore();
      const dataUrl = canvas.toDataURL('image/png');
      onCrop && onCrop(dataUrl);
    } catch (e) {
      console.error('crop error', e);
    }
  };

  const onZoom = (v) => {
    // adjust scale keeping image centered relative to crop box center
    if (!imgObj) return;
    const oldScale = scale;
    const newScale = Number(v);
    const containerSize = 400;
    // coordinates in container of center
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    // compute image coords at center before and after and adjust pos so center remains pointing to same image point
    const imgPointX = (centerX - pos.x) / oldScale;
    const imgPointY = (centerY - pos.y) / oldScale;
    const newPosX = centerX - imgPointX * newScale;
    const newPosY = centerY - imgPointY * newScale;
    setScale(newScale);
    setPos({ x: newPosX, y: newPosY });
  };

  return (
    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div style={{ width: 520, background: '#fff', padding: 16, borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Adjust Profile Picture</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 400, height: 400, position: 'relative', background: '#222', overflow: 'hidden', borderRadius: 6 }} ref={containerRef}>
            <div
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', cursor: 'grab' }}
              onMouseDown={startDrag}
              onTouchStart={startDrag}
            />
            {imgObj && (
              <img
                ref={imgRef}
                src={imgObj.src}
                alt="to-crop"
                style={{ position: 'absolute', left: pos.x, top: pos.y, transform: `scale(${scale})`, transformOrigin: 'top left', userSelect: 'none', pointerEvents: 'none' }}
                draggable={false}
              />
            )}
            {/* circular crop box overlay centered */}
            <div style={{ position: 'absolute', left: (400 - 320) / 2, top: (400 - 320) / 2, width: 320, height: 320, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', border: '2px solid rgba(255,255,255,0.9)', boxSizing: 'border-box', pointerEvents: 'none', borderRadius: '50%' }} />
          </div>

          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#333' }}>Zoom</label>
              <input type="range" min={scale} max={Math.max(3, scale + 2)} step={0.01} value={scale} onChange={(e) => onZoom(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={onCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={doCrop}>Crop & Save</button>
            </div>
            <p style={{ marginTop: 12, color: '#6b7280', fontSize: 13 }}>Drag the image to position it inside the circle. Use zoom to scale.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
