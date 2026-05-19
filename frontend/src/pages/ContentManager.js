import React, { useEffect, useState } from 'react';
import { postsApi, uploadApi } from '../services/api';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import MediaEditor from '../components/MediaEditor';

const parseMedia = (media) => {
  if (!media) return [];
  if (Array.isArray(media)) return media;
  try { return JSON.parse(media); } catch { return []; }
};

export default function ContentManager() {
  const [posts, setPosts]     = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [uploading, setUp]    = useState(false);
  const [uploadPct, setUpPct] = useState(0);
  const [form, setForm]       = useState({ title:'', body:'', type:'post', is_free:false, ppv_price:'', media:[] });
  const [posting, setPosting] = useState(false);
  const [filter, setFilter]   = useState('all');
  const [loading, setLoading]   = useState(true);
  const [editingFile, setEditing] = useState(null); // { file, forField }
  const [editCaption, setCaption] = useState('');

  const loadPosts = () => {
    import('../services/api').then(({ default: api }) => {
      api.get('/posts/creator/me')
        .then(r => setPosts((r.data.posts || []).map(p => ({ ...p, media: parseMedia(p.media) }))))
        .catch(() => setPosts([]))
        .finally(() => setLoading(false));
    });
  };

  useEffect(() => { loadPosts(); }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [], 'video/*': [] },
    onDrop: async (files) => {
      if (!files.length) return;
      // Abrir editor antes de subir
      setEditing({ file: files[0] });
    }
  });

  const uploadAfterEdit = async (editedFile, caption) => {
    setEditing(null);
    if (caption) setForm(f => ({ ...f, body: f.body ? f.body + ' ' + caption : caption }));
    setUp(true); setUpPct(0);
    try {
      const isVideo = editedFile.type.startsWith('video/');
      const { data } = isVideo
        ? await uploadApi.video(editedFile, setUpPct)
        : await uploadApi.image(editedFile, setUpPct);
      setForm(f => ({ ...f, media: [...f.media, { url: data.url, thumbnail_url: data.thumbnail_url, type: isVideo ? 'video' : 'image' }] }));
      toast.success('Archivo listo ✓');
    } catch { toast.error('Error al subir archivo'); }
    finally { setUp(false); }
  };

  const createPost = async () => {
    if (!form.body && !form.media.length) return toast.error('Agrega texto o media');
    setPosting(true);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        type: form.type,
        is_free: form.is_free,
        media: form.media,
        ppv_price: form.type === 'ppv' ? parseFloat(form.ppv_price) : null,
      };
      await postsApi.create(payload);
      setShowNew(false);
      setForm({ title:'', body:'', type:'post', is_free:false, ppv_price:'', media:[] });
      toast.success('Post publicado 🎉');
      window.dispatchEvent(new CustomEvent('fv:new_post'));
      loadPosts();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al publicar');
    } finally { setPosting(false); }
  };

  const deletePost = async (id) => {
    if (!window.confirm('¿Eliminar este post?')) return;
    try {
      await postsApi.delete(id);
      setPosts(p => p.filter(x => x.id !== id));
      toast.success('Post eliminado');
    } catch { toast.error('Error al eliminar'); }
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.type === filter);

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700}}>Mi Contenido</h1>
          <p style={{color:'var(--text2)',fontSize:'14px'}}>{posts.length} publicaciones</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowNew(true)}>+ Crear post</button>
      </div>

      {editingFile && (
        <MediaEditor
          file={editingFile.file}
          onConfirm={uploadAfterEdit}
          onCancel={() => setEditing(null)}
        />
      )}

      {showNew && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
          onClick={() => setShowNew(false)}>
          <div onClick={e => e.stopPropagation()} style={{background:'var(--dark2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:'520px',maxHeight:'90vh',overflowY:'auto'}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'1.25rem'}}>Crear nuevo post</h3>

            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px',marginBottom:'1rem'}}>
              {[['post','📝 Post'],['ppv','🔒 PPV'],['story','⚡ Story']].map(([t,l]) => (
                <button key={t} type="button" onClick={() => setForm(f => ({...f,type:t}))}
                  style={{padding:'8px',borderRadius:'8px',border:`1px solid ${form.type===t?'var(--rose)':'var(--border)'}`,background:form.type===t?'var(--rose-light)':'transparent',color:form.type===t?'var(--rose)':'var(--text2)',cursor:'pointer',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',transition:'all .15s'}}>
                  {l}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Título (opcional)</label>
              <input className="input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Título del post" />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="textarea" value={form.body} onChange={e => setForm(f=>({...f,body:e.target.value}))} placeholder="¿Qué quieres compartir?" />
            </div>

            {form.type === 'ppv' && (
              <div className="form-group">
                <label className="form-label">Precio PPV (USD)</label>
                <input className="input" type="number" min="1" value={form.ppv_price} onChange={e => setForm(f=>({...f,ppv_price:e.target.value}))} placeholder="Ej: 15" />
              </div>
            )}

            {form.type === 'post' && (
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'1rem'}}>
                <input type="checkbox" id="free" checked={form.is_free} onChange={e => setForm(f=>({...f,is_free:e.target.checked}))} />
                <label htmlFor="free" style={{fontSize:'13px',color:'var(--text2)',cursor:'pointer'}}>Publicar como contenido gratuito</label>
              </div>
            )}

            <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?'var(--rose)':'var(--border2)'}`,borderRadius:'10px',padding:'1.5rem',textAlign:'center',cursor:'pointer',marginBottom:'1rem',background:isDragActive?'var(--rose-light)':'transparent',transition:'all .15s'}}>
              <input {...getInputProps()} />
              {uploading
                ? <div><div className="spinner" style={{margin:'0 auto 8px',width:24,height:24}} /><div style={{fontSize:'13px',color:'var(--text2)'}}>Subiendo… {uploadPct}%</div></div>
                : <div><div style={{fontSize:'1.5rem',marginBottom:'6px'}}>📤</div><div style={{fontSize:'13px',color:'var(--text2)'}}>Arrastra o haz clic para subir</div><div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>Fotos y videos</div></div>
              }
            </div>

            {form.media.length > 0 && (
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'1rem'}}>
                {form.media.map((m,i) => (
                  <div key={i} style={{position:'relative'}}>
                    <img src={m.thumbnail_url||m.url} alt="" style={{width:70,height:70,objectFit:'cover',borderRadius:'8px'}} />
                    <button onClick={() => setForm(f=>({...f,media:f.media.filter((_,j)=>j!==i)}))}
                      style={{position:'absolute',top:-5,right:-5,background:'var(--rose)',color:'white',border:'none',borderRadius:'50%',width:18,height:18,cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{display:'flex',gap:'8px'}}>
              <button className="btn btn-outline" style={{flex:1}} onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{flex:2}} onClick={createPost} disabled={posting}>
                {posting ? <><span className="spinner" style={{width:14,height:14}} /> Publicando...</> : 'Publicar ahora'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:'6px',marginBottom:'1.25rem',flexWrap:'wrap'}}>
        {[['all','Todo'],['post','Posts'],['ppv','PPV'],['story','Stories']].map(([t,l]) => (
          <button key={t} className={`btn btn-sm ${filter===t?'btn-primary':'btn-outline'}`} onClick={() => setFilter(t)}>{l}</button>
        ))}
      </div>

      {loading
        ? <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><div className="spinner" style={{width:28,height:28}} /></div>
        : filtered.length === 0
          ? <div className="card" style={{textAlign:'center',padding:'3rem',color:'var(--text2)'}}>
              {posts.length === 0 ? 'No has publicado nada aún. ¡Crea tu primer post!' : 'No hay contenido en esta categoría'}
            </div>
          : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'1rem'}}>
              {filtered.map(p => {
                const mediaArr = p.media || [];
                const thumb = mediaArr[0];
                return (
                  <div key={p.id} className="card">
                    {thumb && (
                      <div style={{height:160,borderRadius:'8px',marginBottom:'10px',overflow:'hidden',background:'var(--dark3)'}}>
                        {thumb.type === 'video'
                          ? (thumb.thumbnail_url
                          ? <img src={thumb.thumbnail_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : <div style={{width:'100%',height:'100%',background:'#1a1a2e',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'4px'}}><span style={{fontSize:'1.8rem'}}>🎬</span><span style={{fontSize:'10px',color:'var(--text3)'}}>Video</span></div>
                        )
                          : <img src={thumb.thumbnail_url||thumb.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        }
                      </div>
                    )}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                      <span className={`badge ${p.type==='ppv'?'badge-rose':p.is_free?'badge-green':'badge-gray'}`}>{p.type}</span>
                      <button className="btn btn-sm" style={{background:'rgba(239,68,68,0.1)',color:'var(--danger)',border:'1px solid rgba(239,68,68,0.2)',padding:'4px 8px'}} onClick={() => deletePost(p.id)}>🗑</button>
                    </div>
                    <div style={{fontWeight:500,fontSize:'13px',marginBottom:'6px'}}>{p.title||p.body?.substring(0,60)||'Sin título'}</div>
                    <div style={{fontSize:'11px',color:'var(--text3)',display:'flex',gap:'12px'}}>
                      <span>👁 {p.view_count||0}</span>
                      <span>❤️ {p.like_count||0}</span>
                      {p.type==='ppv' && <span style={{color:'var(--gold)'}}>💰 ${p.ppv_price}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )
      }
    </div>
  );
}
