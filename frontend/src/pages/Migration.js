import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, title: 'Tu perfil',     icon: '👤' },
  { id: 2, title: 'Tus planes',    icon: '💎' },
  { id: 3, title: 'Tu contenido',  icon: '🎬' },
  { id: 4, title: 'Tus fans',      icon: '📣' },
];

export default function Migration() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [profile, setProfile]   = useState({
    display_name: user?.display_name || '',
    bio: '',
    location: '',
    of_username: '',
  });
  const [tiers, setTiers]       = useState([
    { name: 'Básico', price: '9.99', description: 'Acceso a fotos y videos exclusivos' }
  ]);
  const [files, setFiles]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [done, setDone]         = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/me/profile', {
        display_name: profile.display_name,
        bio: profile.bio,
        location: profile.location,
        category: user?.category || 'general',
      });
      updateUser(data.user);
      toast.success('Perfil guardado ✓');
      setStep(2);
    } catch { toast.error('Error al guardar perfil'); }
    finally { setSaving(false); }
  };

  const saveTiers = async () => {
    setSaving(true);
    try {
      for (const tier of tiers) {
        if (!tier.name || !tier.price) continue;
        await api.post('/subscriptions/tiers', {
          name: tier.name,
          price: parseFloat(tier.price),
          description: tier.description,
          features: [tier.description],
        });
      }
      toast.success('Planes creados ✓');
      setStep(3);
    } catch { toast.error('Error al crear planes'); }
    finally { setSaving(false); }
  };

  const uploadContent = async () => {
    if (!files.length) { setStep(4); return; }
    setUploading(true);
    let uploaded = 0;
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const isVideo = file.type.startsWith('video/');
        const { data } = await api.post(
          isVideo ? '/uploads/video' : '/uploads/image',
          fd, { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        await api.post('/posts', {
          body: '',
          type: 'post',
          is_free: false,
          media: [{ url: data.url, thumbnail_url: data.thumbnail_url, type: isVideo ? 'video' : 'image' }],
        });
        uploaded++;
        setUploadProgress(Math.round((uploaded / files.length) * 100));
      } catch { console.error('Error subiendo', file.name); }
    }
    toast.success(`${uploaded} archivos subidos ✓`);
    setUploading(false);
    setStep(4);
  };

  const finish = () => {
    setDone(true);
    setTimeout(() => navigate(`/${user?.username}`), 2000);
  };

  if (done) return (
    <div style={{minHeight:'60vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'2rem'}}>
      <div style={{fontSize:'4rem',marginBottom:'1rem'}}>🎉</div>
      <h2 style={{fontFamily:'var(--font-display)',fontSize:'2rem',marginBottom:'0.5rem'}}>¡Migración completada!</h2>
      <p style={{color:'var(--text2)'}}>Redirigiendo a tu perfil...</p>
    </div>
  );

  return (
    <div className="page-content fade-in">
      <div style={{maxWidth:640,margin:'0 auto'}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <div style={{fontSize:'3rem',marginBottom:'12px'}}>🚀</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'2rem',fontWeight:700,marginBottom:'8px'}}>
            Migrar desde OnlyFans
          </h1>
          <p style={{color:'var(--text2)',fontSize:'14px'}}>
            Te ayudamos a configurar todo en FansVerse en minutos
          </p>
        </div>

        {/* Steps */}
        <div style={{display:'flex',gap:'8px',marginBottom:'2rem',justifyContent:'center'}}>
          {STEPS.map(s => (
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <div style={{
                width:36,height:36,borderRadius:'50%',
                background: step > s.id ? '#22C55E' : step === s.id ? '#E8365D' : 'var(--dark3)',
                border: `2px solid ${step >= s.id ? (step > s.id ? '#22C55E' : '#E8365D') : 'var(--border)'}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'14px',fontWeight:700,color:'white',
                transition:'all 0.3s'
              }}>
                {step > s.id ? '✓' : s.icon}
              </div>
              {s.id < STEPS.length && (
                <div style={{width:40,height:2,background:step > s.id ? '#22C55E' : 'var(--border)',transition:'background 0.3s'}} />
              )}
            </div>
          ))}
        </div>

        {/* PASO 1 - Perfil */}
        {step === 1 && (
          <div className="card-lg">
            <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'0.5rem'}}>👤 Configura tu perfil</h2>
            <p style={{color:'var(--text2)',fontSize:'13px',marginBottom:'1.5rem'}}>
              Copia tu información de OnlyFans aquí
            </p>
            <div className="form-group">
              <label className="form-label">Tu nombre en OnlyFans</label>
              <input className="input" placeholder="Ej: Valentina 🔥"
                value={profile.display_name}
                onChange={e => setProfile(p => ({...p, display_name: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tu bio (cópiala de OnlyFans)</label>
              <textarea className="textarea" style={{minHeight:100}}
                placeholder="Escribe algo sobre ti..."
                value={profile.bio}
                onChange={e => setProfile(p => ({...p, bio: e.target.value}))} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'1rem'}}>
              <div className="form-group" style={{margin:0}}>
                <label className="form-label">Tu usuario de OnlyFans</label>
                <input className="input" placeholder="@tu_usuario"
                  value={profile.of_username}
                  onChange={e => setProfile(p => ({...p, of_username: e.target.value}))} />
              </div>
              <div className="form-group" style={{margin:0}}>
                <label className="form-label">Ubicación</label>
                <input className="input" placeholder="Colombia, México..."
                  value={profile.location}
                  onChange={e => setProfile(p => ({...p, location: e.target.value}))} />
              </div>
            </div>
            <div style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'10px',padding:'12px',fontSize:'13px',color:'#60A5FA',marginBottom:'1.5rem'}}>
              💡 <strong>Consejo:</strong> Usa el mismo nombre de usuario que en OnlyFans para que tus fans te encuentren fácilmente
            </div>
            <button className="btn btn-primary btn-full" onClick={saveProfile} disabled={saving}>
              {saving ? <><span className="spinner" style={{width:14,height:14}} /> Guardando...</> : 'Continuar →'}
            </button>
          </div>
        )}

        {/* PASO 2 - Planes */}
        {step === 2 && (
          <div className="card-lg">
            <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'0.5rem'}}>💎 Crea tus planes</h2>
            <p style={{color:'var(--text2)',fontSize:'13px',marginBottom:'1.5rem'}}>
              ¿Cuánto cobras en OnlyFans? Ponlo aquí. Puedes ajustarlo después.
            </p>

            {tiers.map((tier, i) => (
              <div key={i} style={{background:'var(--dark3)',borderRadius:'10px',padding:'1rem',marginBottom:'10px',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <span style={{fontWeight:600,fontSize:'13px'}}>Plan {i+1}</span>
                  {tiers.length > 1 && (
                    <button onClick={() => setTiers(t => t.filter((_,j)=>j!==i))}
                      style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:'16px'}}>✕</button>
                  )}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>
                    <label className="form-label">Nombre del plan</label>
                    <input className="input" placeholder="Básico, VIP, Premium..."
                      value={tier.name} onChange={e => setTiers(t => t.map((x,j)=>j===i?{...x,name:e.target.value}:x))} />
                  </div>
                  <div>
                    <label className="form-label">Precio/mes (USD)</label>
                    <input className="input" type="number" min="1" placeholder="9.99"
                      value={tier.price} onChange={e => setTiers(t => t.map((x,j)=>j===i?{...x,price:e.target.value}:x))} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Descripción</label>
                  <input className="input" placeholder="Qué incluye este plan..."
                    value={tier.description} onChange={e => setTiers(t => t.map((x,j)=>j===i?{...x,description:e.target.value}:x))} />
                </div>
              </div>
            ))}

            <button className="btn btn-outline btn-full btn-sm" style={{marginBottom:'1rem'}}
              onClick={() => setTiers(t => [...t, {name:'',price:'',description:''}])}>
              + Agregar otro plan
            </button>

            <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'10px',padding:'12px',fontSize:'13px',color:'#22C55E',marginBottom:'1.5rem'}}>
              💰 Con FansVerse te quedas con el <strong>85%</strong>. Si cobrabas $10 en OF ganabas $8. Aquí ganarás <strong>$8.50</strong>.
            </div>

            <div style={{display:'flex',gap:'8px'}}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>← Atrás</button>
              <button className="btn btn-primary" style={{flex:1}} onClick={saveTiers} disabled={saving}>
                {saving ? <><span className="spinner" style={{width:14,height:14}} /> Creando...</> : 'Crear planes →'}
              </button>
            </div>
          </div>
        )}

        {/* PASO 3 - Contenido */}
        {step === 3 && (
          <div className="card-lg">
            <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'0.5rem'}}>🎬 Sube tu contenido</h2>
            <p style={{color:'var(--text2)',fontSize:'13px',marginBottom:'1rem'}}>
              Selecciona las fotos y videos que quieres migrar
            </p>

            <div style={{background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:'10px',padding:'1rem',marginBottom:'1.25rem',fontSize:'13px'}}>
              <strong style={{color:'#D4A843'}}>¿Cómo descargar tu contenido de OnlyFans?</strong>
              <ol style={{marginTop:'8px',paddingLeft:'16px',color:'var(--text2)',lineHeight:2}}>
                <li>Ve a <strong>OnlyFans → Configuración → Privacidad</strong></li>
                <li>Busca <strong>"Descargar mis datos"</strong> o <strong>"Request Data"</strong></li>
                <li>Descarga el ZIP que te envían por email</li>
                <li>Extrae las fotos y videos y súbelos aquí</li>
              </ol>
            </div>

            <div
              onClick={() => document.getElementById('migration-files').click()}
              style={{border:'2px dashed var(--border2)',borderRadius:'12px',padding:'2.5rem',textAlign:'center',cursor:'pointer',background:'var(--dark3)',marginBottom:'1rem',transition:'all 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#E8365D'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>
              <input id="migration-files" type="file" multiple accept="image/*,video/*" style={{display:'none'}}
                onChange={e => setFiles(Array.from(e.target.files))} />
              {files.length > 0 ? (
                <>
                  <div style={{fontSize:'2rem',marginBottom:'8px'}}>✅</div>
                  <div style={{fontWeight:600,color:'var(--success)'}}>{files.length} archivos seleccionados</div>
                  <div style={{fontSize:'12px',color:'var(--text3)',marginTop:'4px'}}>
                    {files.filter(f=>f.type.startsWith('image/')).length} fotos · {files.filter(f=>f.type.startsWith('video/')).length} videos
                  </div>
                </>
              ) : (
                <>
                  <div style={{fontSize:'2.5rem',marginBottom:'8px'}}>📁</div>
                  <div style={{fontWeight:500,marginBottom:'4px'}}>Arrastra o selecciona tus archivos</div>
                  <div style={{fontSize:'12px',color:'var(--text3)'}}>Fotos y videos · Hasta 500MB por archivo</div>
                </>
              )}
            </div>

            {uploading && (
              <div style={{background:'var(--dark3)',borderRadius:'10px',padding:'1rem',marginBottom:'1rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'8px'}}>
                  <span>Subiendo contenido...</span>
                  <span style={{fontWeight:600,color:'#E8365D'}}>{uploadProgress}%</span>
                </div>
                <div style={{height:6,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',background:'#E8365D',borderRadius:3,width:`${uploadProgress}%`,transition:'width 0.3s'}} />
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:'8px'}}>
              <button className="btn btn-outline" onClick={() => setStep(2)} disabled={uploading}>← Atrás</button>
              <button className="btn btn-outline" style={{flex:1}} onClick={() => setStep(4)} disabled={uploading}>
                Saltar este paso
              </button>
              <button className="btn btn-primary" style={{flex:2}} onClick={uploadContent} disabled={uploading||!files.length}>
                {uploading ? `Subiendo ${uploadProgress}%...` : `Subir ${files.length} archivos →`}
              </button>
            </div>
          </div>
        )}

        {/* PASO 4 - Fans */}
        {step === 4 && (
          <div className="card-lg">
            <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'0.5rem'}}>📣 Invita a tus fans</h2>
            <p style={{color:'var(--text2)',fontSize:'13px',marginBottom:'1.5rem'}}>
              Copia estos mensajes y publícalos en tus redes sociales
            </p>

            {[
              {
                platform: '🐦 Twitter/X',
                text: `¡Me mudé a FansVerse! 🔥\n\nMismo contenido de siempre pero con más contenido exclusivo, lives y historias.\n\nEncuéntrame aquí 👇\nfansverse.site/${user?.username}\n\n#FansVerse #Creador`
              },
              {
                platform: '📸 Instagram',
                text: `¡Novedad! Me encuentran también en FansVerse 🎉\n\nContenido exclusivo, lives y mucho más:\nfansverse.site/${user?.username}`
              },
              {
                platform: '💬 Mensaje directo a fans',
                text: `Hola! Te escribo para avisarte que ahora también estoy en FansVerse:\nfansverse.site/${user?.username}\n\nTengo contenido exclusivo esperándote 🔥`
              },
            ].map((item, i) => (
              <div key={i} style={{background:'var(--dark3)',borderRadius:'10px',padding:'1rem',marginBottom:'10px',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <span style={{fontWeight:600,fontSize:'13px'}}>{item.platform}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(item.text); toast.success('¡Copiado!'); }}
                    className="btn btn-outline btn-sm">
                    📋 Copiar
                  </button>
                </div>
                <pre style={{fontSize:'12px',color:'var(--text2)',whiteSpace:'pre-wrap',fontFamily:'var(--font-body)',margin:0,lineHeight:1.7}}>
                  {item.text}
                </pre>
              </div>
            ))}

            <div style={{background:'rgba(232,54,93,0.1)',border:'1px solid rgba(232,54,93,0.2)',borderRadius:'10px',padding:'1rem',fontSize:'13px',marginBottom:'1.5rem'}}>
              <strong style={{color:'#E8365D'}}>💡 Tu link de referidos:</strong>
              <div style={{color:'var(--text2)',marginTop:'4px'}}>
                Comparte <code style={{background:'var(--dark)',padding:'2px 6px',borderRadius:'4px',color:'white'}}>
                  fansverse.site/register?ref={user?.referral_code}
                </code> y gana 50 puntos por cada fan que se registre.
              </div>
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={finish}>
              ✓ ¡Listo, ir a mi perfil!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
