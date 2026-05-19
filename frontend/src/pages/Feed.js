import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsApi, subsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { StoriesBubbles } from '../components/Stories';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const parseMedia = (media) => {
  if (!media) return [];
  if (Array.isArray(media)) return media.filter(Boolean);
  if (typeof media === 'string') {
    try { const p = JSON.parse(media); return Array.isArray(p) ? p.filter(Boolean) : []; }
    catch { return []; }
  }
  return [];
};

const PostCard = ({ post, onLike, currentUser, navigate }) => {
  const media = parseMedia(post.media);
  return (
    <div className="card" style={{marginBottom:'1rem'}}>
      {/* Header */}
      <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'12px'}}>
        <div
          style={{width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',fontWeight:700,color:'white',overflow:'hidden',cursor:'pointer',flexShrink:0}}
          onClick={() => navigate(`/${post.username}`)}>
          {post.avatar_url
            ? <img src={post.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
            : post.username?.[0]?.toUpperCase()}
        </div>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:'14px',cursor:'pointer'}} onClick={() => navigate(`/${post.username}`)}>
            {post.display_name||post.username}
            {post.is_verified && <span style={{color:'#E8365D',marginLeft:4,fontSize:'12px'}}>✓</span>}
          </div>
          <div style={{fontSize:'11px',color:'var(--text3)'}}>
            {format(new Date(post.published_at||post.created_at), 'd MMM · HH:mm', {locale:es})}
          </div>
        </div>
        {post.type==='ppv' && (
          <span style={{background:'rgba(212,168,67,0.15)',color:'#D4A843',fontSize:'11px',fontWeight:700,padding:'3px 8px',borderRadius:'6px'}}>
            PPV ${post.ppv_price}
          </span>
        )}
      </div>

      {/* Texto */}
      {post.body && (
        <p style={{fontSize:'14px',marginBottom:'12px',lineHeight:1.6,color:'var(--text)'}}>{post.body}</p>
      )}

      {/* Contenido bloqueado */}
      {!post.has_access && (
        <div style={{background:'var(--dark3)',borderRadius:'10px',padding:'2rem',textAlign:'center',marginBottom:'12px',border:'1px dashed var(--border2)'}}>
          <div style={{fontSize:'1.5rem',marginBottom:'8px'}}>🔒</div>
          <div style={{fontSize:'13px',color:'var(--text2)',marginBottom:'12px'}}>
            {post.type==='ppv' ? `PPV · $${post.ppv_price}` : 'Contenido exclusivo para suscriptores'}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/${post.username}`)}>
            {post.type==='ppv' ? 'Desbloquear' : 'Ver perfil del creador'}
          </button>
        </div>
      )}

      {/* Media con acceso */}
      {post.has_access && media.length > 0 && (
        <div style={{borderRadius:'10px',overflow:'hidden',marginBottom:'12px',background:'#000'}}>
          {media.map((m, mi) => {
            if (!m || !m.url) return null;
            return (
              <div key={mi} style={{marginBottom: mi < media.length-1 ? '4px' : 0}}>
                {m.type === 'video' ? (
                  <video
                    src={m.url}
                    poster={m.thumbnail_url || undefined}
                    controls
                    preload="metadata"
                    playsInline
                    controlsList="nodownload"
                    onContextMenu={e => e.preventDefault()}
                    style={{
                      width: '100%',
                      maxHeight: 520,
                      display: 'block',
                      objectFit: 'contain',
                      background: '#000',
                      borderRadius: '10px'
                    }}
                  />
                ) : (
                  <img
                    src={m.url}
                    alt=""
                    onContextMenu={e => e.preventDefault()}
                    className="protected-media"
                    style={{
                      width: '100%',
                      maxHeight: 520,
                      objectFit: 'cover',
                      display: 'block',
                      borderRadius: '10px'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Acciones */}
      <div style={{display:'flex',gap:'1rem',fontSize:'13px',color:'var(--text3)',alignItems:'center'}}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onLike(post.id)}
          style={{color:post.is_liked?'#E8365D':'var(--text3)',gap:'5px'}}>
          {post.is_liked?'❤️':'🤍'} {post.like_count||0}
        </button>
        <span style={{display:'flex',alignItems:'center',gap:'5px'}}>💬 {post.comment_count||0}</span>
        <span style={{display:'flex',alignItems:'center',gap:'5px'}}>👁 {post.view_count||0}</span>
      </div>
    </div>
  );
};

export default function Feed() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [posts, setPosts]     = useState([]);
  const [stories, setStories] = useState([]);
  const [subs, setSubs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [feedRes, subsRes, storiesRes] = await Promise.all([
        postsApi.feed(1),
        subsApi.my(),
        api.get('/posts/stories/feed').catch((err) => {
          console.error('Error cargando historias:', err);
          return { data: { stories: [] } };
        })
      ]);
      setPosts(feedRes.data.posts || []);
      setSubs(subsRes.data.subscriptions || []);
      const rawStories = storiesRes.data.stories || [];
      console.log('Historias recibidas:', rawStories.length, rawStories);
      setStories(rawStories.map(s => {
        let media = s.media;
        if (typeof media === 'string') {
          try { media = JSON.parse(media); } catch { media = []; }
        }
        if (!Array.isArray(media)) media = media ? [media] : [];
        return { ...s, media: media.filter(m => m && m.url) };
      }));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-actualizar cuando hay nuevo contenido
  useEffect(() => {
    const handler = () => loadAll();
    window.addEventListener('fv:new_post', handler);
    window.addEventListener('fv:new_story', handler);
    return () => {
      window.removeEventListener('fv:new_post', handler);
      window.removeEventListener('fv:new_story', handler);
    };
  }, [loadAll]);

  const handleLike = async (id) => {
    try {
      const { data } = await postsApi.like(id);
      setPosts(ps => ps.map(p => p.id===id
        ? {...p, is_liked:data.liked, like_count: data.liked ? (p.like_count||0)+1 : Math.max((p.like_count||0)-1,0)}
        : p
      ));
    } catch {}
  };

  if (loading) return (
    <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}>
      <div className="spinner" style={{width:32,height:32}} />
    </div>
  );

  if (!subs.length) return (
    <div className="page-content">
      <div style={{textAlign:'center',padding:'4rem 1rem'}}>
        <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🔍</div>
        <h2 style={{fontFamily:'var(--font-display)',marginBottom:'0.5rem'}}>Tu feed está vacío</h2>
        <p style={{color:'var(--text2)',marginBottom:'1.5rem'}}>Suscríbete a creadores para ver su contenido exclusivo</p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/explore')}>Explorar creadores</button>
      </div>
    </div>
  );

  return (
    <div className="page-content fade-in">
      <div style={{maxWidth:640, margin:'0 auto'}}>

        {/* Historias */}
        {/* Historias */}
        {(stories.length > 0 || user?.role === 'creator') && (
          <div className="card" style={{marginBottom:'1.25rem',padding:'1rem 1.25rem'}}>
            <div style={{fontSize:'12px',fontWeight:600,color:'var(--text3)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.5px',display:'flex',alignItems:'center',gap:'6px'}}>
              {stories.length > 0 && <span style={{width:7,height:7,borderRadius:'50%',background:'#E8365D',display:'inline-block',animation:'pulse 1.5s infinite'}} />}
              Historias
            </div>
            <StoriesBubbles stories={stories} currentUser={user} onUpload={loadAll} />
          </div>
        )}

                {/* Posts */}
        {posts.map(p => (
          <PostCard key={p.id} post={p} onLike={handleLike} currentUser={user} navigate={navigate} />
        ))}

        {!posts.length && (
          <div className="card" style={{textAlign:'center',padding:'3rem',color:'var(--text2)',fontSize:'14px'}}>
            Los creadores no han publicado contenido reciente.
          </div>
        )}
      </div>
    </div>
  );
}
