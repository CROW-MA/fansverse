import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi, payoutsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import styles from './Dashboard.module.css';

const StatCard = ({ label, value, sub, accent, icon }) => (
  <div className={styles.statCard} style={{ '--accent': accent }}>
    <div className={styles.statTop}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statIcon}>{icon}</span>
    </div>
    <div className={styles.statValue} style={{ color: accent }}>{value}</div>
    {sub && <div className={styles.statSub}>{sub}</div>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [balance, setBalance]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([analyticsApi.dashboard(), payoutsApi.balance()])
      .then(([a, b]) => { setData(a.data); setBalance(b.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-content" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div className="spinner" style={{width:32,height:32}} />
    </div>
  );

  const chartData = data?.earnings_chart?.reduce((acc, row) => {
    const existing = acc.find(r => r.date === row.date);
    if (existing) { existing[row.type] = parseFloat(row.amount); }
    else { acc.push({ date: row.date, [row.type]: parseFloat(row.amount) }); }
    return acc;
  }, []) || [];

  const monthly = data?.monthly || {};

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Hola, {user?.display_name || user?.username} 👋
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '14px' }}>
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn btn-primary" onClick={() => navigate('/content')}>+ Subir contenido</button>
          <button className="btn btn-sm" style={{background:'rgba(239,68,68,0.9)',color:'white',border:'none',display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontFamily:'var(--font-body)',fontWeight:600,fontSize:'14px'}}
            onClick={() => navigate(`/live/${user?.username}`)}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'white',display:'inline-block',animation:'pulse 1.5s infinite'}} />
            Iniciar Live
          </button>
        </div>
      </div>

      {/* Payout Banner */}
      {balance && balance.available > 20 && (
        <div className={styles.payoutBanner}>
          <div>
            <div className={styles.payoutTitle}>
              💸 ${balance.available.toFixed(2)} disponibles
              <span className={styles.fastBadge}>⚡ Retiro en 2h</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '3px' }}>
              FansVerse te paga en horas. Sin esperas de 7 días.
            </p>
          </div>
          <button className="btn btn-gold" onClick={() => navigate('/payouts')}>
            Retirar ahora
          </button>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Ingresos del mes"
          value={`${parseFloat(balance?.available || balance?.total_earnings || monthly.total_revenue || 0).toFixed(2)}`}
          sub="Disponible para retirar"
          accent="#E8365D" icon="💰"
        />
        <StatCard
          label="Suscriptores activos"
          value={data?.subscribers?.active || 0}
          sub={`+${data?.subscribers?.new_this_week || 0} esta semana`}
          accent="#D4A843" icon="👥"
        />
        <StatCard
          label="Ingresos PPV"
          value={`$${parseFloat(monthly.ppv_revenue || 0).toFixed(2)}`}
          sub="Mensajes y posts de pago"
          accent="#22C55E" icon="🔒"
        />
        <StatCard
          label="Tasa de renovación"
          value={`${data?.renewal_rate || 0}%`}
          sub="Fans que se quedan"
          accent="#60A5FA" icon="🔄"
        />
      </div>

      {/* Chart + Recent subs */}
      <div className={styles.twoCol}>
        <div className="card">
          <div className={styles.cardHeader}>
            <span>Ganancias (últimos 30 días)</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/analytics')}>Ver más →</button>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8365D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E8365D" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A843" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4A843" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#58586A', fontSize: 10 }}
                  tickFormatter={d => { try { return format(parseISO(d), 'd MMM', { locale: es }); } catch { return d; } }}
                />
                <YAxis tick={{ fill: '#58586A', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#17171B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v) => [`$${parseFloat(v).toFixed(2)}`]}
                />
                <Area type="monotone" dataKey="subscription" stroke="#E8365D" fill="url(#gs)" strokeWidth={2} name="Suscripciones" />
                <Area type="monotone" dataKey="ppv" stroke="#D4A843" fill="url(#gp)" strokeWidth={2} name="PPV & Tips" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              Sin datos aún. ¡Sube contenido y comienza a ganar!
            </div>
          )}
        </div>

        <div className="card">
          <div className={styles.cardHeader}>
            <span>Nuevos suscriptores</span>
          </div>
          {data?.recent_subscribers?.length > 0 ? (
            <div className={styles.subList}>
              {data.recent_subscribers.slice(0, 6).map((s, i) => (
                <div key={i} className={styles.subItem}>
                  <div className="avatar" style={{ width: 36, height: 36, background: 'var(--rose-light)', color: 'var(--rose)', fontSize: '13px', fontWeight: 600 }}>
                    {s.avatar_url ? <img src={s.avatar_url} alt="" /> : s.username?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>@{s.username}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                      {s.tier_name} · {format(new Date(s.created_at), 'd MMM', { locale: es })}
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>+${parseFloat(s.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: '13px', padding: '2rem 0', textAlign: 'center' }}>
              Aún no tienes suscriptores
            </div>
          )}
        </div>
      </div>

      {/* Top content */}
      {data?.top_posts?.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className={styles.cardHeader}>
            <span>Contenido más rentable</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/content')}>Gestionar →</button>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Contenido</th>
                <th>Tipo</th>
                <th>Vistas</th>
                <th>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {data.top_posts.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.title || 'Sin título'}</td>
                  <td><span className={`badge ${p.type === 'ppv' ? 'badge-rose' : 'badge-gray'}`}>{p.type}</span></td>
                  <td style={{ color: 'var(--text2)' }}>{p.view_count?.toLocaleString()}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>${parseFloat(p.total_revenue || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
