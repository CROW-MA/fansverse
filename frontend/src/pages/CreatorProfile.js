import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { creatorsApi, postsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StoriesBubbles } from '../components/Stories';
import api from '../services/api';
import toast from 'react-hot-toast';

function TipModal({ creator, onClose }) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const amounts = [1, 3, 5, 10, 20, 50];

  const send = async () => {
    if (!amount || parseFloat(amount) < 1) return toast.error('Mínimo $1');
    setSending(true);
    try {
      await import('../services/api').then(({default:api}) =>
        api.post('/tips', { creator_id: creator.id, amount: parseFloat(amount), message })
      );
      toast.success('💝 Propina enviada!');
      onClose();
    } catch(e) { toast.error(e.response?.data?.error || 'Error'); }
    finally { setSending(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#17171B',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'18px',padding:'2rem',width:'100%',maxWidth:380}}>
        <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.2rem',marginBottom:'1rem'}}>💝 Enviar propina a {creator?.display_name}</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px',marginBottom:'1rem'}}>
          {amounts.map(a => (
            <button key={a} onClick={() => setAmount(String(a))}
              style={{padding:'8px',borderRadius:'8px',border:`1px solid ${amount==a?'#E8365D':'var(--border)'}`,background:amount==a?'var(--rose-light)':'transparent',color:amount==a?'#E8365D':'var(--text2)',cursor:'pointer',fontSize:'13px',fontFamily:'var(--font-body)',fontWeight:500}}>
              ${a}
            </button>
          ))}
        </div>
        <div className="form-group">
          <label className="form-label">Monto personalizado (USD)</label>
          <input className="input" type="number" min="1" placeholder="Otro monto..." value={amount} onChange={e=>setAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Mensaje (opcional)</label>
          <input className="input" placeholder="¡Me encanta tu contenido!" value={message} onChange={e=>setMessage(e.target.value)} />
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn btn-outline" style={{flex:1}} onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" style={{flex:2}} onClick={send} disabled={sending}>
            {sending?<><span className="spinner" style={{width:14,height:14}}/> Enviando...</>:`Enviar ${amount?`${amount}`:''} 💝`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({ type, itemId, onClose }) {
  const [reason, setReason] = useState('');
  const [desc, setDesc]     = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!reason) return toast.error('Selecciona un motivo');
    setSending(true);
    try {
      const payload = type === 'user'
        ? { reported_user_id: itemId, reason, description: desc }
        : { reported_post_id: itemId, reason, description: desc };
      await import('../services/api').then(({default:api}) => api.post('/reports', payload));
      toast.success('Reporte enviado. Lo revisaremos pronto.');
      onClose();
    } catch { toast.error('Error al reportar'); }
    finally { setSending(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#17171B',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'18px',padding:'2rem',width:'100%',maxWidth:380}}>
        <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.2rem',marginBottom:'1rem'}}>🚨 Reportar {type==='user'?'usuario':'contenido'}</h3>
        <div className="form-group">
          <label className="form-label">Motivo</label>
          <select className="input" value={reason} onChange={e=>setReason(e.target.value)} style={{cursor:'pointer'}}>
            <option value="">Selecciona un motivo...</option>
            <option value="spam">Spam</option>
            <option value="contenido_ilegal">Contenido ilegal</option>
            <option value="acoso">Acoso o amenazas</option>
            <option value="menor_edad">Menor de edad</option>
            <option value="fraude">Fraude o estafa</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Descripción adicional (opcional)</label>
          <textarea className="textarea" style={{minHeight:80}} placeholder="Describe el problema..." value={desc} onChange={e=>setDesc(e.target.value)} />
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn btn-outline" style={{flex:1}} onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm" style={{flex:2,background:'rgba(239,68,68,0.1)',color:'var(--danger)',border:'1px solid rgba(239,68,68,0.2)',padding:'10px'}} onClick={send} disabled={sending}>
            {sending?<><span className="spinner" style={{width:14,height:14}}/> Enviando...</>:'🚨 Enviar reporte'}
          </button>
        </div>
      </div>
    </div>
  );
}

const parseMedia = (media) => {
  if (!media) return [];
  if (Array.isArray(media)) return media.filter(m => m && m.url);
  if (typeof media === 'string') {
    try {
      const p = JSON.parse(media);
      if (Array.isArray(p)) return p.filter(m => m && m.url);
      if (p && p.url) return [p];
    } catch {}
  }
  return [];
};

function PayModal({ type, item, creator, onClose, onSuccess }) {
  const [step, setStep]     = useState('form');
  const [card, setCard]     = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv]       = useState('');
  const price = type === 'ppv' ? item?.ppv_price : item?.price;

  const pay = async () => {
    if (!card || !expiry || !cvv) return toast.error('Completa todos los datos');
    setStep('paying');
    try {
      if (type === 'ppv') {
        await api.post(`/payments/purchase-ppv/${item.id}`, { simulated: true });
      } else {
        await api.post('/payments/subscribe', { tier_id: item.id, simulated: true });
      }
      setStep('done');
      setTimeout(() => { onSuccess(); onClose(); }, 1800);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al procesar pago');
      setStep('form');
    }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#17171B',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'20px',width:'100%',maxWidth:'420px',overflow:'hidden'}}>
        {step === 'done' ? (
          <div style={{padding:'3rem',textAlign:'center'}}>
            <div style={{fontSize:'4rem',marginBottom:'1rem'}}>🎉</div>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.5rem',marginBottom:'0.5rem'}}>¡Listo!</h3>
            <p style={{color:'var(--text2)',fontSize:'14px'}}>{type==='ppv'?'Contenido desbloqueado':'¡Suscripción activada!'}</p>
          </div>
        ) : (
          <>
            <div style={{background:'linear-gradient(135deg,rgba(232,54,93,0.2),rgba(212,168,67,0.1))',padding:'1.5rem',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:700,color:'white',flexShrink:0,overflow:'hidden'}}>
                  {creator?.avatar_url?<img src={creator.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:creator?.display_name?.[0]?.toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:'14px'}}>{creator?.display_name}</div>
                  <div style={{fontSize:'12px',color:'var(--text3)'}}>@{creator?.username}</div>
                </div>
                <button onClick={onClose} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'var(--text2)',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
              </div>
              <div style={{background:'rgba(0,0,0,0.3)',borderRadius:'10px',padding:'12px 16px'}}>
                <div style={{fontSize:'12px',color:'var(--text3)',marginBottom:'4px'}}>{type==='ppv'?'Contenido exclusivo PPV':'Plan '+item?.name}</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:'2rem',fontWeight:700,color:'#E8365D'}}>
                  ${parseFloat(price||0).toFixed(2)} <span style={{fontSize:'13px',color:'var(--text2)',fontFamily:'var(--font-body)',fontWeight:400}}>USD</span>
                </div>
              </div>
            </div>
            <div style={{padding:'1.5rem'}}>
              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'12px',color:'var(--text3)',marginBottom:'6px',fontWeight:500}}>Número de tarjeta</label>
                <input style={{width:'100%',background:'#222228',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',padding:'11px 14px',fontSize:'15px',color:'white',outline:'none',fontFamily:'monospace',letterSpacing:'2px'}}
                  placeholder="4242 4242 4242 4242" maxLength={19}
                  value={card} onChange={e=>setCard(e.target.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim())} />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
                <div>
                  <label style={{display:'block',fontSize:'12px',color:'var(--text3)',marginBottom:'6px',fontWeight:500}}>Vencimiento</label>
                  <input style={{width:'100%',background:'#222228',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',padding:'11px 14px',fontSize:'14px',color:'white',outline:'none'}}
                    placeholder="MM/AA" maxLength={5} value={expiry}
                    onChange={e=>{let v=e.target.value.replace(/\D/g,'');if(v.length>=2)v=v.slice(0,2)+'/'+v.slice(2,4);setExpiry(v);}} />
                </div>
                <div>
                  <label style={{display:'block',fontSize:'12px',color:'var(--text3)',marginBottom:'6px',fontWeight:500}}>CVV</label>
                  <input style={{width:'100%',background:'#222228',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',padding:'11px 14px',fontSize:'14px',color:'white',outline:'none'}}
                    placeholder="•••" maxLength={4} type="password" value={cvv} onChange={e=>setCvv(e.target.value.replace(/\D/g,''))} />
                </div>
              </div>
              <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'1.25rem',padding:'10px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'8px'}}>
                🧪 Prueba: <strong style={{color:'white',fontFamily:'monospace'}}>4242 4242 4242 4242</strong> · 12/26 · 123
              </div>
              <button onClick={pay} disabled={step==='paying'}
                style={{width:'100%',padding:'13px',borderRadius:'10px',border:'none',background:step==='paying'?'#9a2040':'#E8365D',color:'white',cursor:step==='paying'?'not-allowed':'pointer',fontSize:'15px',fontWeight:700,fontFamily:'var(--font-body)',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                {step==='paying'
                  ?<><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>Procesando...</>
                  :`💳 Pagar $${parseFloat(price||0).toFixed(2)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PostViewer({ post, currentUser, onClose }) {
  const media = post.media || [];
  const [liked, setLiked]       = useState(post.is_liked || false);
  const [likes, setLikes]       = useState(post.like_count || 0);
  const [comments, setComments] = useState([]);
  const [comment, setComment]   = useState('');
  const [posting, setPosting]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/posts/${post.id}/comments`).then(r => setComments(r.data.comments || [])).catch(() => {});
  }, [post.id]);

  const toggleLike = async () => {
    if (!currentUser) return navigate('/login');
    try {
      const { data } = await api.post(`/posts/${post.id}/like`);
      setLiked(data.liked);
      setLikes(l => data.liked ? l+1 : l-1);
    } catch {}
  };

  const sendComment = async () => {
    if (!currentUser || !comment.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/posts/${post.id}/comments`, { content: comment });
      setComments(c => [{ ...data.comment, username: currentUser.username, display_name: currentUser.display_name, avatar_url: currentUser.avatar_url }, ...c]);
      setComment('');
    } catch {} finally { setPosting(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.97)',zIndex:400,display:'flex',alignItems:'stretch',overflow:'hidden'}} onClick={onClose}>
      {/* Media izquierda */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',minWidth:0,background:'#000'}} onClick={onClose}>
        {media.length > 0 && (
          <div onClick={e=>e.stopPropagation()} style={{maxWidth:'100%',maxHeight:'100%'}}>
            {media[0].type === 'video'
              ? <video src={media[0].url} controls autoPlay style={{maxWidth:'100%',maxHeight:'85vh',borderRadius:'12px'}} />
              : <img src={media[0].url} alt="" style={{maxWidth:'100%',maxHeight:'85vh',objectFit:'contain',borderRadius:'12px'}} className="protected-media" />
            }
          </div>
        )}
      </div>
      {/* Panel derecho */}
      <div onClick={e=>e.stopPropagation()} style={{width:340,background:'#17171B',borderLeft:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'1rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700,color:'white',overflow:'hidden',flexShrink:0}}>
            {post.avatar_url?<img src={post.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:post.display_name?.[0]?.toUpperCase()}
          </div>
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:'13px'}}>{post.display_name}</div><div style={{fontSize:'11px',color:'var(--text3)'}}>@{post.username}</div></div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'white',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        {post.body && <div style={{padding:'1rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,0.08)'}}><p style={{fontSize:'13px',color:'var(--text)',lineHeight:1.6}}>{post.body}</p></div>}
        <div style={{padding:'0.75rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',gap:'1.5rem',alignItems:'center'}}>
          <button onClick={toggleLike} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'14px',color:liked?'#E8365D':'var(--text2)',fontFamily:'var(--font-body)',padding:0}}>
            {liked?'❤️':'🤍'} <span style={{fontSize:'13px'}}>{likes}</span>
          </button>
          <span style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'14px',color:'var(--text3)'}}>💬 {comments.length}</span>
          <span style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'14px',color:'var(--text3)'}}>👁 {post.view_count||0}</span>
          <button onClick={()=>{onClose();navigate(`/messages/${post.creator_id}`);}}
            style={{marginLeft:'auto',background:'var(--rose-light)',border:'1px solid rgba(232,54,93,0.3)',color:'var(--rose)',borderRadius:'8px',padding:'6px 12px',cursor:'pointer',fontSize:'12px',fontWeight:600,fontFamily:'var(--font-body)'}}>
            💬 Mensaje
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'0.75rem 1.25rem'}}>
          {comments.length === 0
            ? <div style={{textAlign:'center',color:'var(--text3)',fontSize:'13px',padding:'2rem 0'}}>Sé el primero en comentar 💬</div>
            : comments.map(c => (
              <div key={c.id} style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,color:'white',flexShrink:0,overflow:'hidden'}}>
                  {c.avatar_url?<img src={c.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:c.username?.[0]?.toUpperCase()}
                </div>
                <div style={{flex:1,background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'8px 12px'}}>
                  <div style={{fontSize:'12px',fontWeight:600,marginBottom:'3px',color:'var(--rose)'}}>@{c.username}</div>
                  <div style={{fontSize:'13px',color:'var(--text)',lineHeight:1.5}}>{c.content}</div>
                </div>
              </div>
            ))
          }
        </div>
        <div style={{padding:'0.75rem 1.25rem',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',gap:'8px',alignItems:'center'}}>
          <input
            style={{flex:1,background:'#222228',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'8px 14px',fontSize:'13px',color:'white',outline:'none',fontFamily:'var(--font-body)'}}
            placeholder={currentUser?'Escribe un comentario...':'Inicia sesión para comentar'}
            value={comment} onChange={e=>setComment(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendComment()}
            disabled={!currentUser} />
          <button onClick={sendComment} disabled={!comment.trim()||posting}
            style={{background:comment.trim()?'#E8365D':'rgba(255,255,255,0.08)',border:'none',color:'white',width:34,height:34,borderRadius:'50%',cursor:comment.trim()?'pointer':'not-allowed',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {posting?<span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>:'➤'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreatorProfile() {
  const { username } = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();

  const [creator, setCreator]           = useState(null);
  const [tiers, setTiers]               = useState([]);
  const [posts, setPosts]               = useState([]);
  const [creatorStories, setStories]    = useState([]);
  const [loading, setLoading]           = useState(true);
  const [payModal, setPayModal]         = useState(null);
  const [showTip, setShowTip]           = useState(false);
  const [showReport, setShowReport]     = useState(false);
  const [viewPost, setViewPost]         = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([creatorsApi.profile(username), postsApi.byCreator(username)])
      .then(([c, p]) => {
        setCreator(c.data.creator);
        setTiers(c.data.tiers || []);
        const allPosts = (p.data.posts || []).map(post => ({
          ...post, media: parseMedia(post.media)
        }));
        // Separar historias de posts normales
        setStories(allPosts.filter(x => x.type === 'story'));
        setPosts(allPosts.filter(x => x.type !== 'story'));
      })
      .catch(() => toast.error('Error al cargar el perfil'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [username]);

  const handlePostClick = (post) => {
    if (post.has_access) {
      api.get(`/posts/${post.id}`).catch(() => {});
      setPosts(ps => ps.map(p => p.id===post.id ? {...p, view_count:(p.view_count||0)+1} : p));
      setViewPost(post);
    } else if (post.type === 'ppv') {
      if (!user) return navigate('/login');
      setPayModal({ type:'ppv', item:post });
    } else {
      if (!user) return navigate('/login');
      if (tiers.length > 0) setPayModal({ type:'sub', item:tiers[0] });
      else toast('Este creador no tiene planes disponibles');
    }
  };

  const handlePaySuccess = () => { setPayModal(null); load(); };

  const isOwner = user?.id === creator?.id;
  const hasStory = creatorStories.length > 0;

  if (loading) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}>
      <div style={{width:36,height:36,border:'3px solid rgba(255,255,255,0.1)',borderTopColor:'#E8365D',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
    </div>
  );

  if (!creator) return (
    <div className="page-content" style={{textAlign:'center',padding:'4rem',color:'var(--text2)'}}>
      <div style={{fontSize:'2rem',marginBottom:'1rem'}}>😕</div>Creador no encontrado
    </div>
  );

  return (
    <div className="page-content fade-in">
      <style>{`@keyframes storyRing{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>

      {/* Perfil banner */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden',marginBottom:'1.5rem'}}>
        <div style={{height:200,background:'linear-gradient(135deg,#1a0010,#0a0020,#001a10)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'4rem'}}>
          {creator.banner_url
            ? <img src={creator.banner_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center'}} />
            : '🌙'}
        </div>
        <div style={{padding:'0 1.5rem 1.5rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'1rem'}}>
            <div>
              {/* Avatar con anillo si tiene historia */}
              <div
                onClick={() => hasStory && setViewPost(null)}
                style={{
                  width:90, height:90, borderRadius:'50%',
                  padding: hasStory ? 3 : 0,
                  background: hasStory
                    ? 'linear-gradient(135deg,#E8365D,#D4A843,#ff6b9d,#E8365D)'
                    : 'transparent',
                  backgroundSize:'300% 300%',
                  animation: hasStory ? 'storyRing 2s ease infinite' : 'none',
                  marginTop:-45, marginBottom:12,
                  cursor: hasStory ? 'pointer' : 'default',
                  flexShrink:0
                }}>
                <div style={{width:'100%',height:'100%',borderRadius:'50%',background:hasStory?'var(--card)':'transparent',padding:hasStory?2:0}}>
                  <div style={{width:'100%',height:'100%',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem',fontWeight:700,color:'white',border:hasStory?'none':'3px solid var(--card)'}}>
                    {creator.avatar_url
                      ? <img src={creator.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                      : creator.username?.[0]?.toUpperCase()}
                  </div>
                </div>
              </div>
              <div style={{fontFamily:'var(--font-display)',fontSize:'1.5rem',fontWeight:700}}>
                {creator.display_name}
                {creator.is_verified && <span style={{color:'#E8365D',marginLeft:6,fontSize:'1rem'}}>✓</span>}
              </div>
              <div style={{color:'var(--text2)',fontSize:'13px',marginBottom:'8px'}}>@{creator.username}</div>
              {creator.bio && (
                <p style={{fontSize:'14px',color:'var(--text2)',maxWidth:500,lineHeight:1.6,marginBottom:'8px'}}>{creator.bio}</p>
              )}
              <div style={{display:'flex',gap:'16px',flexWrap:'wrap',fontSize:'13px',color:'var(--text3)',marginBottom:'4px'}}>
                {creator.location && (
                  <span style={{display:'flex',alignItems:'center',gap:'4px'}}>
                    📍 {creator.location}
                  </span>
                )}
                {creator.website && (
                  <a href={creator.website.startsWith('http') ? creator.website : 'https://'+creator.website}
                    target="_blank" rel="noopener noreferrer"
                    style={{display:'flex',alignItems:'center',gap:'4px',color:'#E8365D',textDecoration:'none'}}>
                    🔗 {creator.website.replace('https://','').replace('http://','')}
                  </a>
                )}
                {creator.category && creator.category !== 'general' && (
                  <span style={{background:'rgba(232,54,93,0.1)',color:'#E8365D',padding:'2px 8px',borderRadius:'6px',fontSize:'12px',fontWeight:500}}>
                    {{general:'🔥',mujer:'👩',hombre:'👨',pareja:'💑',trans:'🏳️‍⚧️',gay:'🏳️‍🌈',lesbi:'💜',no_binario:'⚧️'}[creator.category]} {creator.category}
                  </span>
                )}
              </div>
            </div>
            <div style={{display:'flex',gap:'2.5rem',paddingTop:'1rem'}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'1.3rem',fontWeight:700}}>{creator.total_subscribers||0}</div>
                <div style={{fontSize:'11px',color:'var(--text3)'}}>Fans</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'1.3rem',fontWeight:700}}>{posts.length}</div>
                <div style={{fontSize:'11px',color:'var(--text3)'}}>Posts</div>
              </div>
              {hasStory && (
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'1.3rem',fontWeight:700}}>{creatorStories.length}</div>
                  <div style={{fontSize:'11px',color:'var(--text3)'}}>Historias</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* HISTORIAS — sección visible */}
      {hasStory && (
        <div className="card" style={{marginBottom:'1.25rem',padding:'1rem 1.25rem'}}>
          <div style={{fontSize:'12px',fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'12px',display:'flex',alignItems:'center',gap:'6px'}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'#E8365D',display:'inline-block',animation:'pulse 1.5s infinite'}} />
            Historias activas
          </div>
          <StoriesBubbles stories={creatorStories} currentUser={user} onUpload={load} />
        </div>
      )}

      {/* Badge suscrito */}
      {creator.is_subscribed && !isOwner && (
        <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'10px',padding:'10px 16px',marginBottom:'1.25rem',fontSize:'13px',color:'#22C55E',display:'flex',alignItems:'center',gap:'8px'}}>
          ✓ Estás suscrito — acceso completo al contenido
        </div>
      )}
      {isOwner && (
        <div style={{background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.3)',borderRadius:'10px',padding:'10px 16px',marginBottom:'1.25rem',fontSize:'13px',color:'#D4A843',display:'flex',alignItems:'center',gap:'8px'}}>
          ✨ Este es tu perfil
        </div>
      )}

      {/* Planes */}
      {!creator.is_subscribed && !isOwner && tiers.length > 0 && (
        <div style={{marginBottom:'1.5rem'}}>
          <h3 style={{fontSize:'15px',fontWeight:600,marginBottom:'1rem'}}>📋 Planes de suscripción</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'1rem'}}>
            {tiers.map((t,i) => (
              <div key={t.id} style={{background:'var(--card)',border:`1px solid ${i===1?'#D4A843':'var(--border)'}`,borderRadius:'var(--radius-lg)',padding:'1.25rem',position:'relative'}}>
                {i===1 && <div style={{position:'absolute',top:0,right:0,background:'#D4A843',color:'#1a0a00',fontSize:'10px',fontWeight:700,padding:'3px 10px',borderRadius:'0 var(--radius) 0 8px'}}>⭐ Popular</div>}
                <div style={{fontSize:'11px',color:'var(--text3)',fontWeight:600,marginBottom:'6px',textTransform:'uppercase'}}>{t.name}</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,color:i===1?'#D4A843':'var(--text)',marginBottom:'10px'}}>
                  ${parseFloat(t.price).toFixed(2)}<span style={{fontSize:'13px',color:'var(--text2)',fontFamily:'var(--font-body)',fontWeight:400}}>/mes</span>
                </div>
                {(t.features||[]).map((f,j)=>(
                  <div key={j} style={{fontSize:'12px',color:'var(--text2)',padding:'3px 0',display:'flex',gap:'6px'}}><span style={{color:'#22C55E'}}>✓</span>{f}</div>
                ))}
                <button
                  onClick={()=>{if(!user)return navigate('/login');setPayModal({type:'sub',item:t});}}
                  style={{width:'100%',marginTop:'1rem',padding:'10px',borderRadius:'8px',border:'none',background:i===1?'#D4A843':'#E8365D',color:i===1?'#1a0a00':'white',cursor:'pointer',fontSize:'13px',fontWeight:600,fontFamily:'var(--font-body)'}}>
                  Suscribirse ${parseFloat(t.price).toFixed(2)}/mes
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      <h3 style={{fontSize:'15px',fontWeight:600,marginBottom:'1rem'}}>Contenido</h3>
      {posts.length === 0
        ? <div style={{textAlign:'center',padding:'3rem',color:'var(--text2)',fontSize:'14px',background:'var(--card)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border)'}}>Sin publicaciones aún</div>
        : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'1rem'}}>
            {posts.map(p => {
              const thumb  = p.media?.[0];
              const locked = !p.has_access;
              return (
                <div key={p.id}
                  onClick={() => handlePostClick(p)}
                  style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden',cursor:'pointer',transition:'all 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.2)';e.currentTarget.style.transform='translateY(-2px)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)';}}>
                  {/* Thumbnail */}
                  <div style={{height:170,background:'#111',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
                    {thumb && (
                      <img
                        src={thumb.thumbnail_url || (thumb.type !== 'video' ? thumb.url : null)}
                        alt=""
                        style={{
                          width:'100%', height:'100%', objectFit:'cover',
                          filter: locked ? 'blur(10px) brightness(0.4)' : 'none',
                          transform: locked ? 'scale(1.08)' : 'scale(1)',
                          display: (thumb.thumbnail_url || thumb.type !== 'video') ? 'block' : 'none'
                        }}
                      />
                    )}
                    {thumb && thumb.type === 'video' && !thumb.thumbnail_url && (
                      <div style={{position:'absolute',inset:0,background:'#1a1a2e',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'6px'}}>
                        <span style={{fontSize:'2.5rem'}}>🎬</span>
                        <span style={{fontSize:'12px',color:'var(--text3)'}}>Video</span>
                      </div>
                    )}
                    {locked && (
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:2}}>
                        <div style={{fontSize:'2rem',marginBottom:'6px'}}>🔒</div>
                        <div style={{fontSize:'13px',fontWeight:600,color:p.type==='ppv'?'#D4A843':'white'}}>
                          {p.type==='ppv'?`$${parseFloat(p.ppv_price||0).toFixed(2)} USD`:'Solo suscriptores'}
                        </div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginTop:'4px'}}>
                          {p.type==='ppv'?'👆 Clic para desbloquear':'👆 Suscríbete para ver'}
                        </div>
                      </div>
                    )}
                    {!locked && thumb?.type === 'video' && (
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>
                        <div style={{width:50,height:50,borderRadius:'50%',background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>▶️</div>
                      </div>
                    )}
                    {p.type==='ppv' && (
                      <div style={{position:'absolute',top:8,left:8,background:locked?'#D4A843':'rgba(34,197,94,0.9)',color:locked?'#1a0a00':'white',fontSize:'11px',fontWeight:700,padding:'3px 8px',borderRadius:'6px',zIndex:3}}>
                        {locked?`PPV $${parseFloat(p.ppv_price||0).toFixed(2)}`:'✓ Desbloqueado'}
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{padding:'12px'}}>
                    <div style={{fontSize:'13px',fontWeight:500,marginBottom:'6px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {p.title||p.body?.substring(0,50)||'Post'}
                    </div>
                    <div style={{fontSize:'11px',color:'var(--text3)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span>👁 {p.view_count||0} · ❤️ {p.like_count||0} · 💬 {p.comment_count||0}</span>
                      {locked && <span style={{color:'#E8365D',fontWeight:600,fontSize:'12px'}}>{p.type==='ppv'?'Comprar →':'Suscribirse →'}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {viewPost && <PostViewer post={viewPost} currentUser={user} onClose={() => setViewPost(null)} />}
      {showTip && <TipModal creator={creator} onClose={() => setShowTip(false)} />}
      {showReport && <ReportModal type="user" itemId={creator?.id} onClose={() => setShowReport(false)} />}
      {payModal && <PayModal type={payModal.type} item={payModal.item} creator={creator} onClose={() => setPayModal(null)} onSuccess={handlePaySuccess} />}
    </div>
  );
}
