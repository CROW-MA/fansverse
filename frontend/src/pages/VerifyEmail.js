import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function VerifyEmail() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }
    api.post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [params]);

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--dark)',padding:'2rem'}}>
      <div style={{textAlign:'center',maxWidth:400}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,background:'linear-gradient(135deg,#E8365D,#D4A843)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:'2rem'}}>FansVerse</div>
        {status === 'verifying' && (
          <>
            <div className="spinner" style={{width:40,height:40,margin:'0 auto 1rem'}} />
            <p style={{color:'var(--text2)'}}>Verificando tu email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{fontSize:'4rem',marginBottom:'1rem'}}>🎉</div>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.5rem',marginBottom:'0.5rem'}}>¡Email verificado!</h2>
            <p style={{color:'var(--text2)',marginBottom:'1.5rem'}}>Tu cuenta está activa. Ya puedes iniciar sesión.</p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>Iniciar sesión</button>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{fontSize:'4rem',marginBottom:'1rem'}}>❌</div>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.5rem',marginBottom:'0.5rem'}}>Enlace inválido</h2>
            <p style={{color:'var(--text2)',marginBottom:'1.5rem'}}>El enlace expiró o ya fue usado.</p>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>Ir al login</button>
          </>
        )}
      </div>
    </div>
  );
}
