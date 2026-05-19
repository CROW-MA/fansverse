import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Rewards() {
  const { user } = useAuth();
  const [points, setPoints]       = useState(null);
  const [badges, setBadges]       = useState([]);
  const [referral, setReferral]   = useState(null);
  const [affiliate, setAffiliate] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [tab, setTab]             = useState('points');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/rewards/points'),
      api.get('/rewards/badges'),
      api.get('/rewards/referral'),
      api.get('/rewards/affiliate').catch(() => ({ data: null })),
    ]).then(([p, b, r, a]) => {
      setPoints(p.data);
      setBadges(b.data.badges || []);
      setReferral(r.data);
      setAffiliate(a.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const redeem = async () => {
    const pts = parseInt(redeemAmount);
    if (!pts || pts < 100) return toast.error('Mínimo 100 puntos para canjear');
    if (pts > (points?.points || 0)) return toast.error('Puntos insuficientes');
    setRedeeming(true);
    try {
      const { data } = await api.post('/rewards/points/redeem', { points_to_redeem: pts });
      toast.success(data.message);
      setPoints(prev => ({ ...prev, points: prev.points - pts }));
      setRedeemAmount('');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al canjear');
    } finally { setRedeeming(false); }
  };

  const copyRef = (link) => {
    navigator.clipboard.writeText(link);
    toast.success('¡Link copiado!');
  };

  if (loading) return (
    <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}>
      <div className="spinner" style={{width:32,height:32}} />
    </div>
  );

  return (
    <div className="page-content fade-in">
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,marginBottom:'4px'}}>Recompensas</h1>
      <p style={{color:'var(--text2)',fontSize:'14px',marginBottom:'1.5rem'}}>Acumula puntos y gana por referir creadores</p>

      {/* Balance de puntos */}
      <div style={{background:'linear-gradient(135deg,rgba(232,54,93,0.15),rgba(212,168,67,0.15))',border:'1px solid rgba(232,54,93,0.25)',borderRadius:'var(--radius-lg)',padding:'2rem',textAlign:'center',marginBottom:'1.5rem'}}>
        <div style={{fontSize:'12px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Tus puntos</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:'3.5rem',fontWeight:700,color:'#D4A843',marginBottom:'4px'}}>
          {(points?.points || 0).toLocaleString()}
        </div>
        <div style={{fontSize:'13px',color:'var(--text2)'}}>
          = <strong style={{color:'#22C55E'}}>${((points?.points || 0) / 100).toFixed(2)} USD</strong> canjeables
        </div>
        <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>100 puntos = $1.00 USD · Total ganado: {(points?.total_earned || 0).toLocaleString()} pts</div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'6px',marginBottom:'1.25rem',flexWrap:'wrap'}}>
        {[['points','💰 Puntos'],['badges','🏆 Insignias'],['referral','👥 Referidos'],['affiliate','🤝 Afiliados']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{padding:'8px 16px',borderRadius:'8px',border:`1px solid ${tab===t?'#E8365D':'var(--border)'}`,background:tab===t?'var(--rose-light)':'transparent',color:tab===t?'#E8365D':'var(--text2)',cursor:'pointer',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)'}}>
            {l}
          </button>
        ))}
      </div>

      {/* PUNTOS */}
      {tab === 'points' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
          <div className="card-lg">
            <h3 style={{fontSize:'14px',fontWeight:600,marginBottom:'1rem'}}>Canjear puntos</h3>
            <div style={{background:'var(--dark3)',borderRadius:'10px',padding:'1rem',marginBottom:'1rem',fontSize:'13px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                <span style={{color:'var(--text2)'}}>Disponibles</span>
                <span style={{fontWeight:600,color:'#D4A843'}}>{(points?.points||0).toLocaleString()} pts</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--text2)'}}>Valor en USD</span>
                <span style={{fontWeight:600,color:'#22C55E'}}>${((points?.points||0)/100).toFixed(2)}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Puntos a canjear (mín. 100)</label>
              <input className="input" type="number" min="100" step="100"
                placeholder="Ej: 500" value={redeemAmount}
                onChange={e => setRedeemAmount(e.target.value)} />
              {redeemAmount >= 100 && (
                <div style={{fontSize:'12px',color:'#22C55E',marginTop:'4px'}}>
                  Recibirás: ${(parseInt(redeemAmount||0)/100).toFixed(2)} USD en tu balance
                </div>
              )}
            </div>
            <button className="btn btn-gold btn-full" onClick={redeem} disabled={redeeming}>
              {redeeming ? <><span className="spinner" style={{width:14,height:14}} /> Canjeando...</> : '💰 Canjear puntos'}
            </button>
          </div>

          <div className="card-lg">
            <h3 style={{fontSize:'14px',fontWeight:600,marginBottom:'1rem'}}>Cómo ganar puntos</h3>
            {[
              ['🔔','Suscribirte a un creador','50 pts'],
              ['💎','Renovar suscripción mensual','30 pts'],
              ['🔒','Comprar contenido PPV','10 pts por $1'],
              ['💝','Enviar una propina','10 pts por $1'],
              ['👥','Referir un amigo fan','50 pts'],
              ['🤝','Referir un creador','5% de sus ganancias'],
            ].map(([icon,desc,pts]) => (
              <div key={desc} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:'13px'}}>
                <span>{icon} {desc}</span>
                <span style={{color:'#D4A843',fontWeight:600}}>{pts}</span>
              </div>
            ))}
          </div>

          <div className="card-lg" style={{gridColumn:'1/-1'}}>
            <h3 style={{fontSize:'14px',fontWeight:600,marginBottom:'1rem'}}>Historial reciente</h3>
            {(points?.history || []).length === 0
              ? <div style={{color:'var(--text3)',fontSize:'13px',textAlign:'center',padding:'1rem'}}>Sin movimientos aún</div>
              : (points?.history || []).map((h, i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)',fontSize:'13px'}}>
                  <div>
                    <div style={{fontWeight:500}}>{h.description}</div>
                    <div style={{fontSize:'11px',color:'var(--text3)'}}>{new Date(h.created_at).toLocaleDateString('es-CO')}</div>
                  </div>
                  <span style={{fontWeight:700,color:h.points>0?'#D4A843':'var(--danger)'}}>{h.points>0?'+':''}{h.points} pts</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* INSIGNIAS */}
      {tab === 'badges' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'1rem'}}>
          {badges.map(b => (
            <div key={b.id} className="card" style={{textAlign:'center',opacity:b.earned?1:0.5,border:`1px solid ${b.earned?'rgba(212,168,67,0.4)':'var(--border)'}`}}>
              <div style={{fontSize:'2.5rem',marginBottom:'8px'}}>{b.icon}</div>
              <div style={{fontWeight:600,fontSize:'14px',marginBottom:'4px'}}>{b.name}</div>
              <div style={{fontSize:'12px',color:'var(--text2)',marginBottom:'8px'}}>{b.description}</div>
              {b.earned
                ? <span style={{background:'rgba(34,197,94,0.15)',color:'#22C55E',fontSize:'11px',fontWeight:600,padding:'3px 10px',borderRadius:'20px'}}>✓ Ganada</span>
                : <span style={{background:'var(--dark3)',color:'var(--text3)',fontSize:'11px',padding:'3px 10px',borderRadius:'20px'}}>Pendiente</span>
              }
            </div>
          ))}
        </div>
      )}

      {/* REFERIDOS */}
      {tab === 'referral' && (
        <div style={{maxWidth:560}}>
          <div className="card-lg" style={{marginBottom:'1rem'}}>
            <h3 style={{fontSize:'14px',fontWeight:600,marginBottom:'1rem'}}>Tu link de referido para fans</h3>
            <div style={{background:'var(--dark3)',borderRadius:'10px',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',gap:'10px'}}>
              <span style={{fontSize:'13px',color:'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                {referral?.link}
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => copyRef(referral?.link)}>Copiar</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
              <div style={{background:'var(--dark3)',borderRadius:'10px',padding:'1rem',textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'2rem',fontWeight:700,color:'#E8365D'}}>{referral?.total_referrals || 0}</div>
                <div style={{fontSize:'12px',color:'var(--text3)'}}>Fans referidos</div>
              </div>
              <div style={{background:'var(--dark3)',borderRadius:'10px',padding:'1rem',textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'2rem',fontWeight:700,color:'#22C55E'}}>{(referral?.total_referrals||0) * 50}</div>
                <div style={{fontSize:'12px',color:'var(--text3)'}}>Puntos ganados</div>
              </div>
            </div>
            <div style={{background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:'10px',padding:'12px 16px',fontSize:'13px'}}>
              <strong style={{color:'#D4A843'}}>💡 Cómo funciona:</strong>
              <ul style={{marginTop:'6px',paddingLeft:'16px',color:'var(--text2)',lineHeight:1.8}}>
                <li>Comparte tu link con amigos fans</li>
                <li>Cuando se registren y hagan su primera suscripción, ganas <strong style={{color:'#D4A843'}}>50 puntos</strong></li>
                <li>50 puntos = $0.50 USD canjeables</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* AFILIADOS */}
      {tab === 'affiliate' && (
        <div style={{maxWidth:600}}>
          <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.15),rgba(232,54,93,0.1))',border:'1px solid rgba(212,168,67,0.3)',borderRadius:'var(--radius-lg)',padding:'1.5rem',marginBottom:'1.25rem',textAlign:'center'}}>
            <div style={{fontSize:'2.5rem',marginBottom:'8px'}}>🤝</div>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'8px'}}>Programa de Afiliados para Creadores</h3>
            <p style={{color:'var(--text2)',fontSize:'13px',marginBottom:'1rem',lineHeight:1.7}}>
              Refiere otros <strong style={{color:'white'}}>creadores de contenido</strong> a FansVerse y gana el{' '}
              <strong style={{color:'#D4A843'}}>5% de sus ganancias de por vida</strong>.<br/>
              Entre más ganen ellos, más ganas tú — sin límite.
            </p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',maxWidth:400,margin:'0 auto'}}>
              <div style={{background:'rgba(0,0,0,0.3)',borderRadius:'10px',padding:'1rem'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,color:'#D4A843'}}>
                  {affiliate?.referred_creators?.length || 0}
                </div>
                <div style={{fontSize:'12px',color:'var(--text3)'}}>Creadores referidos</div>
              </div>
              <div style={{background:'rgba(0,0,0,0.3)',borderRadius:'10px',padding:'1rem'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,color:'#22C55E'}}>
                  ${affiliate?.total_affiliate_earnings || '0.00'}
                </div>
                <div style={{fontSize:'12px',color:'var(--text3)'}}>Ganancias totales</div>
              </div>
            </div>
          </div>

          <div className="card-lg" style={{marginBottom:'1rem'}}>
            <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',marginBottom:'1rem'}}>Tu link para referir creadores</h3>
            <div style={{background:'var(--dark3)',borderRadius:'10px',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
              <span style={{fontSize:'12px',color:'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                {'https://fansverse.site/register?ref=' + (referral?.code||'') + '&role=creator'}
              </span>
              <button className="btn btn-primary btn-sm"
                onClick={() => copyRef('https://fansverse.site/register?ref=' + (referral?.code||'') + '&role=creator')}>
                Copiar
              </button>
            </div>
            <div style={{background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:'10px',padding:'12px',fontSize:'13px'}}>
              <strong style={{color:'#D4A843'}}>💡 Cómo funciona:</strong>
              <ol style={{marginTop:'6px',paddingLeft:'16px',color:'var(--text2)',lineHeight:2}}>
                <li>Comparte el link con otros creadores de contenido</li>
                <li>Cuando se registren y empiecen a ganar, tú recibes el <strong style={{color:'#D4A843'}}>5%</strong></li>
                <li>Si un creador gana $1,000/mes, tú ganas <strong style={{color:'#22C55E'}}>$50/mes</strong> sin hacer nada</li>
                <li>Es de por vida mientras el creador esté activo</li>
              </ol>
            </div>
          </div>

          {(affiliate?.referred_creators || []).length > 0 && (
            <div className="card-lg">
              <h3 style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',marginBottom:'1rem'}}>Creadores que referiste</h3>
              {affiliate.referred_creators.map(cr => (
                <div key={cr.username} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',fontWeight:700,color:'white',overflow:'hidden',flexShrink:0}}>
                    {cr.avatar_url ? <img src={cr.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : cr.username?.[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:'13px'}}>{cr.display_name || cr.username}</div>
                    <div style={{fontSize:'11px',color:'var(--text3)'}}>
                      {cr.total_subscribers || 0} fans · Ganancias: ${parseFloat(cr.total_earnings||0).toFixed(2)}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:700,color:'#22C55E',fontSize:'14px'}}>+${parseFloat(cr.affiliate_earnings||0).toFixed(2)}</div>
                    <div style={{fontSize:'11px',color:'var(--text3)'}}>Tu 5%</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(affiliate?.referred_creators || []).length === 0 && (
            <div className="card" style={{textAlign:'center',padding:'2rem',color:'var(--text3)'}}>
              <div style={{fontSize:'2rem',marginBottom:'8px'}}>🎯</div>
              <div style={{fontSize:'13px'}}>Aún no has referido ningún creador.<br/>
                <span style={{color:'#E8365D'}}>¡Comparte tu link y empieza a ganar!</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
