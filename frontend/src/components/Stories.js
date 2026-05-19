import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const parseMedia = (media) => {
  if (!media) return [];
  if (Array.isArray(media)) return media.filter(m => m && m.url);
  if (typeof media === 'string') {
    try {
      const p = JSON.parse(media);
      return Array.isArray(p) ? p.filter(m => m && m.url) : [];
    } catch { return []; }
  }
  return [];
};

function StoryViewer({ stories, startIndex, onClose, currentUser }) {
  const [idx, setIdx]         = useState(startIndex || 0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused]   = useState(false);
  const [liked, setLiked]     = useState(false);
  const [likes, setLikes]     = useState(0);
  const [comment, setComment] = useState('');
  const intervalRef = useRef(null);
  const videoRef    = useRef(null);
  const DURATION    = 7000;
  const story = stories[idx];

  // Bloquear scroll del body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setLiked(story.is_liked || false);
    setLikes(story.like_count || 0);
    api.get(`/posts/${story.id}`).catch(() => {});
  }, [idx]);

  useEffect(() => {
    if (paused) { clearInterval(intervalRef.current); return; }
    clearInterval(intervalRef.current);
    setProgress(0);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const pct = ((Date.now() - start) / DURATION) * 100;
      if (pct >= 100) {
        clearInterval(intervalRef.current);
        if (idx < stories.length - 1) setIdx(i => i + 1);
        else onClose();
      } else { setProgress(pct); }
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [idx, paused]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [idx]);

  const prev = (e) => { e.stopPropagation(); if (idx > 0) setIdx(i => i - 1); };
  const next = (e) => { e.stopPropagation(); if (idx < stories.length - 1) setIdx(i => i + 1); else onClose(); };

  const toggleLike = async (e) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      const { data } = await api.post(`/posts/${story.id}/like`);
      setLiked(data.liked);
      setLikes(l => data.liked ? l + 1 : l - 1);
    } catch {}
  };

  const sendComment = async (e) => {
    e.stopPropagation();
    if (!comment.trim() || !currentUser) return;
    try {
      await api.post(`/posts/${story.id}/comments`, { content: comment });
      toast.success('Comentario enviado ✓');
      setComment('');
    } catch {}
  };

  if (!story) return null;
  const media = parseMedia(story.media);
  const m = media[0];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw',
      height: '100dvh',
      zIndex: 99999,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Fondo negro al tocar fuera en desktop */}
      <div style={{position:'absolute',inset:0,background:'#000'}} onClick={onClose} />

      {/* Contenedor de la historia */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        height: '100%',
        maxHeight: '100dvh',
        overflow: 'hidden',
        background: '#000',
        margin: '0 auto',
      }}>

        {/* MEDIA — ocupa TODO el espacio */}
        {m && (
          m.type === 'video'
            ? <video
                ref={videoRef}
                src={m.url}
                playsInline
                autoPlay
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                }}
                onEnded={next}
                onMouseDown={() => setPaused(true)}
                onMouseUp={() => setPaused(false)}
                onTouchStart={() => setPaused(true)}
                onTouchEnd={() => setPaused(false)}
              />
            : <img
                src={m.url}
                alt=""
                className="protected-media"
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                }}
                onMouseDown={() => setPaused(true)}
                onMouseUp={() => setPaused(false)}
                onTouchStart={() => setPaused(true)}
                onTouchEnd={() => setPaused(false)}
              />
        )}

        {/* Sin media — texto */}
        {!m && story.body && (
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#1a0010,#0a0020)',padding:'2rem'}}
            onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}>
            <p style={{color:'white',fontSize:'22px',lineHeight:1.7,fontWeight:600,textAlign:'center'}}>{story.body}</p>
          </div>
        )}

        {/* Gradiente top */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:120,background:'linear-gradient(to bottom,rgba(0,0,0,0.7) 0%,transparent 100%)',zIndex:10,pointerEvents:'none'}} />

        {/* Gradiente bottom */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:160,background:'linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 100%)',zIndex:10,pointerEvents:'none'}} />

        {/* Barras de progreso */}
        <div style={{position:'absolute',top:12,left:10,right:10,zIndex:20,display:'flex',gap:'3px'}}>
          {stories.map((s, i) => (
            <div key={s.id} style={{flex:1,height:3,background:'rgba(255,255,255,0.3)',borderRadius:2,overflow:'hidden'}}>
              <div style={{
                height:'100%',
                background:'white',
                borderRadius:2,
                width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%',
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{position:'absolute',top:28,left:0,right:0,zIndex:20,display:'flex',alignItems:'center',gap:'10px',padding:'0 14px'}}>
          <div style={{width:40,height:40,borderRadius:'50%',overflow:'hidden',border:'2px solid white',flexShrink:0,background:'linear-gradient(135deg,#E8365D,#D4A843)'}}>
            {story.avatar_url
              ? <img src={story.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
              : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:'16px'}}>{story.username?.[0]?.toUpperCase()}</div>
            }
          </div>
          <div style={{flex:1}}>
            <div style={{color:'white',fontSize:'14px',fontWeight:600,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{story.display_name||story.username}</div>
            <div style={{color:'rgba(255,255,255,0.7)',fontSize:'11px'}}>Historia · hace poco</div>
          </div>
          <button
            onClick={(e)=>{e.stopPropagation();onClose();}}
            style={{background:'rgba(0,0,0,0.5)',border:'none',color:'white',width:34,height:34,borderRadius:'50%',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',zIndex:21}}>
            ✕
          </button>
        </div>

        {/* Texto sobre imagen */}
        {story.body && m && (
          <div style={{position:'absolute',bottom:115,left:0,right:0,padding:'0 20px',zIndex:15,pointerEvents:'none'}}>
            <p style={{color:'white',fontSize:'16px',lineHeight:1.6,textShadow:'0 2px 10px rgba(0,0,0,1)',textAlign:'center',fontWeight:500}}>{story.body}</p>
          </div>
        )}

        {/* Zonas navegación izq/der */}
        <div style={{position:'absolute',top:80,left:0,bottom:120,width:'35%',zIndex:15,cursor:'pointer'}} onClick={prev} />
        <div style={{position:'absolute',top:80,right:0,bottom:120,width:'35%',zIndex:15,cursor:'pointer'}} onClick={next} />

        {/* Footer — comentario y like */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:20,padding:'12px 14px 28px',display:'flex',gap:'10px',alignItems:'center'}}>
          <input
            onClick={e=>e.stopPropagation()}
            style={{flex:1,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'24px',padding:'10px 16px',fontSize:'14px',color:'white',outline:'none',fontFamily:'var(--font-body)',backdropFilter:'blur(10px)'}}
            placeholder={currentUser ? 'Comenta...' : 'Inicia sesión para comentar'}
            value={comment}
            onChange={e=>setComment(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&sendComment(e)}
            disabled={!currentUser}
          />
          <button onClick={toggleLike}
            style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'1px',padding:'4px',flexShrink:0}}>
            <span style={{fontSize:'28px',filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'}}>{liked?'❤️':'🤍'}</span>
            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.9)',fontWeight:600,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{likes}</span>
          </button>
          {comment.trim() && (
            <button onClick={sendComment}
              style={{background:'#E8365D',border:'none',color:'white',width:42,height:42,borderRadius:'50%',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 10px rgba(232,54,93,0.5)'}}>
              ➤
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function StoriesBubbles({ stories, currentUser, onUpload }) {
  const [viewing, setViewing] = useState(null);
  const [uploading, setUpl]   = useState(false);
  const fileRef = useRef(null);

  const grouped = stories.reduce((acc, s) => {
    const key = s.creator_id;
    if (!acc[key]) acc[key] = {
      creator_id: key, username: s.username,
      display_name: s.display_name, avatar_url: s.avatar_url, stories: []
    };
    acc[key].stories.push(s);
    return acc;
  }, {});
  const creators = Object.values(grouped);

  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUpl(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const fd = new FormData();
      fd.append('file', file);
      const { data: uploaded } = await api.post(
        isVideo ? '/uploads/video' : '/uploads/image',
        fd, { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      await api.post('/posts', {
        body: '', type: 'story', is_free: false,
        media: [{ url: uploaded.url, thumbnail_url: uploaded.thumbnail_url, type: isVideo ? 'video' : 'image' }]
      });
      toast.success('Historia publicada ✓');
      window.dispatchEvent(new CustomEvent('fv:new_story'));
      if (onUpload) onUpload();
    } catch { toast.error('Error al publicar historia'); }
    finally { setUpl(false); e.target.value = ''; }
  };

  return (
    <>
      <style>{`
        @keyframes storyRing {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div style={{display:'flex',gap:'14px',overflowX:'auto',padding:'4px 2px 8px',scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>

        {/* Burbuja subir historia */}
        {currentUser?.role === 'creator' && (
          <div onClick={() => fileRef.current?.click()}
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'6px',flexShrink:0,cursor:'pointer'}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'var(--dark3)',border:'2px dashed rgba(232,54,93,0.6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',color:'var(--text2)',transition:'all .2s'}}>
              {uploading
                ? <span style={{width:22,height:22,border:'2px solid rgba(255,255,255,0.15)',borderTopColor:'#E8365D',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}} />
                : '+'
              }
            </div>
            <span style={{fontSize:'11px',color:'var(--text3)',whiteSpace:'nowrap'}}>Tu historia</span>
          </div>
        )}

        {/* Burbujas creadores */}
        {creators.map(c => (
          <div key={c.creator_id}
            onClick={() => setViewing({ stories: c.stories, startIndex: 0 })}
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'6px',flexShrink:0,cursor:'pointer'}}>
            <div style={{
              width:66, height:66, borderRadius:'50%', padding:3,
              background:'linear-gradient(135deg,#E8365D,#D4A843,#ff6b9d,#E8365D)',
              backgroundSize:'300% 300%',
              animation:'storyRing 2s ease infinite',
              flexShrink:0
            }}>
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'var(--dark)',padding:2.5}}>
                <div style={{width:'100%',height:'100%',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:700,color:'white'}}>
                  {c.avatar_url
                    ? <img src={c.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                    : (c.display_name||c.username||'?')[0].toUpperCase()
                  }
                </div>
              </div>
            </div>
            <span style={{fontSize:'11px',color:'var(--text2)',maxWidth:68,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'center'}}>
              {c.display_name||c.username}
            </span>
          </div>
        ))}
      </div>

      <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} style={{display:'none'}} />

      {viewing && (
        <StoryViewer
          stories={viewing.stories}
          startIndex={viewing.startIndex}
          onClose={() => setViewing(null)}
          currentUser={currentUser}
        />
      )}
    </>
  );
}

export default StoriesBubbles;
