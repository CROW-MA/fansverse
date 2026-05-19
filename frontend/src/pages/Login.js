import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthLayout = ({ children, title, sub }) => (
  <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--dark)',padding:'1.5rem'}}>
    <div style={{width:'100%',maxWidth:'420px'}}>
      <div style={{textAlign:'center',marginBottom:'2rem'}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:'2rem',fontWeight:700,background:'linear-gradient(135deg,#E8365D,#D4A843)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:'0.5rem'}}>FansVerse</div>
        <h1 style={{fontSize:'1.3rem',fontWeight:600,marginBottom:'4px'}}>{title}</h1>
        <p style={{fontSize:'13px',color:'var(--text2)'}}>{sub}</p>
      </div>
      <div className="card-lg">{children}</div>
    </div>
  </div>
);

// Pantalla de verificación pendiente
function VerifyEmailScreen({ email, onBack }) {
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setSent(true);
      toast.success('Email reenviado ✓');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al reenviar');
    } finally { setResending(false); }
  };

  return (
    <AuthLayout title="Verifica tu email" sub="Casi listo!">
      <div style={{textAlign:'center',padding:'1rem 0'}}>
        <div style={{fontSize:'3rem',marginBottom:'1rem'}}>📧</div>
        <p style={{fontSize:'14px',color:'var(--text2)',marginBottom:'1rem',lineHeight:1.7}}>
          Te enviamos un enlace de verificación a:<br/>
          <strong style={{color:'var(--text)'}}>{email}</strong>
        </p>
        <p style={{fontSize:'13px',color:'var(--text3)',marginBottom:'1.5rem',lineHeight:1.6}}>
          Revisa tu bandeja de entrada (y la carpeta de spam).<br/>
          Haz clic en el enlace para activar tu cuenta.
        </p>
        <div style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'10px',padding:'12px',marginBottom:'1.5rem',fontSize:'13px',color:'#60A5FA'}}>
          💡 Una vez verificado tu email, podrás iniciar sesión normalmente.
        </div>
        {!sent ? (
          <button className="btn btn-outline btn-full" onClick={resend} disabled={resending}>
            {resending ? <><span className="spinner" style={{width:14,height:14}} /> Reenviando...</> : '📨 Reenviar email de verificación'}
          </button>
        ) : (
          <div style={{color:'var(--success)',fontSize:'13px',marginBottom:'1rem'}}>✅ Email reenviado. Revisa tu bandeja.</div>
        )}
        <button className="btn btn-ghost btn-full" style={{marginTop:'8px'}} onClick={onBack}>
          ← Volver al login
        </button>
      </div>
    </AuthLayout>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]             = useState({ email:'', password:'' });
  const [loading, setLoading]       = useState(false);
  const [pendingEmail, setPending]  = useState(null);

  if (pendingEmail) return <VerifyEmailScreen email={pendingEmail} onBack={() => setPending(null)} />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Completa todos los campos');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`¡Bienvenido, ${user.display_name || user.username}!`);
      navigate(user.role === 'creator' ? '/dashboard' : '/feed');
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        setPending(data.email || form.email);
      } else {
        toast.error(data?.error || 'Error al iniciar sesión');
      }
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Iniciar sesión" sub="Accede a tu cuenta FansVerse">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="input" type="email" placeholder="tu@email.com"
            value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required />
        </div>
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input className="input" type="password" placeholder="••••••••"
            value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required />
        </div>
        <div style={{textAlign:'right',marginBottom:'1rem'}}>
          <Link to="/forgot-password" style={{fontSize:'12px',color:'var(--rose)'}}>¿Olvidaste tu contraseña?</Link>
        </div>
        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
          {loading ? <><span className="spinner" style={{width:16,height:16}} /> Ingresando...</> : 'Iniciar sesión'}
        </button>
      </form>
      <div className="divider" />
      <p style={{textAlign:'center',fontSize:'13px',color:'var(--text2)'}}>
        ¿No tienes cuenta? <Link to="/register" style={{color:'var(--rose)',fontWeight:500}}>Regístrate gratis</Link>
      </p>
    </AuthLayout>
  );
}

export function Register() {
  const navigate  = useNavigate();
  const [form, setForm]           = useState({ email:'', username:'', password:'', display_name:'', role:'fan', category:'general' });
  const [loading, setLoading]     = useState(false);
  const [registered, setRegistered] = useState(null); // email registrado

  if (registered) return <VerifyEmailScreen email={registered} onBack={() => setRegistered(null)} />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.username || !form.password) return toast.error('Completa todos los campos');
    if (form.password.length < 8) return toast.error('La contraseña debe tener mínimo 8 caracteres');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      setRegistered(form.email);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear cuenta');
    } finally { setLoading(false); }
  };

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  return (
    <AuthLayout title="Crear cuenta" sub="Empieza a monetizar tu contenido hoy">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'1.25rem'}}>
        {['fan','creator'].map(r => (
          <button key={r} type="button" onClick={() => setForm(f=>({...f,role:r}))}
            style={{padding:'10px',borderRadius:'9px',border:'1px solid',borderColor:form.role===r?'var(--rose)':'var(--border)',background:form.role===r?'var(--rose-light)':'transparent',color:form.role===r?'var(--rose)':'var(--text2)',cursor:'pointer',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',transition:'all 0.15s'}}>
            {r==='fan'?'👤 Soy fan':'✨ Soy creador'}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit}>

        {/* Categoría */}
        <div className="form-group">
          <label className="form-label">¿Cómo te identificas?</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
            {[
              ['general',    '🔥 General'],
              ['mujer',      '👩 Mujer'],
              ['hombre',     '👨 Hombre'],
              ['pareja',     '💑 Pareja'],
              ['trans',      '🏳️‍⚧️ Trans'],
              ['gay',        '🏳️‍🌈 Gay'],
              ['lesbi',      '💜 Lesbiana'],
              ['no_binario', '⚧️ No Binario'],
            ].map(([val, label]) => (
              <button key={val} type="button"
                onClick={() => setForm(f => ({...f, category: val}))}
                style={{
                  padding:'7px', borderRadius:'8px', border:'1px solid',
                  borderColor: form.category===val ? 'var(--rose)' : 'var(--border)',
                  background: form.category===val ? 'var(--rose-light)' : 'transparent',
                  color: form.category===val ? 'var(--rose)' : 'var(--text2)',
                  cursor:'pointer', fontSize:'12px', fontWeight: form.category===val ? 600 : 400,
                  fontFamily:'var(--font-body)', transition:'all 0.15s'
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Nombre para mostrar</label>
          <input className="input" placeholder="Tu nombre público" value={form.display_name} onChange={set('display_name')} />
        </div>
        <div className="form-group">
          <label className="form-label">Nombre de usuario</label>
          <input className="input" placeholder="@usuario" value={form.username} onChange={set('username')} required />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="input" type="email" placeholder="tu@email.com" value={form.email} onChange={set('email')} required />
        </div>
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input className="input" type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} required />
        </div>
        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{marginTop:'0.5rem'}}>
          {loading ? <><span className="spinner" style={{width:16,height:16}} /> Creando cuenta...</> : 'Crear cuenta gratis'}
        </button>
        <p style={{fontSize:'11px',color:'var(--text3)',textAlign:'center',marginTop:'0.75rem'}}>
          Al registrarte aceptas nuestros <a href="/terms" style={{color:'var(--rose)'}}>Términos</a> y <a href="/privacy" style={{color:'var(--rose)'}}>Privacidad</a>
        </p>
      </form>
      <div className="divider" />
      <p style={{textAlign:'center',fontSize:'13px',color:'var(--text2)'}}>
        ¿Ya tienes cuenta? <Link to="/login" style={{color:'var(--rose)',fontWeight:500}}>Iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
