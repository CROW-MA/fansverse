import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function KYC() {
  const [status, setStatus]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSub]    = useState(false);
  const [docType, setDocType]   = useState('cedula');
  const [frontFile, setFront]   = useState(null);
  const [backFile, setBack]     = useState(null);
  const [selfieFile, setSelfie] = useState(null);
  const [previews, setPreviews] = useState({});
  const frontRef  = useRef(null);
  const backRef   = useRef(null);
  const selfieRef = useRef(null);

  useEffect(() => {
    api.get('/kyc/status')
      .then(r => setStatus(r.data))
      .catch(() => setStatus({ status: 'not_submitted' }))
      .finally(() => setLoading(false));
  }, []);

  const handleFile = (file, field, setter) => {
    if (!file) return;
    setter(file);
    const url = URL.createObjectURL(file);
    setPreviews(p => ({ ...p, [field]: url }));
  };

  const submit = async () => {
    if (!frontFile || !selfieFile) return toast.error('Foto del documento y selfie son obligatorios');
    setSub(true);
    try {
      const fd = new FormData();
      fd.append('document_type', docType);
      fd.append('document_front', frontFile);
      if (backFile) fd.append('document_back', backFile);
      fd.append('selfie', selfieFile);
      await api.post('/kyc/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Documentos enviados. Revisaremos en 24-48 horas.');
      setStatus({ status: 'pending' });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al enviar');
    } finally { setSub(false); }
  };

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><div className="spinner" style={{width:32,height:32}} /></div>;

  const statusMap = {
    not_submitted: { color:'var(--text3)', icon:'📋', label:'No enviado' },
    pending:       { color:'var(--warn)',  icon:'⏳', label:'En revisión' },
    approved:      { color:'var(--success)', icon:'✅', label:'Aprobado' },
    rejected:      { color:'var(--danger)', icon:'❌', label:'Rechazado' },
  };
  const s = statusMap[status?.status] || statusMap.not_submitted;

  return (
    <div className="page-content fade-in">
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,marginBottom:'4px'}}>Verificación de Identidad</h1>
      <p style={{color:'var(--text2)',fontSize:'14px',marginBottom:'1.5rem'}}>Verifica tu identidad para obtener la insignia ✓ y aumentar la confianza de tus fans</p>

      {/* Estado actual */}
      <div style={{background:'var(--card)',border:`1px solid ${s.color}`,borderRadius:'var(--radius-lg)',padding:'1.25rem 1.5rem',marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:'12px'}}>
        <span style={{fontSize:'1.5rem'}}>{s.icon}</span>
        <div>
          <div style={{fontWeight:600,color:s.color}}>{s.label}</div>
          {status?.status === 'pending' && <div style={{fontSize:'12px',color:'var(--text3)'}}>Revisaremos tus documentos en 24-48 horas</div>}
          {status?.status === 'approved' && <div style={{fontSize:'12px',color:'var(--text3)'}}>Tu perfil tiene la insignia de verificado ✓</div>}
          {status?.status === 'rejected' && <div style={{fontSize:'12px',color:'var(--danger)'}}>{status.rejection_reason || 'Documentos rechazados. Por favor reenvía.'}</div>}
        </div>
      </div>

      {(status?.status === 'not_submitted' || status?.status === 'rejected') && (
        <div className="card-lg" style={{maxWidth:560}}>
          <h3 style={{fontSize:'14px',fontWeight:600,marginBottom:'1rem'}}>Enviar documentos</h3>

          <div className="form-group">
            <label className="form-label">Tipo de documento</label>
            <select className="input" value={docType} onChange={e => setDocType(e.target.value)} style={{cursor:'pointer'}}>
              <option value="cedula">Cédula de ciudadanía</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="dni">DNI</option>
              <option value="licencia">Licencia de conducir</option>
            </select>
          </div>

          {/* Frente del documento */}
          <div style={{marginBottom:'1rem'}}>
            <label className="form-label">Frente del documento *</label>
            <div onClick={() => frontRef.current?.click()}
              style={{border:'2px dashed var(--border2)',borderRadius:'10px',height:140,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'var(--dark3)',position:'relative'}}>
              {previews.front
                ? <img src={previews.front} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                : <div style={{textAlign:'center',color:'var(--text3)'}}><div style={{fontSize:'1.5rem',marginBottom:'6px'}}>📄</div><div style={{fontSize:'12px'}}>Foto del frente</div></div>
              }
            </div>
            <input ref={frontRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => handleFile(e.target.files[0], 'front', setFront)} />
          </div>

          {/* Dorso */}
          <div style={{marginBottom:'1rem'}}>
            <label className="form-label">Dorso del documento (opcional)</label>
            <div onClick={() => backRef.current?.click()}
              style={{border:'2px dashed var(--border2)',borderRadius:'10px',height:120,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'var(--dark3)'}}>
              {previews.back
                ? <img src={previews.back} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                : <div style={{textAlign:'center',color:'var(--text3)'}}><div style={{fontSize:'1.5rem',marginBottom:'6px'}}>📄</div><div style={{fontSize:'12px'}}>Foto del dorso</div></div>
              }
            </div>
            <input ref={backRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => handleFile(e.target.files[0], 'back', setBack)} />
          </div>

          {/* Selfie */}
          <div style={{marginBottom:'1.25rem'}}>
            <label className="form-label">Selfie sosteniendo el documento *</label>
            <div onClick={() => selfieRef.current?.click()}
              style={{border:'2px dashed var(--border2)',borderRadius:'10px',height:160,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'var(--dark3)'}}>
              {previews.selfie
                ? <img src={previews.selfie} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                : <div style={{textAlign:'center',color:'var(--text3)'}}><div style={{fontSize:'1.5rem',marginBottom:'6px'}}>🤳</div><div style={{fontSize:'12px'}}>Selfie con documento</div></div>
              }
            </div>
            <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{display:'none'}} onChange={e => handleFile(e.target.files[0], 'selfie', setSelfie)} />
          </div>

          <div style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'8px',padding:'10px 14px',fontSize:'12px',color:'#60A5FA',marginBottom:'1.25rem'}}>
            🔒 Tus documentos son encriptados y solo los ve el equipo de FansVerse para verificación. Nunca se comparten con terceros.
          </div>

          <button className="btn btn-primary btn-full" onClick={submit} disabled={submitting}>
            {submitting ? <><span className="spinner" style={{width:14,height:14}} /> Enviando...</> : 'Enviar documentos para verificación'}
          </button>
        </div>
      )}
    </div>
  );
}
