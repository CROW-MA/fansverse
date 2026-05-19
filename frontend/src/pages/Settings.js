import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { uploadApi } from '../services/api';
import toast from 'react-hot-toast';

function BannerPositionModal({ previewUrl, onConfirm, onCancel, uploading }) {
  const [posY, setPosY] = useState(50);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'#17171B',borderRadius:'18px',padding:'1.5rem',width:'100%',maxWidth:580}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.1rem'}}>🖼️ Ajustar foto de portada</h3>
          <button onClick={onCancel} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'white',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:'14px'}}>✕</button>
        </div>
        <p style={{fontSize:'12px',color:'var(--text3)',marginBottom:'12px'}}>Mueve el control para elegir qué parte se muestra</p>
        <div style={{borderRadius:'12px',overflow:'hidden',border:'1px solid var(--border)',marginBottom:'16px',height:180,background:'#111'}}>
          <img src={previewUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`center ${posY}%`}} />
        </div>
        <div style={{marginBottom:'1.25rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'var(--text3)',marginBottom:'6px'}}>
            <span>⬆️ Arriba</span>
            <span style={{color:'var(--rose)',fontWeight:600}}>Posición: {posY}%</span>
            <span>⬇️ Abajo</span>
          </div>
          <input type="range" min="0" max="100" value={posY} onChange={e=>setPosY(parseInt(e.target.value))}
            style={{width:'100%',accentColor:'#E8365D',cursor:'pointer',height:6}} />
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn btn-outline" style={{flex:1}} onClick={onCancel} disabled={uploading}>Cancelar</button>
          <button className="btn btn-primary" style={{flex:2}} onClick={() => onConfirm(posY)} disabled={uploading}>
            {uploading ? <><span className="spinner" style={{width:14,height:14}} /> Subiendo...</> : '✓ Guardar portada'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [tab, setTab]       = useState('profile');
  const [form, setForm]     = useState({
    display_name: user?.display_name||'',
    bio: user?.bio||'',
    location: user?.location||'',
    website: user?.website||'',
    category: user?.category||'general'
  });
  const [saving, setSaving]         = useState(false);
  const [tiers, setTiers]           = useState([]);
  const [mySubs, setMySubs]         = useState([]);
  const [myTxs, setMyTxs]           = useState([]);
  const [newTier, setNewTier]       = useState({ name:'', price:'', description:'' });
  const [addingTier, setAdding]     = useState(false);
  const [showTierForm, setShowTF]   = useState(false);
  const [uploadingAvatar, setUA]    = useState(false);
  const [uploadingBanner, setUB]    = useState(false);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerPendingFile, setBannerPendingFile] = useState(null);
  const [pwForm, setPwForm]         = useState({ current:'', newPw:'', confirm:'' });
  const [savingPw, setSavingPw]     = useState(false);
  const [deleteConfirm, setDelConf] = useState('');
  const [deleting, setDeleting]     = useState(false);
  const avatarRef = useRef(null);
  const bannerRef = useRef(null);

  const isCreator = user?.role === 'creator' || user?.role === 'admin';

  useEffect(() => {
    // Cargar datos frescos del servidor
    api.get('/auth/me').then(r => {
      const u = r.data.user;
      updateUser(u);
      setForm({
        display_name: u.display_name || '',
        bio:          u.bio || '',
        location:     u.location || '',
        website:      u.website || '',
        category:     u.category || 'general',
      });
    }).catch(() => {});

    if (isCreator) {
      api.get(`/subscriptions/tiers/${user.id}`).then(r => setTiers(r.data.tiers||[])).catch(()=>{});
    } else {
      api.get('/subscriptions/my').then(r => setMySubs(r.data.subscriptions||[])).catch(()=>{});
    }
    api.get('/payouts/transactions?page=1').then(r => setMyTxs(r.data.transactions||[])).catch(()=>{});
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/me/profile', form);
      // Actualizar con datos del servidor
      updateUser(data.user);
      // Recargar datos frescos para confirmar
      const fresh = await api.get('/auth/me');
      updateUser(fresh.data.user);
      toast.success('Perfil actualizado ✓');
    } catch (e) {
      console.error('Error guardando:', e);
      toast.error('Error al guardar');
    }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!pwForm.current) return toast.error('Escribe tu contraseña actual');
    if (!pwForm.newPw || pwForm.newPw.length < 8) return toast.error('Mínimo 8 caracteres');
    if (pwForm.newPw !== pwForm.confirm) return toast.error('Las contraseñas no coinciden');
    setSavingPw(true);
    try {
      await api.put('/users/me/password', { current_password: pwForm.current, new_password: pwForm.newPw });
      toast.success('Contraseña actualizada ✓');
      setPwForm({ current:'', newPw:'', confirm:'' });
    } catch(e) {
      toast.error(e.response?.data?.error || 'Error al cambiar contraseña');
    } finally { setSavingPw(false); }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== user?.username) return toast.error('Escribe tu usuario exacto');
    setDeleting(true);
    try {
      await api.delete('/users/me');
      toast.success('Cuenta eliminada');
      window.location.href = '/';
    } catch(e) {
      toast.error(e.response?.data?.error || 'Error al eliminar');
    } finally { setDeleting(false); }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUA(true);
    try {
      const { data } = await uploadApi.avatar(file);
      updateUser({ avatar_url: data.avatar_url });
      toast.success('Foto actualizada ✓');
    } catch { toast.error('Error al subir foto'); }
    finally { setUA(false); }
  };

  const handleBannerFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = '';
    const url = URL.createObjectURL(file);
    setBannerPreview(url);
    setBannerPendingFile(file);
  };

  const confirmBannerUpload = async (posY = 50) => {
    if (!bannerPendingFile) return;
    setUB(true);
    try {
      const fd = new FormData();
      fd.append('file', bannerPendingFile);
      fd.append('posY', posY);
      const { data } = await api.post('/uploads/banner', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ banner_url: data.banner_url });
      setBannerPreview(null);
      setBannerPendingFile(null);
      toast.success('Portada actualizada ✓');
    } catch { toast.error('Error al subir portada'); }
    finally { setUB(false); }
  };

  const createTier = async () => {
    if (!newTier.name || !newTier.price) return toast.error('Nombre y precio requeridos');
    setAdding(true);
    try {
      await api.post('/subscriptions/tiers', { name:newTier.name, description:newTier.description, price:parseFloat(newTier.price), features:[newTier.description||`Acceso al plan ${newTier.name}`] });
      toast.success(`Plan "${newTier.name}" creado ✓`);
      setNewTier({ name:'', price:'', description:'' });
      setShowTF(false);
      const r = await api.get(`/subscriptions/tiers/${user.id}`);
      setTiers(r.data.tiers||[]);
    } catch(e) { toast.error(e.response?.data?.error||'Error'); }
    finally { setAdding(false); }
  };

  const cancelSub = async (id) => {
    if (!window.confirm('¿Cancelar esta suscripción?')) return;
    try { await api.delete(`/subscriptions/${id}`); setMySubs(s=>s.filter(x=>x.id!==id)); toast.success('Cancelada'); }
    catch { toast.error('Error'); }
  };

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const setT = k => e => setNewTier(f=>({...f,[k]:e.target.value}));

  const tabs = isCreator
    ? [['profile','👤 Perfil'],['plans','💎 Mis planes'],['payments','💳 Pagos'],['security','🔒 Seguridad']]
    : [['profile','👤 Perfil'],['subscriptions','⭐ Suscripciones'],['payments','💳 Pagos'],['security','🔒 Seguridad']];

  return (
    <div className="page-content fade-in">
      {bannerPreview && (
        <BannerPositionModal previewUrl={bannerPreview} onConfirm={confirmBannerUpload} onCancel={()=>{setBannerPreview(null);setBannerPendingFile(null);}} uploading={uploadingBanner} />
      )}

      <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,marginBottom:'1.5rem'}}>Configuración</h1>

      <div style={{display:'flex',gap:'6px',marginBottom:'1.5rem',borderBottom:'1px solid var(--border)',paddingBottom:'1rem',flexWrap:'wrap'}}>
        {tabs.map(([t,l]) => (
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:'8px 16px',borderRadius:'8px',border:`1px solid ${tab===t?'#E8365D':'var(--border)'}`,background:tab===t?'var(--rose-light)':'transparent',color:tab===t?'#E8365D':'var(--text2)',cursor:'pointer',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)'}}>
            {l}
          </button>
        ))}
      </div>

      {/* PERFIL */}
      {tab === 'profile' && (
        <div style={{maxWidth:580}}>
          <div style={{marginBottom:'1.5rem'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:600,color:'var(--text2)',marginBottom:'8px'}}>Foto de portada</label>
            <div style={{position:'relative',height:180,borderRadius:'var(--radius-lg)',overflow:'hidden',background:'linear-gradient(135deg,#1a0010,#0a0020)',border:'1px solid var(--border)',cursor:'pointer'}} onClick={()=>bannerRef.current?.click()}>
              {(user?.banner_url||bannerPreview) && <img src={bannerPreview||user.banner_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center'}} />}
              {!user?.banner_url && !bannerPreview && (
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'6px',color:'var(--text3)'}}>
                  <span style={{fontSize:'2rem'}}>🖼️</span><span style={{fontSize:'12px'}}>Clic para agregar portada</span>
                </div>
              )}
              <div style={{position:'absolute',bottom:10,right:10,background:'rgba(0,0,0,0.7)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'8px',padding:'6px 12px',fontSize:'12px',color:'white',fontWeight:500}}>
                {uploadingBanner ? <><span className="spinner" style={{width:12,height:12}} /> Subiendo...</> : '📷 Cambiar portada'}
              </div>
            </div>
            <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerFile} style={{display:'none'}} />
          </div>

          <div style={{marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:'1.25rem'}}>
            <div style={{position:'relative',cursor:'pointer',flexShrink:0}} onClick={()=>avatarRef.current?.click()}>
              <div style={{width:88,height:88,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem',fontWeight:700,color:'white',overflow:'hidden',border:'3px solid var(--dark)'}}>
                {user?.avatar_url ? <img src={user.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : user?.username?.[0]?.toUpperCase()}
              </div>
              <div style={{position:'absolute',bottom:2,right:2,background:'#E8365D',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',border:'2px solid var(--dark)'}}>
                {uploadingAvatar ? <span style={{width:12,height:12,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}} /> : '📷'}
              </div>
            </div>
            <div>
              <div style={{fontWeight:600,fontSize:'15px',marginBottom:'2px'}}>{user?.display_name||user?.username}</div>
              <div style={{fontSize:'12px',color:'var(--text3)',marginBottom:'8px'}}>@{user?.username}</div>
              <button className="btn btn-outline btn-sm" onClick={()=>avatarRef.current?.click()} disabled={uploadingAvatar}>
                {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
              </button>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatar} style={{display:'none'}} />
          </div>

          <div className="card-lg">
            <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'1rem'}}>Información del perfil</h3>
            <div className="form-group">
              <label className="form-label">Nombre para mostrar</label>
              <input className="input" value={form.display_name} onChange={set('display_name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="textarea" value={form.bio} onChange={set('bio')} placeholder="Cuéntale a tus fans sobre ti..." style={{minHeight:80}} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div className="form-group" style={{margin:0}}>
                <label className="form-label">Ubicación</label>
                <input className="input" value={form.location} onChange={set('location')} placeholder="Ciudad, País" />
              </div>
              <div className="form-group" style={{margin:0}}>
                <label className="form-label">Sitio web</label>
                <input className="input" value={form.website} onChange={set('website')} placeholder="https://..." />
              </div>
            </div>
            {isCreator && (
              <div className="form-group" style={{marginTop:'10px'}}>
                <label className="form-label">Categoría de contenido</label>
                <select className="input" style={{cursor:'pointer'}} value={form.category} onChange={set('category')}>
                  <option value="general">🔥 General</option>
                  <option value="mujer">👩 Mujer</option>
                  <option value="hombre">👨 Hombre</option>
                  <option value="pareja">💑 Pareja</option>
                  <option value="trans">🏳️‍⚧️ Trans</option>
                  <option value="gay">🏳️‍🌈 Gay</option>
                  <option value="lesbi">💜 Lesbiana</option>
                  <option value="no_binario">⚧️ No Binario</option>
                </select>
              </div>
            )}
            <button className="btn btn-primary" style={{marginTop:'1rem'}} onClick={saveProfile} disabled={saving}>
              {saving ? <><span className="spinner" style={{width:14,height:14}} /> Guardando...</> : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* PLANES */}
      {tab === 'plans' && isCreator && (
        <div style={{maxWidth:560}}>
          <div className="card-lg">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Planes de suscripción</h3>
              <button className="btn btn-primary btn-sm" onClick={()=>setShowTF(t=>!t)}>{showTierForm?'Cancelar':'+ Nuevo plan'}</button>
            </div>
            {showTierForm && (
              <div style={{background:'var(--dark3)',borderRadius:'10px',padding:'1.25rem',marginBottom:'1rem',border:'1px solid rgba(232,54,93,0.2)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                  <div className="form-group" style={{margin:0}}>
                    <label className="form-label">Nombre</label>
                    <input className="input" placeholder="Ej: VIP..." value={newTier.name} onChange={setT('name')} />
                  </div>
                  <div className="form-group" style={{margin:0}}>
                    <label className="form-label">Precio/mes (USD)</label>
                    <input className="input" type="number" min="1" placeholder="9.99" value={newTier.price} onChange={setT('price')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Beneficios</label>
                  <input className="input" placeholder="Ej: Acceso a fotos y videos exclusivos" value={newTier.description} onChange={setT('description')} />
                </div>
                <button className="btn btn-primary" onClick={createTier} disabled={addingTier}>
                  {addingTier?<><span className="spinner" style={{width:14,height:14}} /> Creando...</>:'Crear plan'}
                </button>
              </div>
            )}
            {tiers.length === 0
              ? <div style={{textAlign:'center',padding:'2rem',color:'var(--text3)',fontSize:'13px'}}>Crea un plan para que los fans puedan suscribirse.</div>
              : tiers.map((t,i) => (
                <div key={t.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'var(--dark3)',borderRadius:'10px',border:`1px solid ${i===0?'rgba(212,168,67,0.3)':'var(--border)'}`,marginBottom:'8px'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:'14px'}}>{t.name}</div>
                    <div style={{fontSize:'12px',color:'var(--text3)'}}>${parseFloat(t.price).toFixed(2)}/mes · {t.subscriber_count||0} suscriptores</div>
                  </div>
                  <span style={{background:'rgba(34,197,94,0.15)',color:'#22C55E',fontSize:'12px',fontWeight:600,padding:'3px 8px',borderRadius:'6px'}}>${parseFloat(t.price).toFixed(2)}/mes</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* SUSCRIPCIONES fan */}
      {tab === 'subscriptions' && !isCreator && (
        <div style={{maxWidth:600}}>
          <div className="card-lg">
            <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'1rem'}}>Mis suscripciones activas</h3>
            {mySubs.length === 0
              ? <div style={{textAlign:'center',padding:'2rem',color:'var(--text3)',fontSize:'13px'}}>No tienes suscripciones activas.</div>
              : mySubs.map(s => (
                <div key={s.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px',background:'var(--dark3)',borderRadius:'10px',border:'1px solid var(--border)',marginBottom:'8px'}}>
                  <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:700,color:'white',overflow:'hidden',flexShrink:0}}>
                    {s.avatar_url?<img src={s.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:s.username?.[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:'14px'}}>{s.display_name||s.username}</div>
                    <div style={{fontSize:'12px',color:'var(--text3)'}}>Plan {s.tier_name} · ${parseFloat(s.price||0).toFixed(2)}/mes</div>
                    <div style={{fontSize:'11px',color:'#22C55E',marginTop:'2px'}}>✓ Activa</div>
                  </div>
                  <button onClick={()=>cancelSub(s.id)} style={{background:'rgba(239,68,68,0.1)',color:'var(--danger)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'8px',padding:'6px 12px',cursor:'pointer',fontSize:'12px',fontFamily:'var(--font-body)'}}>Cancelar</button>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* PAGOS */}
      {tab === 'payments' && (
        <div style={{maxWidth:650}}>
          <div className="card-lg">
            <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'1rem'}}>Historial de transacciones</h3>
            {myTxs.length === 0
              ? <div style={{textAlign:'center',padding:'2rem',color:'var(--text3)',fontSize:'13px'}}>No hay transacciones aún</div>
              : (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                  <thead>
                    <tr>{['Tipo','Descripción','Monto','Fecha','Estado'].map(h=>(
                      <th key={h} style={{textAlign:'left',padding:'0 0 10px',fontSize:'11px',color:'var(--text3)',borderBottom:'1px solid var(--border)',textTransform:'uppercase'}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {myTxs.slice(0,20).map(t=>(
                      <tr key={t.id}>
                        <td style={{padding:'11px 0',borderBottom:'1px solid var(--border)'}}>
                          <span style={{background:t.type==='subscription'?'rgba(34,197,94,0.15)':'rgba(232,54,93,0.15)',color:t.type==='subscription'?'#22C55E':'#E8365D',fontSize:'11px',fontWeight:600,padding:'3px 8px',borderRadius:'6px'}}>{t.type}</span>
                        </td>
                        <td style={{padding:'11px 10px 11px 0',borderBottom:'1px solid var(--border)',color:'var(--text2)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.description||'-'}</td>
                        <td style={{padding:'11px 10px 11px 0',borderBottom:'1px solid var(--border)',fontWeight:600,color:'#22C55E'}}>${parseFloat(t.net_amount||t.amount||0).toFixed(2)}</td>
                        <td style={{padding:'11px 10px 11px 0',borderBottom:'1px solid var(--border)',color:'var(--text3)',whiteSpace:'nowrap'}}>{new Date(t.created_at).toLocaleDateString('es-CO')}</td>
                        <td style={{padding:'11px 0',borderBottom:'1px solid var(--border)'}}><span style={{background:'rgba(34,197,94,0.15)',color:'#22C55E',fontSize:'11px',padding:'3px 8px',borderRadius:'6px'}}>{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      )}

      {/* SEGURIDAD */}
      {tab === 'security' && (
        <div style={{maxWidth:520}}>

          {/* Cambiar contraseña */}
          <div className="card-lg" style={{marginBottom:'1.25rem'}}>
            <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'1.25rem'}}>
              🔑 Cambiar contraseña
            </h3>
            <div className="form-group">
              <label className="form-label">Contraseña actual</label>
              <input className="input" type="password" placeholder="••••••••"
                value={pwForm.current} onChange={e=>setPwForm(f=>({...f,current:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Nueva contraseña</label>
              <input className="input" type="password" placeholder="Mínimo 8 caracteres"
                value={pwForm.newPw} onChange={e=>setPwForm(f=>({...f,newPw:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar nueva contraseña</label>
              <input className="input" type="password" placeholder="Repite la contraseña"
                value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))} />
            </div>
            {pwForm.newPw && pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
              <div style={{fontSize:'12px',color:'var(--danger)',marginBottom:'10px'}}>❌ Las contraseñas no coinciden</div>
            )}
            {pwForm.newPw && pwForm.confirm && pwForm.newPw === pwForm.confirm && pwForm.newPw.length >= 8 && (
              <div style={{fontSize:'12px',color:'var(--success)',marginBottom:'10px'}}>✓ Las contraseñas coinciden</div>
            )}
            <button className="btn btn-primary" onClick={changePassword} disabled={savingPw}>
              {savingPw ? <><span className="spinner" style={{width:14,height:14}} /> Guardando...</> : 'Cambiar contraseña'}
            </button>
          </div>

          {/* Info cuenta */}
          <div className="card-lg" style={{marginBottom:'1.25rem'}}>
            <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'1.25rem'}}>
              📋 Información de la cuenta
            </h3>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {[
                ['Usuario',        '@'+user?.username],
                ['Email',          user?.email],
                ['Rol',            user?.role==='creator'?'✨ Creador':user?.role==='admin'?'⚙️ Admin':'👤 Fan'],
                ['Email verificado', user?.email_verified?'✅ Sí':'❌ No'],
                ['Miembro desde',  user?.created_at ? new Date(user.created_at).toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'}) : '-'],
              ].map(([label,value]) => (
                <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',background:'var(--dark3)',borderRadius:'8px',fontSize:'13px'}}>
                  <span style={{color:'var(--text3)'}}>{label}</span>
                  <span style={{fontWeight:500}}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zona de peligro */}
          <div className="card-lg" style={{border:'1px solid rgba(239,68,68,0.25)',background:'rgba(239,68,68,0.04)'}}>
            <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--danger)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'0.75rem'}}>
              ⚠️ Zona de peligro
            </h3>
            <p style={{fontSize:'13px',color:'var(--text2)',marginBottom:'1rem',lineHeight:1.6}}>
              Eliminar tu cuenta es permanente. Perderás todo tu contenido, suscriptores y balance disponible.
            </p>
            <div className="form-group">
              <label className="form-label">Escribe <strong style={{color:'var(--danger)'}}>@{user?.username}</strong> para confirmar</label>
              <input className="input" placeholder={user?.username}
                value={deleteConfirm} onChange={e=>setDelConf(e.target.value)}
                style={{borderColor:deleteConfirm&&deleteConfirm!==user?.username?'var(--danger)':'var(--border)'}} />
            </div>
            <button
              onClick={deleteAccount}
              disabled={deleting||deleteConfirm!==user?.username}
              style={{background:deleteConfirm===user?.username?'rgba(239,68,68,0.8)':'rgba(239,68,68,0.1)',color:deleteConfirm===user?.username?'white':'var(--danger)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'8px',padding:'10px 20px',cursor:deleteConfirm===user?.username?'pointer':'not-allowed',fontSize:'13px',fontWeight:600,fontFamily:'var(--font-body)',transition:'all 0.15s'}}>
              {deleting?<><span className="spinner" style={{width:14,height:14}} /> Eliminando...</>:'🗑️ Eliminar mi cuenta permanentemente'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
