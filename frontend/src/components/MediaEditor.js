import React, { useState, useRef, useEffect } from 'react';

export default function MediaEditor({ file, onConfirm, onCancel }) {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(new Image());
  const [loaded, setLoaded]     = useState(false);
  const [brightness, setBright] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [caption, setCaption]   = useState('');
  const [filter, setFilter]     = useState('none');
  const isVideo = file?.type?.startsWith('video/');
  const previewUrl = file ? URL.createObjectURL(file) : null;

  const filters = [
    { id:'none',    label:'Original' },
    { id:'warm',    label:'Cálido',    css:'sepia(30%) saturate(150%)' },
    { id:'cool',    label:'Frío',      css:'hue-rotate(30deg) saturate(120%)' },
    { id:'bw',      label:'B&N',       css:'grayscale(100%)' },
    { id:'vivid',   label:'Vívido',    css:'saturate(200%) contrast(110%)' },
    { id:'fade',    label:'Fade',      css:'opacity(85%) brightness(110%) saturate(80%)' },
  ];

  useEffect(() => {
    if (!file || isVideo) return;
    const url = URL.createObjectURL(file);
    imgRef.current.onload = () => {
      setLoaded(true);
      drawCanvas();
    };
    imgRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (loaded) drawCanvas();
  }, [brightness, contrast, filter, loaded]);

  const getFilterCSS = () => {
    const base = `brightness(${brightness}%) contrast(${contrast}%)`;
    const f = filters.find(f => f.id === filter);
    return f?.css ? `${base} ${f.css}` : base;
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.filter = getFilterCSS();
    ctx.drawImage(img, 0, 0);
    if (caption) {
      ctx.filter = 'none';
      ctx.font = `bold ${Math.max(24, canvas.width * 0.04)}px sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(caption, canvas.width / 2, canvas.height - 30);
    }
  };

  const confirm = () => {
    if (isVideo) { onConfirm(file, caption); return; }
    const canvas = canvasRef.current;
    canvas.toBlob(blob => {
      const edited = new File([blob], file.name, { type: 'image/jpeg' });
      onConfirm(edited, caption);
    }, 'image/jpeg', 0.92);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'#17171B',borderRadius:'18px',width:'100%',maxWidth:560,maxHeight:'95vh',overflow:'auto'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)'}}>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.1rem'}}>✏️ Editar antes de publicar</h3>
          <button onClick={onCancel} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'white',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:'14px'}}>✕</button>
        </div>

        <div style={{padding:'1.25rem 1.5rem'}}>
          {/* Preview */}
          <div style={{borderRadius:'12px',overflow:'hidden',marginBottom:'1rem',background:'#000',minHeight:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {isVideo ? (
              <video src={previewUrl} controls style={{width:'100%',maxHeight:320,objectFit:'contain'}} />
            ) : (
              <canvas ref={canvasRef} style={{width:'100%',maxHeight:320,objectFit:'contain',filter:'none'}} />
            )}
          </div>

          {/* Filtros — solo imágenes */}
          {!isVideo && (
            <div style={{marginBottom:'1rem'}}>
              <label style={{fontSize:'12px',color:'var(--text3)',display:'block',marginBottom:'8px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Filtros</label>
              <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'4px'}}>
                {filters.map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)}
                    style={{flexShrink:0,padding:'6px 12px',borderRadius:'20px',border:`1px solid ${filter===f.id?'#E8365D':'var(--border)'}`,background:filter===f.id?'var(--rose-light)':'transparent',color:filter===f.id?'#E8365D':'var(--text2)',cursor:'pointer',fontSize:'12px',fontFamily:'var(--font-body)',whiteSpace:'nowrap'}}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brillo y contraste — solo imágenes */}
          {!isVideo && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
              <div>
                <label style={{fontSize:'12px',color:'var(--text3)',display:'block',marginBottom:'6px',fontWeight:600}}>☀️ Brillo {brightness}%</label>
                <input type="range" min="50" max="150" value={brightness} onChange={e=>{setBright(parseInt(e.target.value));}}
                  style={{width:'100%',accentColor:'#E8365D',cursor:'pointer'}} />
              </div>
              <div>
                <label style={{fontSize:'12px',color:'var(--text3)',display:'block',marginBottom:'6px',fontWeight:600}}>🎨 Contraste {contrast}%</label>
                <input type="range" min="50" max="150" value={contrast} onChange={e=>{setContrast(parseInt(e.target.value));}}
                  style={{width:'100%',accentColor:'#E8365D',cursor:'pointer'}} />
              </div>
            </div>
          )}

          {/* Texto/caption */}
          <div style={{marginBottom:'1.25rem'}}>
            <label style={{fontSize:'12px',color:'var(--text3)',display:'block',marginBottom:'6px',fontWeight:600}}>💬 Texto sobre la imagen (opcional)</label>
            <input className="input" placeholder="Agrega un texto..." value={caption}
              onChange={e=>{setCaption(e.target.value);if(!isVideo&&loaded)setTimeout(drawCanvas,0);}} />
          </div>

          {/* Botones */}
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn btn-outline" style={{flex:1}} onClick={onCancel}>Cancelar</button>
            <button className="btn btn-primary" style={{flex:2}} onClick={confirm}>✓ Listo, publicar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
