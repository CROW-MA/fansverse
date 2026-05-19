import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../services/api';

export default function Search() {
  const [q, setQ]            = useState('');
  const [results, setRes]    = useState([]);
  const [searching, setSrch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!q.trim()) { setRes([]); return; }
    const t = setTimeout(async () => {
      setSrch(true);
      try { const { data } = await searchApi.search(q); setRes(data.results); }
      catch {} finally { setSrch(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="page-content fade-in">
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,marginBottom:'1rem'}}>Buscar</h1>
      <input className="input" style={{fontSize:'16px',marginBottom:'1.5rem'}}
        placeholder="Buscar creadores por nombre o @usuario..." value={q} onChange={e => setQ(e.target.value)} autoFocus />
      {searching && <div style={{display:'flex',justifyContent:'center',padding:'2rem'}}><div className="spinner" style={{width:24,height:24}} /></div>}
      {!searching && results.map(r => (
        <div key={r.id} className="card" style={{display:'flex',gap:'12px',alignItems:'center',marginBottom:'8px',cursor:'pointer'}}
          onClick={() => navigate(`/${r.username}`)}>
          <div className="avatar" style={{width:44,height:44,background:'linear-gradient(135deg,#E8365D,#D4A843)',fontSize:'16px',fontWeight:700,color:'white'}}>
            {r.avatar_url ? <img src={r.avatar_url} alt="" /> : r.username?.[0]?.toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600}}>{r.display_name} {r.is_verified && <span style={{color:'var(--rose)'}}>✓</span>}</div>
            <div style={{fontSize:'12px',color:'var(--text3)'}}>@{r.username} · {r.total_subscribers} fans</div>
          </div>
          {r.min_price && <span className="badge badge-rose">${parseFloat(r.min_price).toFixed(2)}/mes</span>}
        </div>
      ))}
      {!searching && q && !results.length && (
        <div style={{textAlign:'center',color:'var(--text2)',padding:'2rem',fontSize:'14px'}}>No se encontraron resultados para "{q}"</div>
      )}
    </div>
  );
}
