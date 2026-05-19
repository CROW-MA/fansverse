import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]           = useState('overview');
  const [stats, setStats]       = useState(null);
  const [users, setUsers]       = useState([]);
  const [kycs, setKycs]         = useState([]);
  const [reports, setReports]   = useState([]);
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejReason, setRejReason] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [editLimit, setEditLimit]   = useState(null);
  const [limitForm, setLimitForm]   = useState({ max_daily: '', max_instant: '' });

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [k, r, u, s, p] = await Promise.all([
        api.get('/kyc/pending'),
        api.get('/reports?status=pending'),
        api.get('/admin/users'),
        api.get('/admin/stats'),
        api.get('/admin/posts'),
      ]);
      setKycs(k.data.verifications || []);
      setReports(r.data.reports || []);
      setUsers(u.data.users || []);
      setStats(s.data);
      setPosts(p.data.posts || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const reviewKyc = async (id, status) => {
    try {
      await api.patch(`/kyc/${id}/review`, { status, rejection_reason: rejReason });
      toast.success(status === 'approved' ? '✅ KYC aprobado' : '❌ KYC rechazado');
      setSelected(null); setRejReason(''); loadAll();
    } catch { toast.error('Error'); }
  };

  const reviewReport = async (id, status, action, userId) => {
    try {
      await api.patch(`/reports/${id}`, { status, action, user_id: userId });
      toast.success('Reporte actualizado'); loadAll();
    } catch { toast.error('Error'); }
  };

  const banUser = async (userId, ban) => {
    if (!window.confirm(ban ? '¿Banear este usuario?' : '¿Desbanear?')) return;
    try {
      await api.patch(`/admin/users/${userId}`, { is_active: !ban });
      toast.success(ban ? 'Usuario baneado' : 'Usuario activado');
      loadAll();
    } catch { toast.error('Error'); }
  };

  const changeRole = async (userId, role) => {
    try {
      await api.patch(`/admin/users/${userId}`, { role });
      toast.success('Rol actualizado'); loadAll();
    } catch { toast.error('Error'); }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('¿Eliminar este post?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      toast.success('Post eliminado'); loadAll();
    } catch { toast.error('Error'); }
  };

  const saveLimits = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}`, {
        payout_max_daily:   parseFloat(limitForm.max_daily),
        payout_max_instant: parseFloat(limitForm.max_instant),
      });
      toast.success('Límites actualizados ✓');
      setEditLimit(null);
      loadAll();
    } catch { toast.error('Error al guardar límites'); }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) return (
    <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}>
      <div className="spinner" style={{width:36,height:36}} />
    </div>
  );

  const StatCard = ({ icon, label, value, sub, color='#E8365D' }) => (
    <div className="card" style={{textAlign:'center',padding:'1.5rem'}}>
      <div style={{fontSize:'2rem',marginBottom:'6px'}}>{icon}</div>
      <div style={{fontFamily:'var(--font-display)',fontSize:'2rem',fontWeight:700,color,marginBottom:'4px'}}>{value}</div>
      <div style={{fontWeight:600,fontSize:'13px',marginBottom:'2px'}}>{label}</div>
      {sub && <div style={{fontSize:'11px',color:'var(--text3)'}}>{sub}</div>}
    </div>
  );

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,marginBottom:'4px'}}>Panel Admin</h1>
          <p style={{color:'var(--text2)',fontSize:'13px'}}>Control total de FansVerse</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadAll}>🔄 Actualizar</button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'6px',marginBottom:'1.5rem',flexWrap:'wrap'}}>
        {[
          ['overview', '📊 Resumen'],
          ['users',    `👥 Usuarios (${users.length})`],
          ['posts',    `📝 Contenido (${posts.length})`],
          ['kyc',      `🪪 KYC (${kycs.length})`],
          ['reports',  `🚨 Reportes (${reports.length})`],
          ['limits',   '💸 Límites retiro'],
        ].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{padding:'8px 14px',borderRadius:'8px',border:`1px solid ${tab===t?'#E8365D':'var(--border)'}`,background:tab===t?'var(--rose-light)':'transparent',color:tab===t?'#E8365D':'var(--text2)',cursor:'pointer',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)'}}>
            {l}
          </button>
        ))}
      </div>

      {/* RESUMEN */}
      {tab === 'overview' && stats && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
            <StatCard icon="👥" label="Usuarios totales"  value={stats.total_users||0}       color='#60A5FA' />
            <StatCard icon="✨" label="Creadores"         value={stats.total_creators||0}     color='#E8365D' />
            <StatCard icon="👤" label="Fans"              value={stats.total_fans||0}          color='#22C55E' />
            <StatCard icon="📝" label="Posts"             value={stats.total_posts||0}         color='#D4A843' />
            <StatCard icon="⭐" label="Suscripciones"     value={stats.total_subscriptions||0} color='#A78BFA' />
            <StatCard icon="💰" label="Ingresos totales"  value={`$${parseFloat(stats.total_revenue||0).toFixed(0)}`} color='#22C55E' sub="USD plataforma" />
            <StatCard icon="💸" label="Pagado creadores"  value={`$${parseFloat(stats.total_paid||0).toFixed(0)}`}    color='#E8365D' sub="USD total" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <div className="card-lg">
              <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'1rem'}}>📈 Últimos registros</h3>
              {(stats.recent_users||[]).slice(0,8).map(u => (
                <div key={u.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:'13px',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,color:'white',overflow:'hidden'}}>
                      {u.avatar_url ? <img src={u.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : u.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:500}}>@{u.username}</div>
                      <div style={{fontSize:'11px',color:'var(--text3)'}}>{u.email}</div>
                    </div>
                  </div>
                  <span style={{background:u.role==='creator'?'rgba(232,54,93,0.15)':'rgba(96,165,250,0.15)',color:u.role==='creator'?'#E8365D':'#60A5FA',fontSize:'11px',fontWeight:600,padding:'2px 8px',borderRadius:'6px'}}>
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
            <div className="card-lg">
              <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'1rem'}}>💰 Últimas transacciones</h3>
              {(stats.recent_transactions||[]).slice(0,8).map(t => (
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:'13px',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:500}}>{t.description||t.type}</div>
                    <div style={{fontSize:'11px',color:'var(--text3)'}}>{new Date(t.created_at).toLocaleDateString('es-CO')}</div>
                  </div>
                  <span style={{fontWeight:700,color:'#22C55E'}}>${parseFloat(t.amount||0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* USUARIOS */}
      {tab === 'users' && (
        <div>
          <div style={{marginBottom:'1rem'}}>
            <input className="input" style={{maxWidth:400}} placeholder="🔍 Buscar por usuario o email..."
              value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          </div>
          <div className="card-lg" style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px',minWidth:700}}>
              <thead>
                <tr>
                  {['Usuario','Email','Rol','Estado','KYC','Ganancias','Acciones'].map(h => (
                    <th key={h} style={{textAlign:'left',padding:'0 8px 12px 0',fontSize:'11px',color:'var(--text3)',borderBottom:'1px solid var(--border)',textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{padding:'10px 8px 10px 0',borderBottom:'1px solid var(--border)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,color:'white',overflow:'hidden',flexShrink:0}}>
                          {u.avatar_url ? <img src={u.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : u.username?.[0]?.toUpperCase()}
                        </div>
                        <span style={{fontWeight:500}}>@{u.username}</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 8px 10px 0',borderBottom:'1px solid var(--border)',color:'var(--text2)',fontSize:'12px'}}>{u.email}</td>
                    <td style={{padding:'10px 8px 10px 0',borderBottom:'1px solid var(--border)'}}>
                      <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                        style={{background:'var(--dark3)',border:'1px solid var(--border)',borderRadius:'6px',padding:'3px 6px',color:'white',fontSize:'12px',cursor:'pointer',fontFamily:'var(--font-body)'}}>
                        <option value="fan">fan</option>
                        <option value="creator">creator</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td style={{padding:'10px 8px 10px 0',borderBottom:'1px solid var(--border)'}}>
                      <span style={{background:u.is_active?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)',color:u.is_active?'#22C55E':'var(--danger)',fontSize:'11px',fontWeight:600,padding:'2px 8px',borderRadius:'6px'}}>
                        {u.is_active ? '✓ Activo' : '✗ Baneado'}
                      </span>
                    </td>
                    <td style={{padding:'10px 8px 10px 0',borderBottom:'1px solid var(--border)'}}>
                      <span style={{fontSize:'11px',color:u.is_verified?'#22C55E':'var(--text3)'}}>
                        {u.is_verified ? '✅' : '⏳'}
                      </span>
                    </td>
                    <td style={{padding:'10px 8px 10px 0',borderBottom:'1px solid var(--border)',color:'#22C55E',fontWeight:600}}>
                      ${parseFloat(u.total_earnings||0).toFixed(2)}
                    </td>
                    <td style={{padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button onClick={() => navigate(`/${u.username}`)}
                          style={{background:'rgba(96,165,250,0.1)',color:'#60A5FA',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',fontSize:'11px',fontFamily:'var(--font-body)'}}>
                          Ver
                        </button>
                        <button onClick={() => banUser(u.id, u.is_active)}
                          style={{background:u.is_active?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.1)',color:u.is_active?'var(--danger)':'#22C55E',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',fontSize:'11px',fontFamily:'var(--font-body)'}}>
                          {u.is_active ? 'Banear' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO */}
      {tab === 'posts' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'1rem'}}>
          {posts.map(p => {
            const media = typeof p.media === 'string' ? JSON.parse(p.media||'[]') : (p.media||[]);
            const thumb = media[0];
            return (
              <div key={p.id} className="card" style={{overflow:'hidden',padding:0}}>
                <div style={{height:140,background:'#111',position:'relative',overflow:'hidden'}}>
                  {thumb
                    ? <img src={thumb.thumbnail_url||thumb.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                    : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontSize:'2rem'}}>📝</div>
                  }
                  <div style={{position:'absolute',top:6,left:6,background:'rgba(0,0,0,0.7)',color:'white',fontSize:'10px',fontWeight:600,padding:'2px 6px',borderRadius:'4px'}}>{p.type}</div>
                </div>
                <div style={{padding:'10px'}}>
                  <div style={{fontSize:'12px',fontWeight:500,marginBottom:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.title||p.body?.substring(0,40)||'Sin título'}
                  </div>
                  <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'8px'}}>@{p.username} · 👁{p.view_count||0} · ❤️{p.like_count||0}</div>
                  <div style={{display:'flex',gap:'4px'}}>
                    <button onClick={() => navigate(`/${p.username}`)}
                      style={{flex:1,background:'rgba(96,165,250,0.1)',color:'#60A5FA',border:'none',borderRadius:'6px',padding:'4px',cursor:'pointer',fontSize:'11px',fontFamily:'var(--font-body)'}}>
                      Ver perfil
                    </button>
                    <button onClick={() => deletePost(p.id)}
                      style={{flex:1,background:'rgba(239,68,68,0.1)',color:'var(--danger)',border:'none',borderRadius:'6px',padding:'4px',cursor:'pointer',fontSize:'11px',fontFamily:'var(--font-body)'}}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KYC */}
      {tab === 'kyc' && (
        <div>
          {kycs.length === 0
            ? <div className="card" style={{textAlign:'center',padding:'3rem',color:'var(--text3)'}}>✓ No hay KYC pendientes</div>
            : kycs.map(k => (
              <div key={k.id} className="card" style={{marginBottom:'1rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                  <div>
                    <div style={{fontWeight:600}}>{k.display_name} <span style={{color:'var(--text3)'}}>@{k.username}</span></div>
                    <div style={{fontSize:'12px',color:'var(--text3)'}}>{k.email} · {k.document_type} · {new Date(k.submitted_at).toLocaleDateString('es-CO')}</div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setSelected(selected?.id===k.id?null:k)}>
                    {selected?.id===k.id ? 'Cerrar' : '👁 Revisar'}
                  </button>
                </div>
                {selected?.id === k.id && (
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'1rem'}}>
                      {[['Frente',k.document_front_url],['Dorso',k.document_back_url],['Selfie',k.selfie_url]].map(([label,url]) => url && (
                        <div key={label}>
                          <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'4px',fontWeight:600}}>{label}</div>
                          <img src={url} alt={label} style={{width:'100%',height:140,objectFit:'cover',borderRadius:'8px',border:'1px solid var(--border)',cursor:'pointer'}}
                            onClick={() => window.open(url,'_blank')} />
                        </div>
                      ))}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Motivo de rechazo (si aplica)</label>
                      <input className="input" placeholder="Ej: Documento ilegible..." value={rejReason} onChange={e => setRejReason(e.target.value)} />
                    </div>
                    <div style={{display:'flex',gap:'8px'}}>
                      <button className="btn btn-primary" style={{flex:1}} onClick={() => reviewKyc(k.id,'approved')}>✅ Aprobar</button>
                      <button style={{flex:1,background:'rgba(239,68,68,0.1)',color:'var(--danger)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'8px',padding:'10px',cursor:'pointer',fontFamily:'var(--font-body)',fontWeight:600}}
                        onClick={() => { if(!rejReason) return toast.error('Escribe el motivo'); reviewKyc(k.id,'rejected'); }}>
                        ❌ Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* REPORTES */}
      {tab === 'reports' && (
        <div>
          {reports.length === 0
            ? <div className="card" style={{textAlign:'center',padding:'3rem',color:'var(--text3)'}}>✓ No hay reportes pendientes</div>
            : reports.map(r => (
              <div key={r.id} className="card" style={{marginBottom:'1rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                  <div>
                    <span style={{background:'rgba(239,68,68,0.15)',color:'var(--danger)',fontSize:'11px',fontWeight:600,padding:'3px 8px',borderRadius:'6px',marginRight:'8px'}}>{r.reason}</span>
                    <span style={{fontSize:'13px',fontWeight:500}}>por @{r.reporter_username}</span>
                  </div>
                  <div style={{fontSize:'11px',color:'var(--text3)'}}>{new Date(r.created_at).toLocaleDateString('es-CO')}</div>
                </div>
                {r.reported_username && <div style={{fontSize:'13px',color:'var(--text2)',marginBottom:'4px'}}>Usuario: <strong>@{r.reported_username}</strong></div>}
                {r.description && <div style={{fontSize:'13px',color:'var(--text3)',marginBottom:'10px',fontStyle:'italic'}}>"{r.description}"</div>}
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  <button className="btn btn-outline btn-sm" onClick={() => reviewReport(r.id,'resolved','none',null)}>✓ Desestimar</button>
                  <button style={{background:'rgba(245,158,11,0.1)',color:'#F59E0B',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'8px',padding:'6px 12px',cursor:'pointer',fontSize:'12px',fontFamily:'var(--font-body)'}}
                    onClick={() => reviewReport(r.id,'warned','warn',r.reported_user_id)}>⚠️ Advertir</button>
                  <button style={{background:'rgba(239,68,68,0.1)',color:'var(--danger)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'8px',padding:'6px 12px',cursor:'pointer',fontSize:'12px',fontFamily:'var(--font-body)'}}
                    onClick={() => { if(window.confirm('¿Banear?')) reviewReport(r.id,'banned','ban',r.reported_user_id); }}>🚫 Banear</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* LÍMITES DE RETIRO */}
      {tab === 'limits' && (
        <div>
          <div className="card-lg" style={{marginBottom:'1rem',background:'rgba(212,168,67,0.05)',border:'1px solid rgba(212,168,67,0.2)'}}>
            <h3 style={{fontSize:'13px',fontWeight:600,color:'#D4A843',marginBottom:'12px'}}>⚙️ Reglas globales activas</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'10px',fontSize:'13px'}}>
              {[
                ['Mínimo retiro','$100 USD'],
                ['Máximo instantáneo','$500 USD'],
                ['Máximo diario','$1,000 USD'],
                ['Retiros por día','2 máximo'],
                ['KYC requerido','Sí, obligatorio'],
                ['Espera inicial','7 días post-registro'],
                ['Fines de semana','Solo 24h'],
              ].map(([k,v]) => (
                <div key={k} style={{background:'var(--dark3)',borderRadius:'8px',padding:'10px 12px'}}>
                  <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'2px'}}>{k}</div>
                  <div style={{fontWeight:600,color:'white'}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-lg">
            <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'8px'}}>
              Límites personalizados por creador
            </h3>
            <p style={{fontSize:'12px',color:'var(--text3)',marginBottom:'1rem'}}>
              Sube los límites a creadores de confianza con alto volumen
            </p>
            {users.filter(u => u.role === 'creator').map(u => (
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:700,color:'white',overflow:'hidden',flexShrink:0}}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : u.username?.[0]?.toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:120}}>
                  <div style={{fontWeight:500,fontSize:'13px'}}>@{u.username}</div>
                  <div style={{fontSize:'11px',color:'var(--text3)'}}>
                    Diario: ${u.payout_max_daily||1000} · Instantáneo: ${u.payout_max_instant||500}
                  </div>
                  <div style={{fontSize:'11px',color:'#22C55E'}}>
                    Ganancias totales: ${parseFloat(u.total_earnings||0).toFixed(2)}
                  </div>
                </div>
                {editLimit === u.id ? (
                  <div style={{display:'flex',gap:'6px',alignItems:'flex-end',flexWrap:'wrap'}}>
                    <div>
                      <div style={{fontSize:'10px',color:'var(--text3)',marginBottom:'2px'}}>Máx. diario ($)</div>
                      <input className="input" type="number" style={{width:100,padding:'6px 8px',fontSize:'12px'}}
                        placeholder="1000" value={limitForm.max_daily}
                        onChange={e => setLimitForm(f=>({...f,max_daily:e.target.value}))} />
                    </div>
                    <div>
                      <div style={{fontSize:'10px',color:'var(--text3)',marginBottom:'2px'}}>Máx. instantáneo ($)</div>
                      <input className="input" type="number" style={{width:100,padding:'6px 8px',fontSize:'12px'}}
                        placeholder="500" value={limitForm.max_instant}
                        onChange={e => setLimitForm(f=>({...f,max_instant:e.target.value}))} />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => saveLimits(u.id)}>✓ Guardar</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditLimit(null)}>✕</button>
                  </div>
                ) : (
                  <button className="btn btn-outline btn-sm"
                    onClick={() => {
                      setEditLimit(u.id);
                      setLimitForm({max_daily: u.payout_max_daily||1000, max_instant: u.payout_max_instant||500});
                    }}>
                    ✏️ Editar límites
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
