import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const goHome = () => {
    if (user) {
      navigate(user.role === 'creator' ? '/dashboard' : '/feed', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--dark)',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{fontSize:'5rem',marginBottom:'1rem'}}>😕</div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '3rem',
        fontWeight: 700,
        background: 'linear-gradient(135deg,#E8365D,#D4A843)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '0.5rem'
      }}>
        404
      </h1>
      <h2 style={{fontSize:'1.3rem',fontWeight:600,marginBottom:'0.75rem'}}>
        Página no encontrada
      </h2>
      <p style={{color:'var(--text2)',fontSize:'14px',marginBottom:'2rem',maxWidth:400,lineHeight:1.7}}>
        La página que buscas no existe o no tienes permiso para verla.
      </p>
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap',justifyContent:'center'}}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-outline">
          ← Volver atrás
        </button>
        <button
          onClick={goHome}
          className="btn btn-primary">
          🏠 Ir al inicio
        </button>
      </div>
    </div>
  );
}
