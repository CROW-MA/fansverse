import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { payoutsApi } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SPEED_OPTIONS = [
  { id:'instant', icon:'⚡', label:'Instantáneo', desc:'En minutos',    feeNote:'1.5% comisión',    badgeLabel:'Minutos',   methods:['Nequi','Daviplata','USDT TRC20','Binance Pay'] },
  { id:'fast',    icon:'🚀', label:'2 Horas',     desc:'Bancario rápido', feeNote:'Sin comisión extra', badgeLabel:'~2 horas',  methods:['Bancolombia','PSE','Davivienda','Zelle','CashApp'] },
  { id:'standard',icon:'🏦', label:'24 Horas',    desc:'Estándar',      feeNote:'Sin comisión',     badgeLabel:'~24 horas', methods:['PayPal','Banco internacional','SWIFT','Binance','Crypto'] },
];

export default function Payouts() {
  const navigate = useNavigate();
  const [balance, setBalance]       = useState(null);
  const [txs, setTxs]               = useState([]);
  const [loading, setLoading]       = useState(true);
  const [kycStatus, setKycStatus]   = useState('loading');
  const [speed, setSpeed]           = useState('fast');
  const [method, setMethod]         = useState('Bancolombia');
  const [amount, setAmount]         = useState('');
  const [destination, setDest]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal]   = useState(false);

  useEffect(() => {
    api.get('/kyc/status')
      .then(r => setKycStatus(r.data.status || 'not_submitted'))
      .catch(() => setKycStatus('not_submitted'));
  }, []);

  useEffect(() => {
    Promise.all([payoutsApi.balance(), payoutsApi.transactions()])
      .then(([b, t]) => {
        setBalance(b.data);
        setTxs(t.data.transactions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedSpeed = SPEED_OPTIONS.find(s => s.id === speed);
  const fee = speed === 'instant' ? parseFloat(amount || 0) * 0.015 : 0;
  const net = parseFloat(amount || 0) - fee;

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) < 100) return toast.error('Monto mínimo: $100 USD');
    if (parseFloat(amount) > (balance?.available || 0)) return toast.error('Saldo insuficiente');
    if (!destination) return toast.error('Ingresa tu número de cuenta o dirección');
    setSubmitting(true);
    try {
      await payoutsApi.request({ amount: parseFloat(amount), method, speed, destination_details: { account: destination } });
      toast.success('✅ Retiro procesado exitosamente');
      setShowModal(false);
      payoutsApi.balance().then(b => setBalance(b.data));
      setAmount('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al procesar retiro');
    } finally { setSubmitting(false); }
  };

  // Loading spinner
  if (loading || kycStatus === 'loading') return (
    <div className="page-content fade-in">
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,marginBottom:'1.5rem'}}>Pagos y Retiros</h1>
      <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}>
        <div className="spinner" style={{width:36,height:36}} />
      </div>
    </div>
  );

  // KYC no aprobado
  if (kycStatus !== 'approved') return (
    <div className="page-content fade-in">
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,marginBottom:'1.5rem'}}>Pagos y Retiros</h1>
      <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'var(--radius-lg)',padding:'2.5rem',textAlign:'center',maxWidth:500}}>
        <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🪪</div>
        <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'0.75rem'}}>Verificación requerida</h3>
        <p style={{color:'var(--text2)',fontSize:'14px',lineHeight:1.7,marginBottom:'1.5rem'}}>
          {kycStatus === 'pending'
            ? 'Tu verificación está en revisión. Te notificaremos cuando sea aprobada (24-48 horas).'
            : kycStatus === 'rejected'
            ? 'Tu verificación fue rechazada. Por favor reenvía tus documentos con fotos más claras.'
            : 'Debes verificar tu identidad antes de poder hacer retiros. Es un proceso rápido de 24-48 horas.'
          }
        </p>
        {kycStatus === 'pending' ? (
          <div style={{background:'rgba(212,168,67,0.15)',border:'1px solid rgba(212,168,67,0.3)',borderRadius:'10px',padding:'10px 20px',color:'#D4A843',fontSize:'13px',fontWeight:500,display:'inline-block'}}>
            ⏳ Revisión en curso — 24-48 horas
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => navigate('/kyc')}>
            🪪 {kycStatus === 'rejected' ? 'Reenviar documentos' : 'Verificar mi identidad'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-content fade-in">
      <div style={{marginBottom:'1.5rem'}}>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,marginBottom:'4px'}}>Centro de Pagos</h1>
        <p style={{color:'var(--text2)',fontSize:'14px'}}>Retira tus ganancias cuando quieras.</p>
      </div>

      {/* Balance */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',textAlign:'center',marginBottom:'1.5rem'}}>
        <div style={{fontSize:'12px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Saldo disponible</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:'3rem',fontWeight:700,color:'#E8365D',marginBottom:'8px'}}>
          ${(balance?.available || 0).toFixed(2)}
        </div>
        <div style={{fontSize:'13px',color:'var(--text2)',marginBottom:'1.25rem'}}>
          Pendiente: <strong style={{color:'#D4A843'}}>${(balance?.pending || 0).toFixed(2)}</strong>
          &nbsp;·&nbsp;
          Total ganado: <strong>${(balance?.total_earnings || 0).toFixed(2)}</strong>
        </div>
        <div style={{fontSize:'12px',color:'var(--text3)',background:'var(--dark3)',display:'inline-block',padding:'4px 12px',borderRadius:'20px'}}>
          Comisión plataforma: <strong style={{color:'white'}}>15%</strong> · Te quedas con el <strong style={{color:'#22C55E'}}>85%</strong>
        </div>
      </div>

      {/* Velocidad */}
      <div style={{fontSize:'15px',fontWeight:600,marginBottom:'1rem'}}>Velocidad de retiro</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',marginBottom:'1.25rem'}}>
        {SPEED_OPTIONS.map(opt => (
          <div key={opt.id} onClick={() => { setSpeed(opt.id); setMethod(opt.methods[0]); }}
            style={{background:'var(--card)',border:`1px solid ${speed===opt.id?'#E8365D':'var(--border)'}`,borderRadius:'var(--radius-lg)',padding:'1.25rem',cursor:'pointer',textAlign:'center',transition:'all 0.15s',position:'relative'}}>
            {speed===opt.id && (
              <div style={{position:'absolute',top:10,right:12,background:'#E8365D',color:'white',width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700}}>✓</div>
            )}
            <div style={{fontSize:'1.5rem',marginBottom:'8px'}}>{opt.icon}</div>
            <div style={{fontSize:'1rem',fontWeight:700,marginBottom:'3px'}}>{opt.label}</div>
            <div style={{fontSize:'12px',color:'var(--text2)',marginBottom:'8px'}}>{opt.feeNote}</div>
            <div style={{display:'inline-block',padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:600,background:opt.id==='instant'?'rgba(34,197,94,0.15)':opt.id==='fast'?'rgba(96,165,250,0.15)':'rgba(160,160,168,0.15)',color:opt.id==='instant'?'#22C55E':opt.id==='fast'?'#60A5FA':'var(--text2)'}}>
              {opt.badgeLabel}
            </div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'8px'}}>{opt.methods.join(' · ')}</div>
          </div>
        ))}
      </div>

      {/* Formulario */}
      <div className="card-lg" style={{marginBottom:'1.5rem'}}>
        <div style={{fontSize:'14px',fontWeight:600,marginBottom:'1rem'}}>Configurar retiro</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label">Método de pago</label>
            <select className="input" value={method} onChange={e => setMethod(e.target.value)} style={{cursor:'pointer'}}>
              {selectedSpeed?.methods.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{margin:0}}>
            <label className="form-label">Monto a retirar (USD) — mín. $100</label>
            <input className="input" type="number" min="100" max={balance?.available || 0} step="0.01"
              placeholder="100.00" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">
            {method.includes('USDT') ? 'Dirección de billetera' : 'Número de cuenta / teléfono'}
          </label>
          <input className="input" placeholder={
              method.includes('USDT') ? 'Dirección USDT TRC20 (empieza por T...)' :
              method.includes('Binance') ? 'Email o ID de Binance Pay' :
              method.includes('Zelle') ? 'Email o teléfono registrado en Zelle' :
              method.includes('CashApp') ? 'Tu $cashtag de CashApp' :
              method.includes('PayPal') ? 'Email de tu cuenta PayPal' :
              method.includes('Nequi') || method.includes('Daviplata') ? 'Número de teléfono (10 dígitos)' :
              'Número de cuenta bancaria'
            }
            value={destination} onChange={e => setDest(e.target.value)} />
        </div>

        {parseFloat(amount) >= 100 && (
          <div style={{background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'8px',padding:'12px',fontSize:'13px',marginBottom:'1rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
              <span style={{color:'var(--text2)'}}>Monto</span>
              <span>${parseFloat(amount).toFixed(2)}</span>
            </div>
            {fee > 0 && (
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                <span style={{color:'var(--text2)'}}>Comisión instantáneo (1.5%)</span>
                <span style={{color:'#F59E0B'}}>-${fee.toFixed(2)}</span>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:600,borderTop:'1px solid rgba(34,197,94,0.2)',paddingTop:'8px',marginTop:'4px'}}>
              <span>Recibirás</span>
              <span style={{color:'#22C55E'}}>${net.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button className="btn btn-primary btn-lg" style={{width:'100%'}}
          onClick={() => setShowModal(true)}
          disabled={!amount || parseFloat(amount) < 100 || parseFloat(amount) > (balance?.available || 0)}>
          Solicitar retiro {selectedSpeed?.icon}
        </button>
        {parseFloat(amount) > 0 && parseFloat(amount) < 100 && (
          <div style={{textAlign:'center',color:'var(--danger)',fontSize:'12px',marginTop:'6px'}}>Mínimo $100 USD</div>
        )}
      </div>

      {/* Historial */}
      <div className="card">
        <div style={{fontSize:'14px',fontWeight:600,marginBottom:'1rem'}}>Transacciones recientes</div>
        {txs.length > 0 ? (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr>{['Tipo','Descripción','Monto','Neto','Fecha','Estado'].map(h => (
                <th key={h} style={{textAlign:'left',padding:'0 0 10px',fontSize:'11px',color:'var(--text3)',borderBottom:'1px solid var(--border)',textTransform:'uppercase'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {txs.slice(0,20).map(t => (
                <tr key={t.id}>
                  <td style={{padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                    <span style={{background:t.type==='payout'?'rgba(96,165,250,0.15)':t.type==='ppv'?'rgba(232,54,93,0.15)':'rgba(34,197,94,0.15)',color:t.type==='payout'?'#60A5FA':t.type==='ppv'?'#E8365D':'#22C55E',fontSize:'11px',fontWeight:600,padding:'2px 8px',borderRadius:'6px'}}>
                      {t.type}
                    </span>
                  </td>
                  <td style={{padding:'10px 8px',borderBottom:'1px solid var(--border)',color:'var(--text2)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.description}</td>
                  <td style={{padding:'10px 8px',borderBottom:'1px solid var(--border)'}}>${parseFloat(t.amount||0).toFixed(2)}</td>
                  <td style={{padding:'10px 8px',borderBottom:'1px solid var(--border)',color:'#22C55E',fontWeight:600}}>${parseFloat(t.net_amount||0).toFixed(2)}</td>
                  <td style={{padding:'10px 8px',borderBottom:'1px solid var(--border)',color:'var(--text3)',whiteSpace:'nowrap'}}>
                    {format(new Date(t.created_at), 'd MMM yyyy', { locale: es })}
                  </td>
                  <td style={{padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                    <span style={{background:t.status==='completed'?'rgba(34,197,94,0.15)':t.status==='pending'?'rgba(212,168,67,0.15)':'rgba(160,160,168,0.15)',color:t.status==='completed'?'#22C55E':t.status==='pending'?'#D4A843':'var(--text3)',fontSize:'11px',fontWeight:600,padding:'2px 8px',borderRadius:'6px'}}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{textAlign:'center',color:'var(--text3)',padding:'2rem',fontSize:'13px'}}>Aún no hay transacciones</div>
        )}
      </div>

      {/* Modal confirmación */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
          onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{background:'var(--dark2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:400}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',marginBottom:'1.25rem'}}>Confirmar retiro {selectedSpeed?.icon}</h3>
            <div style={{background:'var(--dark3)',borderRadius:'10px',padding:'1rem',marginBottom:'1rem',fontSize:'13px'}}>
              {[['Monto',`$${parseFloat(amount).toFixed(2)}`],['Método',method],['Velocidad',selectedSpeed?.label],['Destino',destination],['Recibirás',`$${net.toFixed(2)}`]].map(([k,v]) => (
                <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:'8px',paddingBottom:k==='Recibirás'?0:'8px',borderBottom:k==='Destino'?'1px solid var(--border)':'none',fontWeight:k==='Recibirás'?600:400}}>
                  <span style={{color:'var(--text2)'}}>{k}</span>
                  <span style={{color:k==='Recibirás'?'#22C55E':'white'}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button className="btn btn-outline" style={{flex:1}} onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{flex:2}} onClick={handleWithdraw} disabled={submitting}>
                {submitting ? <><span className="spinner" style={{width:14,height:14}} /> Procesando...</> : `Confirmar ${selectedSpeed?.icon}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
