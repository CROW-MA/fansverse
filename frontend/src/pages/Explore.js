import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { creatorsApi } from '../services/api';

export default function Explore() {
  const [creators, setCreators] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState('all');
  const navigate = useNavigate();

  const CATEGORIES = [
    { id:'all',    label:'🔥 Todo' },
    { id:'mujer',  label:'👩 Mujeres' },
    { id:'hombre', label:'👨 Hombres' },
    { id:'pareja', label:'💑 Parejas' },
    { id:'trans',  label:'🏳️‍⚧️ Trans' },
    { id:'gay',    label:'🏳️‍🌈 Gay' },
    { id:'lesbi',  label:'💜 Lesbianas' },
  ];

  useEffect(() => {
    creatorsApi.featured().then(r => {
      setCreators(r.data.creators);
      setFiltered(r.data.creators);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (category === 'all') {
      setFiltered(creators);
    } else {
      // Comparar categoría exacta
      const result = creators.filter(c => {
        const cat = (c.category || 'general').toLowerCase().trim();
        return cat === category;
      });
      setFiltered(result);
    }
  }, [category, creators]);

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><div className="spinner" style={{width:32,height:32}} /></div>;

  return (
    <div className="page-content fade-in">
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,marginBottom:'4px'}}>Explorar</h1>
      <p style={{color:'var(--text2)',fontSize:'14px',marginBottom:'1rem'}}>Descubre creadores increíbles en FansVerse</p>

      {/* Filtros de categoría */}
      <div style={{display:'flex',gap:'8px',overflowX:'auto',marginBottom:'1.5rem',paddingBottom:'4px',scrollbarWidth:'none'}}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setCategory(prev => prev === cat.id && cat.id !== 'all' ? 'all' : cat.id)}
            style={{flexShrink:0,padding:'7px 14px',borderRadius:'20px',border:`1px solid ${category===cat.id?'#E8365D':'var(--border)'}`,background:category===cat.id?'var(--rose-light)':'transparent',color:category===cat.id?'#E8365D':'var(--text2)',cursor:'pointer',fontSize:'13px',fontFamily:'var(--font-body)',whiteSpace:'nowrap',fontWeight:category===cat.id?600:400}}>
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'1rem'}}>
        {filtered.map(c => (
          <div key={c.id} className="card" style={{cursor:'pointer'}} onClick={() => navigate(`/${c.username}`)}>
            <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'12px'}}>
              <div className="avatar" style={{width:48,height:48,background:'linear-gradient(135deg,#E8365D,#D4A843)',fontSize:'18px',fontWeight:700,color:'white'}}>
                {c.avatar_url ? <img src={c.avatar_url} alt="" /> : c.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{fontWeight:600,fontSize:'14px'}}>{c.display_name}<span style={{color:'var(--rose)',fontSize:'11px'}}>{c.is_verified?' ✓':''}</span></div>
                <div style={{fontSize:'12px',color:'var(--text3)'}}>@{c.username}</div>
              </div>
            </div>
            {c.bio && <p style={{fontSize:'12px',color:'var(--text2)',marginBottom:'10px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{c.bio}</p>}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'12px'}}>
              <span style={{color:'var(--text3)'}}>👥 {c.total_subscribers} fans</span>
              {c.min_price && <span className="badge badge-rose">desde ${parseFloat(c.min_price).toFixed(2)}/mes</span>}
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div style={{gridColumn:'1/-1',textAlign:'center',color:'var(--text2)',padding:'3rem'}}>
            {category === 'all'
              ? 'No hay creadores aún. ¡Sé el primero!'
              : <><div style={{fontSize:'2rem',marginBottom:'8px'}}>🔍</div><div>No hay creadores en esta categoría aún.</div><button className="btn btn-outline btn-sm" style={{marginTop:'12px'}} onClick={()=>setCategory('all')}>Ver todos</button></>
            }
          </div>
        )}
      </div>
    </div>
  );
}
