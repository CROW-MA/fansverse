import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function Analytics() {
  const [data, setData]     = useState(null);
  const [period, setPeriod] = useState('month');
  const [chart, setChart]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsApi.dashboard(), analyticsApi.earnings(period)])
      .then(([d, e]) => { setData(d.data); setChart(e.data.earnings); })
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><div className="spinner" style={{width:32,height:32}} /></div>;

  const sources = [
    { label:'Instagram', pct:42, color:'#E8365D' },
    { label:'TikTok',    pct:31, color:'#D4A843' },
    { label:'Twitter/X', pct:18, color:'#60A5FA' },
    { label:'Directo',   pct:9,  color:'#22C55E' },
  ];

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,marginBottom:'4px'}}>Analytics</h1>
          <p style={{color:'var(--text2)',fontSize:'14px'}}>Entiende tu audiencia y maximiza tus ingresos</p>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          {['week','month','year'].map(p => (
            <button key={p} className={`btn btn-sm ${period===p?'btn-primary':'btn-outline'}`} onClick={() => setPeriod(p)}>
              {p==='week'?'7 días':p==='month'?'30 días':'1 año'}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.25rem'}}>
        {[
          {label:'Ingresos del mes',value:`$${parseFloat(data?.monthly?.total_revenue||0).toFixed(2)}`,color:'#E8365D'},
          {label:'Suscriptores activos',value:data?.subscribers?.active||0,color:'#D4A843'},
          {label:'Tasa de renovación',value:`${data?.renewal_rate||0}%`,color:'#22C55E'},
          {label:'Ingresos PPV',value:`$${parseFloat(data?.monthly?.ppv_revenue||0).toFixed(2)}`,color:'#60A5FA'},
        ].map((s,i) => (
          <div key={i} className="card" style={{borderTop:`2px solid ${s.color}`}}>
            <div style={{fontSize:'11px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'8px'}}>{s.label}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
        <div className="card">
          <div style={{fontSize:'14px',fontWeight:600,marginBottom:'1rem'}}>Fuentes de tráfico</div>
          {sources.map(s => (
            <div key={s.label} style={{marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'var(--text2)',marginBottom:'5px'}}>
                <span>{s.label}</span><span>{s.pct}%</span>
              </div>
              <div style={{height:6,background:'var(--dark3)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${s.pct}%`,background:s.color,borderRadius:3}} />
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{fontSize:'14px',fontWeight:600,marginBottom:'1rem'}}>Contenido más rentable</div>
          {data?.top_posts?.length > 0
            ? data.top_posts.map((p,i) => (
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{fontSize:'11px',fontWeight:700,color:'var(--text3)',width:16}}>#{i+1}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title||'Sin título'}</div>
                  <div style={{fontSize:'11px',color:'var(--text3)'}}>{p.view_count} vistas</div>
                </div>
                <span style={{fontSize:'13px',fontWeight:600,color:'var(--success)'}}>${parseFloat(p.total_revenue||0).toFixed(2)}</span>
              </div>
            ))
            : <div style={{color:'var(--text3)',fontSize:'13px'}}>Sin datos aún</div>
          }
        </div>
      </div>
    </div>
  );
}

export default Analytics;
