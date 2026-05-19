import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { messagesApi, uploadApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Modal PPV mejorado — subir media o escoger de posts existentes
function PPVModal({ onClose, onSend }) {
  const [tab, setTab]         = useState('upload'); // 'upload' | 'existing'
  const [price, setPrice]     = useState('15');
  const [message, setMessage] = useState('');
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUpl]   = useState(false);
  const [uploadPct, setUpPct] = useState(0);
  const [posts, setPosts]     = useState([]);
  const [selectedPost, setSel]= useState(null);
  const [loadingPosts, setLP] = useState(false);
  const fileRef               = useRef(null);

  useEffect(() => {
    if (tab === 'existing') {
      setLP(true);
      api.get('/posts/creator/me')
        .then(r => {
          const all = (r.data.posts || []).map(p => ({
            ...p,
            media: typeof p.media === 'string' ? JSON.parse(p.media || '[]') : (p.media || [])
          }));
          setPosts(all);
        })
        .catch(() => {})
        .finally(() => setLP(false));
    }
  }, [tab]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const send = async () => {
    if (!price || parseFloat(price) < 1) return toast.error('Precio mínimo $1');

    if (tab === 'upload') {
      if (!file) return toast.error('Selecciona un archivo');
      setUpl(true);
      try {
        const isVideo = file.type.startsWith('video/');
        const { data } = isVideo
          ? await uploadApi.video(file, setUpPct)
          : await uploadApi.image(file, setUpPct);
        await onSend({
          content: message || '🔒 Contenido exclusivo',
          is_ppv: true,
          ppv_price: parseFloat(price),
          media_url: data.url,
          media_type: isVideo ? 'video' : 'image'
        });
        onClose();
      } catch { toast.error('Error al subir archivo'); }
      finally { setUpl(false); }

    } else {
      if (!selectedPost) return toast.error('Selecciona un post');
      const media = selectedPost.media?.[0];
      await onSend({
        content: message || `🔒 ${selectedPost.title || 'Contenido exclusivo'}`,
        is_ppv: true,
        ppv_price: parseFloat(price),
        media_url: media?.url || null,
        media_type: media?.type || 'image'
      });
      onClose();
    }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--dark2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'480px',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.1rem'}}>💰 Enviar contenido PPV</h3>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'white',width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:'14px'}}>✕</button>
        </div>

        <div style={{padding:'1.25rem 1.5rem',overflowY:'auto',flex:1}}>
          {/* Tabs */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'1.25rem'}}>
            {[['upload','📤 Subir nuevo'],['existing','🎬 De mis posts']].map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{padding:'8px',borderRadius:'8px',border:`1px solid ${tab===t?'#E8365D':'var(--border)'}`,background:tab===t?'var(--rose-light)':'transparent',color:tab===t?'#E8365D':'var(--text2)',cursor:'pointer',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)'}}>
                {l}
              </button>
            ))}
          </div>

          {/* Tab: Subir nuevo */}
          {tab === 'upload' && (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                style={{border:'2px dashed var(--border2)',borderRadius:'10px',padding:'1.5rem',textAlign:'center',cursor:'pointer',marginBottom:'1rem',background:preview?'transparent':'var(--dark3)',overflow:'hidden',position:'relative',minHeight:120}}>
                <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{display:'none'}} />
                {preview ? (
                  file?.type.startsWith('video/')
                    ? <video src={preview} style={{width:'100%',maxHeight:200,borderRadius:'8px',objectFit:'cover'}} />
                    : <img src={preview} alt="" style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:'8px'}} />
                ) : (
                  <>
                    <div style={{fontSize:'2rem',marginBottom:'8px'}}>📤</div>
                    <div style={{fontSize:'13px',color:'var(--text2)'}}>Clic para seleccionar foto o video</div>
                    <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>JPG, PNG, MP4, MOV</div>
                  </>
                )}
                {uploading && (
                  <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRadius:'10px'}}>
                    <div className="spinner" style={{width:24,height:24,marginBottom:'8px'}} />
                    <div style={{fontSize:'13px',color:'white'}}>Subiendo {uploadPct}%</div>
                  </div>
                )}
              </div>
              {file && (
                <button onClick={() => { setFile(null); setPreview(null); }} style={{background:'none',border:'none',color:'var(--text3)',fontSize:'12px',cursor:'pointer',marginBottom:'10px',textDecoration:'underline'}}>
                  ✕ Quitar archivo
                </button>
              )}
            </>
          )}

          {/* Tab: De mis posts */}
          {tab === 'existing' && (
            <div style={{marginBottom:'1rem'}}>
              {loadingPosts ? (
                <div style={{display:'flex',justifyContent:'center',padding:'2rem'}}>
                  <div className="spinner" style={{width:24,height:24}} />
                </div>
              ) : posts.length === 0 ? (
                <div style={{textAlign:'center',padding:'2rem',color:'var(--text3)',fontSize:'13px'}}>
                  No tienes posts aún. Sube contenido primero.
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',maxHeight:240,overflowY:'auto'}}>
                  {posts.map(p => {
                    const thumb = p.media?.[0];
                    const isSel = selectedPost?.id === p.id;
                    return (
                      <div key={p.id} onClick={() => setSel(p)}
                        style={{position:'relative',aspectRatio:'1',borderRadius:'8px',overflow:'hidden',cursor:'pointer',border:`2px solid ${isSel?'#E8365D':'transparent'}`,background:'var(--dark3)'}}>
                        {thumb ? (
                          <img src={thumb.thumbnail_url||thumb.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        ) : (
                          <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem'}}>📝</div>
                        )}
                        {isSel && (
                          <div style={{position:'absolute',inset:0,background:'rgba(232,54,93,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem'}}>✓</div>
                        )}
                        {p.type==='ppv' && (
                          <div style={{position:'absolute',bottom:4,left:4,background:'rgba(0,0,0,0.7)',color:'#D4A843',fontSize:'9px',fontWeight:700,padding:'2px 5px',borderRadius:'4px'}}>PPV</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedPost && (
                <div style={{marginTop:'8px',fontSize:'12px',color:'var(--rose)'}}>
                  ✓ Seleccionado: {selectedPost.title || selectedPost.body?.substring(0,30) || 'Post'}
                </div>
              )}
            </div>
          )}

          {/* Precio y mensaje */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
            <div className="form-group" style={{margin:0}}>
              <label className="form-label">Precio (USD)</label>
              <input className="input" type="number" min="1" step="0.01"
                value={price} onChange={e=>setPrice(e.target.value)} placeholder="15.00" />
            </div>
            <div className="form-group" style={{margin:0}}>
              <label className="form-label">Mensaje (opcional)</label>
              <input className="input" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Descripción..." />
            </div>
          </div>

          <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'1rem',padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'8px'}}>
            💡 El fan pagará <strong style={{color:'#D4A843'}}>${parseFloat(price||0).toFixed(2)}</strong> para ver este contenido. Tú recibirás el <strong style={{color:'#22C55E'}}>85%</strong>.
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'1rem 1.5rem',borderTop:'1px solid var(--border)',display:'flex',gap:'8px',flexShrink:0}}>
          <button className="btn btn-outline" style={{flex:1}} onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" style={{flex:2}} onClick={send} disabled={uploading}>
            {uploading ? <><span className="spinner" style={{width:14,height:14}} /> Subiendo...</> : `Enviar PPV $${parseFloat(price||0).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const { userId: paramUserId } = useParams();
  const { user }  = useAuth();
  const { emit }  = useSocket();
  const navigate  = useNavigate();
  const bottomRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState('');
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [showPPV, setShowPPV]             = useState(false);

  useEffect(() => {
    messagesApi.conversations()
      .then(async r => {
        const convs = r.data.conversations || [];
        setConversations(convs);
        if (paramUserId) {
          const found = convs.find(c => c.other_user === paramUserId);
          if (found) {
            setActiveConv(found);
          } else {
            try {
              const r2 = await api.get(`/users/${paramUserId}`);
              const u = r2.data.user;
              setActiveConv({
                other_user: u.id,
                username: u.username,
                display_name: u.display_name,
                avatar_url: u.avatar_url,
                content: '',
                unread_count: 0,
                is_new: true
              });
            } catch { toast.error('Usuario no encontrado'); }
          }
        }
      })
      .finally(() => setLoading(false));
  }, [paramUserId]);

  useEffect(() => {
    if (!activeConv?.other_user) return;
    if (activeConv.is_new) { setMessages([]); return; }
    messagesApi.get(activeConv.other_user)
      .then(r => setMessages(r.data.messages || []))
      .catch(() => setMessages([]));
    emit?.('join_conversation', { with_user_id: activeConv.other_user });
    return () => emit?.('leave_conversation', { with_user_id: activeConv.other_user });
  }, [activeConv?.other_user]);

  useEffect(() => {
    const handler = (e) => {
      const msg = e.detail;
      if (activeConv && msg.sender_id === activeConv.other_user) {
        setMessages(prev => [...prev, msg]);
      }
      setConversations(prev => prev.map(c =>
        c.other_user === msg.sender_id ? { ...c, content: msg.content } : c
      ));
    };
    window.addEventListener('fv:new_message', handler);
    return () => window.removeEventListener('fv:new_message', handler);
  }, [activeConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (payload) => {
    if (!activeConv) return;
    setSending(true);
    try {
      const { data } = await messagesApi.send(activeConv.other_user, payload);
      setMessages(prev => [...prev, data.message]);
      setText('');
      setConversations(prev => {
        const exists = prev.find(c => c.other_user === activeConv.other_user);
        if (!exists) return [{ ...activeConv, content: payload.content, is_new: false }, ...prev];
        return prev.map(c => c.other_user === activeConv.other_user ? { ...c, content: payload.content } : c);
      });
      if (activeConv.is_new) setActiveConv(c => ({ ...c, is_new: false }));
    } catch { toast.error('Error al enviar mensaje'); }
    finally { setSending(false); }
  };

  const sendText = () => {
    if (!text.trim()) return;
    sendMessage({ content: text });
  };

  const selectConv = (conv) => {
    setActiveConv(conv);
    navigate(`/messages/${conv.other_user}`, { replace: true });
  };

  if (loading) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'80vh'}}>
      <div className="spinner" style={{width:32,height:32}} />
    </div>
  );

  return (
    <div style={{display:'grid',gridTemplateColumns:'280px 1fr',height:'calc(100vh - 56px)',overflow:'hidden',background:'var(--dark2)'}}>

      {/* Sidebar */}
      <div style={{borderRight:'1px solid var(--border)',overflowY:'auto',background:'var(--card)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'1rem',borderBottom:'1px solid var(--border)',fontWeight:600,fontSize:'14px'}}>
          Mensajes
        </div>

        {activeConv?.is_new && (
          <div style={{display:'flex',gap:'10px',padding:'12px 1rem',background:'var(--dark3)',borderBottom:'1px solid var(--border)'}}>
            <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:600,color:'white',flexShrink:0,overflow:'hidden'}}>
              {activeConv.avatar_url ? <img src={activeConv.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : activeConv.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:'13px',fontWeight:600}}>{activeConv.display_name||activeConv.username}</div>
              <div style={{fontSize:'11px',color:'var(--rose)'}}>Nueva conversación</div>
            </div>
          </div>
        )}

        {conversations.length === 0 && !activeConv ? (
          <div style={{padding:'2rem',textAlign:'center',color:'var(--text3)',fontSize:'13px',lineHeight:1.7}}>
            No tienes conversaciones aún.<br/>
            <span style={{color:'var(--rose)'}}>Ve al perfil de un creador y haz clic en "Mensaje"</span>
          </div>
        ) : (
          conversations.map(c => (
            <div key={c.other_user}
              onClick={() => selectConv(c)}
              style={{display:'flex',gap:'10px',padding:'12px 1rem',cursor:'pointer',borderBottom:'1px solid var(--border)',background:activeConv?.other_user===c.other_user?'var(--dark3)':'transparent',transition:'background 0.15s'}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:600,color:'white',flexShrink:0,overflow:'hidden'}}>
                {c.avatar_url ? <img src={c.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : c.username?.[0]?.toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'2px'}}>
                  <span style={{fontSize:'13px',fontWeight:500}}>{c.display_name||c.username}</span>
                  <span style={{fontSize:'10px',color:'var(--text3)'}}>
                    {c.created_at ? format(new Date(c.created_at),'HH:mm') : ''}
                  </span>
                </div>
                <div style={{fontSize:'12px',color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {c.content||'...'}
                </div>
              </div>
              {parseInt(c.unread_count) > 0 && (
                <span style={{background:'#E8365D',color:'white',fontSize:'10px',fontWeight:700,padding:'2px 6px',borderRadius:'10px',alignSelf:'center',minWidth:18,textAlign:'center'}}>
                  {c.unread_count}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Chat */}
      {activeConv ? (
        <div style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>

          <div style={{padding:'1rem 1.25rem',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'10px',background:'var(--card)',flexShrink:0}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:600,color:'white',flexShrink:0,overflow:'hidden'}}>
              {activeConv.avatar_url ? <img src={activeConv.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : activeConv.username?.[0]?.toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:'14px'}}>{activeConv.display_name||activeConv.username}</div>
              <div style={{fontSize:'11px',color:'var(--success)'}}>● En línea</div>
            </div>
            {user?.role === 'creator' && (
              <button className="btn btn-outline btn-sm" onClick={() => setShowPPV(true)}>
                💰 Enviar PPV
              </button>
            )}
            <button
              className="btn btn-sm"
              style={{background:'rgba(239,68,68,0.1)',color:'var(--danger)',border:'1px solid rgba(239,68,68,0.2)'}}
              onClick={async () => {
                if (!window.confirm(`¿Bloquear a ${activeConv?.display_name||activeConv?.username}? Ya no podrá enviarte mensajes.`)) return;
                try {
                  await import('../services/api').then(({default:api}) => api.post(`/users/${activeConv.other_user}/block`));
                  toast.success('Usuario bloqueado');
                  setActiveConv(null);
                  setConversations(prev => prev.filter(c => c.other_user !== activeConv.other_user));
                } catch { toast.error('Error al bloquear'); }
              }}>
              🚫 Bloquear
            </button>
          </div>

          <div style={{flex:1,overflowY:'auto',padding:'1rem 1.25rem',display:'flex',flexDirection:'column',gap:'10px'}}>
            {activeConv.is_new && messages.length === 0 && (
              <div style={{textAlign:'center',padding:'3rem 1rem',color:'var(--text3)',fontSize:'13px'}}>
                <div style={{fontSize:'2.5rem',marginBottom:'8px'}}>👋</div>
                <div style={{fontWeight:500,color:'var(--text2)',marginBottom:'4px'}}>Inicia la conversación con {activeConv.display_name||activeConv.username}</div>
                <div style={{fontSize:'12px'}}>Mándale un mensaje directo</div>
              </div>
            )}

            {messages.map(m => {
              const isMe = m.sender_id === user?.id;
              if (m.is_ppv && !m.ppv_purchased && !isMe) {
                return (
                  <div key={m.id} style={{alignSelf:'flex-start',maxWidth:'75%',background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.3)',borderRadius:'12px',padding:'12px'}}>
                    {m.media_url && !m.ppv_purchased && (
                      <div style={{marginBottom:'8px',borderRadius:'8px',overflow:'hidden',filter:'blur(8px)',maxHeight:120,background:'#111'}}>
                        {m.media_type==='video'
                          ? <video src={m.media_url} style={{width:'100%',objectFit:'cover',maxHeight:120}} />
                          : <img src={m.media_url} alt="" style={{width:'100%',objectFit:'cover',maxHeight:120}} />
                        }
                      </div>
                    )}
                    <div style={{fontSize:'12px',fontWeight:700,marginBottom:'4px',color:'#D4A843'}}>🔒 {m.content} — ${m.ppv_price}</div>
                    <div style={{fontSize:'11px',color:'var(--text2)',marginBottom:'10px'}}>Paga para ver este contenido exclusivo</div>
                    <button className="btn btn-gold btn-sm" onClick={async () => {
                      try {
                        await api.post(`/messages/${m.id}/purchase-ppv`);
                        toast.success('¡Contenido desbloqueado! 🎉');
                        messagesApi.get(activeConv.other_user).then(r => setMessages(r.data.messages||[]));
                      } catch(e) { toast.error(e.response?.data?.error||'Error al desbloquear'); }
                    }}>
                      Desbloquear ${m.ppv_price}
                    </button>
                  </div>
                );
              }

              // Mensaje PPV ya comprado
              if (m.is_ppv && m.ppv_purchased && !isMe) {
                return (
                  <div key={m.id} style={{alignSelf:'flex-start',maxWidth:'75%'}}>
                    {m.media_url && (
                      <div style={{marginBottom:'6px',borderRadius:'10px',overflow:'hidden'}}>
                        {m.media_type==='video'
                          ? <video src={m.media_url} controls style={{width:'100%',borderRadius:'10px'}} />
                          : <img src={m.media_url} alt="" style={{width:'100%',borderRadius:'10px'}} />
                        }
                      </div>
                    )}
                    <div style={{background:'var(--dark3)',padding:'8px 12px',borderRadius:'10px',fontSize:'13px',color:'white'}}>
                      <span style={{fontSize:'10px',color:'var(--success)',display:'block',marginBottom:'2px'}}>✓ Desbloqueado</span>
                      {m.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start'}}>
                  <div style={{maxWidth:'65%',padding:'10px 14px',borderRadius:14,borderBottomRightRadius:isMe?4:14,borderBottomLeftRadius:isMe?14:4,background:isMe?'#E8365D':'var(--dark3)',color:'white',fontSize:'13px',lineHeight:1.5}}>
                    {m.media_url && (
                      m.media_type==='video'
                        ? <video src={m.media_url} controls style={{width:'100%',borderRadius:'8px',marginBottom:'6px'}} />
                        : <img src={m.media_url} alt="" style={{width:'100%',borderRadius:'8px',marginBottom:'6px'}} />
                    )}
                    {m.content}
                    <div style={{fontSize:'10px',opacity:0.7,marginTop:'4px',textAlign:'right'}}>
                      {format(new Date(m.created_at),'HH:mm')}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{padding:'1rem 1.25rem',borderTop:'1px solid var(--border)',display:'flex',gap:'8px',alignItems:'center',background:'var(--card)',flexShrink:0}}>
            <input
              style={{flex:1,background:'var(--dark3)',border:'1px solid var(--border)',borderRadius:'20px',padding:'10px 16px',fontSize:'13px',color:'white',outline:'none',fontFamily:'var(--font-body)',transition:'border-color 0.15s'}}
              placeholder={`Mensaje para ${activeConv.display_name||activeConv.username}...`}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendText()}
              onFocus={e => e.target.style.borderColor='#E8365D'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
            />
            <button onClick={sendText} disabled={sending||!text.trim()}
              style={{background:text.trim()?'#E8365D':'var(--dark3)',border:'none',color:'white',width:40,height:40,borderRadius:'50%',cursor:text.trim()?'pointer':'not-allowed',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s',flexShrink:0}}>
              {sending
                ? <span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}} />
                : '➤'
              }
            </button>
          </div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontSize:'14px',gap:'1rem'}}>
          <div style={{fontSize:'3rem'}}>💬</div>
          <div style={{fontWeight:500,color:'var(--text2)'}}>Selecciona una conversación</div>
          <div style={{fontSize:'12px',textAlign:'center',lineHeight:1.6}}>O ve al perfil de un creador y haz clic en "Mensaje"</div>
        </div>
      )}

      {showPPV && (
        <PPVModal
          onClose={() => setShowPPV(false)}
          onSend={async (payload) => { await sendMessage(payload); }}
        />
      )}
    </div>
  );
}
