import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Home.module.css';

const stats = [
  { value: '85%', label: 'Para el creador', sub: 'OnlyFans solo da 80%' },
  { value: '2h',  label: 'Tiempo de pago', sub: 'OnlyFans tarda 7 días' },
  { value: '$0',  label: 'Para empezar',   sub: 'Completamente gratis' },
  { value: '24/7',label: 'Soporte',        sub: 'Siempre disponible' },
];

const features = [
  { icon:'💰', title:'Más dinero para ti',      desc:'85% de cada pago directo a tu bolsillo. Sin sorpresas ni deducciones ocultas.' },
  { icon:'⚡', title:'Cobros instantáneos',     desc:'Retira en 2 horas a Nequi, Bancolombia, PSE o USDT. No más esperas de semanas.' },
  { icon:'🎬', title:'Lives en tiempo real',    desc:'Conéctate con tus fans en vivo, recibe propinas durante el stream.' },
  { icon:'📱', title:'Historias y PPV',         desc:'Publica historias de 24h y contenido exclusivo de pago directo en mensajes.' },
  { icon:'🔒', title:'100% seguro',             desc:'Protección anti-descarga, verificación de identidad y soporte contra abuso.' },
  { icon:'🌎', title:'Hecho para LATAM y USA',  desc:'Pagos locales en Colombia, México, Argentina y pagos en USD para creadores en USA.' },
];

const testimonials = [
  { name:'Valentina', country:'🇨🇴 Colombia', avatar:'V', text:'Migré de OnlyFans y en el primer mes gané 30% más solo por la diferencia de comisión. Los pagos llegan rapidísimo a mi Nequi.', earnings:'+30%' },
  { name:'Sofía',     country:'🇲🇽 México',   avatar:'S', text:'Lo que más me gusta es que puedo hacer lives y recibir propinas en tiempo real. Mis fans se sienten más conectados.', earnings:'+45%' },
  { name:'Isabella',  country:'🇺🇸 USA',       avatar:'I', text:'Finally a platform that actually cares about creators. Instant payouts changed everything for me.', earnings:'+25%' },
];

const faqs = [
  { q:'¿Cuánto cobra FansVerse de comisión?',           a:'Solo el 15%. Tú te quedas con el 85% de cada pago. OnlyFans cobra 20%.' },
  { q:'¿Cuándo recibo mi dinero?',                     a:'En 2 horas con retiro instantáneo. También puedes retirar en 24h sin costo adicional.' },
  { q:'¿Qué métodos de pago aceptan?',                 a:'Nequi, Bancolombia, PSE, transferencia bancaria y USDT para pagos internacionales.' },
  { q:'¿Necesito verificar mi identidad?',             a:'Para crear contenido sí, para protegerte a ti y a tus fans. El proceso toma menos de 24h.' },
  { q:'¿Puedo traer a mis fans de OnlyFans?',          a:'Sí. Simplemente comparte tu perfil de FansVerse con tus seguidores actuales.' },
  { q:'¿Qué pasa si alguien descarga mi contenido?',  a:'Tenemos protección anti-descarga y marcas de agua automáticas en cada imagen.' },
];

export default function Home() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [email, setEmail] = useState('');

  const goRegister = (role) => navigate(`/register?role=${role}`);

  return (
    <div style={{background:'var(--dark)',color:'var(--text)',fontFamily:'var(--font-body)',overflowX:'hidden'}}>

      {/* NAV */}
      <nav style={{position:'sticky',top:0,zIndex:100,background:'rgba(13,13,15,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid var(--border)',padding:'0 2rem'}}>
        <div style={{maxWidth:1100,margin:'0 auto',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:'1.5rem',fontWeight:700,background:'linear-gradient(135deg,#E8365D,#D4A843)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',cursor:'pointer'}}
            onClick={() => navigate('/')}>
            FansVerse
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/explore')}>Explorar</button>
            {user ? (
              <>
                <button className="btn btn-outline btn-sm" onClick={() => navigate(user.role==='creator'?'/dashboard':'/feed')}>
                  {user.role==='creator'?'Mi Dashboard':'Mi Feed'}
                </button>
                <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'4px 12px',borderRadius:'20px',background:'var(--dark3)',border:'1px solid var(--border)',cursor:'pointer'}}
                  onClick={() => navigate('/settings')}>
                  <div style={{width:24,height:24,borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,color:'white'}}>
                    {user.avatar_url ? <img src={user.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : user.username?.[0]?.toUpperCase()}
                  </div>
                  <span style={{fontSize:'13px',fontWeight:500}}>{user.display_name||user.username}</span>
                </div>
              </>
            ) : (
              <>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/login')}>Iniciar sesión</button>
                <button className="btn btn-primary btn-sm" onClick={() => goRegister('creator')}>Empezar gratis</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{minHeight:'90vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'4rem 2rem',background:'radial-gradient(ellipse at 50% 0%, rgba(232,54,93,0.12) 0%, transparent 70%), radial-gradient(ellipse at 80% 50%, rgba(212,168,67,0.08) 0%, transparent 60%)',textAlign:'center',position:'relative',overflow:'hidden'}}>
        {/* Fondo animado */}
        <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
          {[...Array(5)].map((_,i) => (
            <div key={i} style={{position:'absolute',borderRadius:'50%',background:'radial-gradient(circle,rgba(232,54,93,0.06),transparent)',width:400+i*100,height:400+i*100,top:`${10+i*15}%`,left:`${-10+i*25}%`,animation:`float ${8+i*2}s ease-in-out infinite alternate`}} />
          ))}
        </div>

        <div style={{maxWidth:800,position:'relative',zIndex:1}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(232,54,93,0.12)',border:'1px solid rgba(232,54,93,0.25)',borderRadius:'20px',padding:'6px 16px',fontSize:'13px',color:'#E8365D',fontWeight:600,marginBottom:'1.5rem'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#E8365D',display:'inline-block',animation:'pulse 1.5s infinite'}} />
            La alternativa a OnlyFans hecha para creadores de LATAM y USA
          </div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(2.5rem,6vw,4rem)',fontWeight:800,lineHeight:1.1,marginBottom:'1.5rem'}}>
            Gana más.<br/>
            <span style={{background:'linear-gradient(135deg,#E8365D,#D4A843)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
              Cobra más rápido.
            </span><br/>
            Sin limitaciones.
          </h1>
          <p style={{fontSize:'clamp(1rem,2.5vw,1.2rem)',color:'var(--text2)',marginBottom:'2.5rem',lineHeight:1.7,maxWidth:600,margin:'0 auto 2.5rem'}}>
            FansVerse te da el <strong style={{color:'white'}}>85% de cada pago</strong>, cobros en <strong style={{color:'white'}}>2 horas</strong> a tu cuenta y todas las herramientas que necesitas para monetizar tu contenido.
          </p>
          <div style={{display:'flex',gap:'1rem',justifyContent:'center',flexWrap:'wrap',marginBottom:'1rem'}}>
            <button
              onClick={() => goRegister('creator')}
              style={{padding:'14px 32px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#E8365D,#c42d4f)',color:'white',fontSize:'16px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)',boxShadow:'0 8px 32px rgba(232,54,93,0.35)',transition:'all 0.2s'}}
              onMouseEnter={e=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 12px 40px rgba(232,54,93,0.45)';}}
              onMouseLeave={e=>{e.target.style.transform='none';e.target.style.boxShadow='0 8px 32px rgba(232,54,93,0.35)';}}>
              🚀 Crear mi cuenta gratis
            </button>
            <button
              onClick={() => navigate('/explore')}
              style={{padding:'14px 32px',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.05)',color:'white',fontSize:'16px',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-body)',backdropFilter:'blur(10px)',transition:'all 0.2s'}}
              onMouseEnter={e=>e.target.style.background='rgba(255,255,255,0.1)'}
              onMouseLeave={e=>e.target.style.background='rgba(255,255,255,0.05)'}>
              Explorar creadores →
            </button>
          </div>
          <p style={{fontSize:'12px',color:'var(--text3)'}}>✓ Gratis para siempre &nbsp;·&nbsp; ✓ Sin tarjeta de crédito &nbsp;·&nbsp; ✓ Listo en 2 minutos</p>
        </div>
      </section>

      {/* STATS */}
      <section style={{padding:'4rem 2rem',background:'var(--card)',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'2rem',textAlign:'center'}}>
          {stats.map(s => (
            <div key={s.value}>
              <div style={{fontFamily:'var(--font-display)',fontSize:'3rem',fontWeight:800,background:'linear-gradient(135deg,#E8365D,#D4A843)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:'4px'}}>{s.value}</div>
              <div style={{fontWeight:600,fontSize:'15px',marginBottom:'4px'}}>{s.label}</div>
              <div style={{fontSize:'12px',color:'var(--text3)'}}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARATIVA VS ONLYFANS */}
      <section style={{padding:'5rem 2rem'}}>
        <div style={{maxWidth:800,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'3rem'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(1.8rem,4vw,2.5rem)',fontWeight:700,marginBottom:'0.5rem'}}>¿Por qué FansVerse?</h2>
            <p style={{color:'var(--text2)'}}>Comparación honesta con la competencia</p>
          </div>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',background:'var(--dark3)',padding:'1rem'}}>
              <div style={{fontSize:'13px',color:'var(--text3)'}}>Característica</div>
              <div style={{textAlign:'center',fontWeight:700,color:'#E8365D',fontSize:'15px'}}>FansVerse ✓</div>
              <div style={{textAlign:'center',fontWeight:600,color:'var(--text3)',fontSize:'15px'}}>OnlyFans</div>
            </div>
            {[
              ['Comisión de la plataforma',    '15% (tú ganas 85%)',    '20% (ganas 80%)'],
              ['Tiempo de pago',               '2 horas',               '7-21 días'],
              ['Pagos en LATAM',               '✅ Nequi, PSE, Banc.',  '❌ Solo tarjetas USA/EU'],
              ['Lives con propinas',           '✅ Incluido',           '❌ No disponible'],
              ['Historias 24h',                '✅ Incluido',           '❌ No disponible'],
              ['PPV en mensajes directos',     '✅ Incluido',           '✅ Incluido'],
              ['Sistema de puntos/rewards',    '✅ Incluido',           '❌ No disponible'],
              ['Soporte en español',           '✅ 24/7',               '⚠️ Solo inglés'],
            ].map(([feat, fv, of]) => (
              <div key={feat} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',padding:'1rem',borderTop:'1px solid var(--border)',alignItems:'center'}}>
                <div style={{fontSize:'13px',color:'var(--text2)'}}>{feat}</div>
                <div style={{textAlign:'center',fontSize:'13px',color:'#22C55E',fontWeight:500}}>{fv}</div>
                <div style={{textAlign:'center',fontSize:'13px',color:'var(--text3)'}}>{of}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{padding:'5rem 2rem',background:'var(--card)',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'3rem'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(1.8rem,4vw,2.5rem)',fontWeight:700,marginBottom:'0.5rem'}}>Todo lo que necesitas</h2>
            <p style={{color:'var(--text2)'}}>Herramientas profesionales para creadores serios</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1.5rem'}}>
            {features.map(f => (
              <div key={f.title} style={{background:'var(--dark2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',transition:'all 0.2s',cursor:'default'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(232,54,93,0.4)';e.currentTarget.style.transform='translateY(-4px)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none';}}>
                <div style={{fontSize:'2rem',marginBottom:'12px'}}>{f.icon}</div>
                <div style={{fontWeight:600,fontSize:'15px',marginBottom:'8px'}}>{f.title}</div>
                <div style={{fontSize:'13px',color:'var(--text2)',lineHeight:1.6}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section style={{padding:'5rem 2rem'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'3rem'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(1.8rem,4vw,2.5rem)',fontWeight:700,marginBottom:'0.5rem'}}>Creadores que ya confían en FansVerse</h2>
            <p style={{color:'var(--text2)'}}>Resultados reales de nuestra comunidad</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1.5rem'}}>
            {testimonials.map(t => (
              <div key={t.name} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem'}}>
                <div style={{display:'flex',gap:'12px',alignItems:'center',marginBottom:'1rem'}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#E8365D,#D4A843)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:700,color:'white',flexShrink:0}}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{fontWeight:600}}>{t.name}</div>
                    <div style={{fontSize:'12px',color:'var(--text3)'}}>{t.country}</div>
                  </div>
                  <div style={{marginLeft:'auto',background:'rgba(34,197,94,0.15)',color:'#22C55E',fontSize:'13px',fontWeight:700,padding:'4px 10px',borderRadius:'8px'}}>
                    {t.earnings}
                  </div>
                </div>
                <p style={{fontSize:'13px',color:'var(--text2)',lineHeight:1.7,fontStyle:'italic'}}>"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{padding:'6rem 2rem',background:'linear-gradient(135deg,rgba(232,54,93,0.12),rgba(212,168,67,0.08))',borderTop:'1px solid var(--border)',textAlign:'center'}}>
        <div style={{maxWidth:600,margin:'0 auto'}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(2rem,5vw,3rem)',fontWeight:800,marginBottom:'1rem'}}>
            Empieza a ganar más<br/>
            <span style={{background:'linear-gradient(135deg,#E8365D,#D4A843)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>desde hoy</span>
          </h2>
          <p style={{color:'var(--text2)',fontSize:'16px',marginBottom:'2rem',lineHeight:1.7}}>
            Únete a los creadores que ya están ganando más con FansVerse. Gratis para siempre, sin tarjeta de crédito.
          </p>
          <div style={{display:'flex',gap:'8px',maxWidth:400,margin:'0 auto 1.5rem'}}>
            <input
              style={{flex:1,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'10px',padding:'12px 16px',fontSize:'14px',color:'white',outline:'none',fontFamily:'var(--font-body)'}}
              placeholder="Tu email..."
              value={email}
              onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&navigate(`/register?email=${email}&role=creator`)}
            />
            <button
              onClick={() => navigate(`/register?email=${email}&role=creator`)}
              style={{padding:'12px 20px',borderRadius:'10px',border:'none',background:'#E8365D',color:'white',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)',whiteSpace:'nowrap'}}>
              Empezar →
            </button>
          </div>
          <div style={{display:'flex',gap:'1.5rem',justifyContent:'center',fontSize:'13px',color:'var(--text3)',flexWrap:'wrap'}}>
            <span>✓ 85% para ti</span>
            <span>✓ Cobros en 2h</span>
            <span>✓ Sin contrato</span>
            <span>✓ Soporte 24/7</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{padding:'5rem 2rem',borderTop:'1px solid var(--border)'}}>
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(1.8rem,4vw,2.5rem)',fontWeight:700,textAlign:'center',marginBottom:'3rem'}}>Preguntas frecuentes</h2>
          {faqs.map((f,i) => (
            <div key={i} style={{borderBottom:'1px solid var(--border)',marginBottom:'0'}}>
              <button
                onClick={() => setOpenFaq(openFaq===i?null:i)}
                style={{width:'100%',background:'none',border:'none',color:'var(--text)',padding:'1.25rem 0',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',fontSize:'15px',fontWeight:500,fontFamily:'var(--font-body)',textAlign:'left',gap:'1rem'}}>
                {f.q}
                <span style={{flexShrink:0,fontSize:'18px',transition:'transform 0.2s',transform:openFaq===i?'rotate(45deg)':'none',color:'#E8365D'}}>+</span>
              </button>
              {openFaq===i && (
                <div style={{paddingBottom:'1.25rem',color:'var(--text2)',fontSize:'14px',lineHeight:1.7}}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{padding:'3rem 2rem',borderTop:'1px solid var(--border)',background:'var(--card)'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'2rem',marginBottom:'2rem'}}>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',fontWeight:700,background:'linear-gradient(135deg,#E8365D,#D4A843)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:'8px'}}>FansVerse</div>
            <p style={{fontSize:'13px',color:'var(--text3)',lineHeight:1.6}}>La plataforma de creadores de contenido #1 en LATAM y USA.</p>
          </div>
          <div>
            <div style={{fontWeight:600,marginBottom:'10px',fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--text3)'}}>Plataforma</div>
            {['Explorar creadores','Cómo funciona','Precios','Para creadores'].map(l => (
              <div key={l} style={{fontSize:'13px',color:'var(--text2)',marginBottom:'6px',cursor:'pointer'}} onClick={()=>navigate('/explore')}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{fontWeight:600,marginBottom:'10px',fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--text3)'}}>Soporte</div>
            {['Centro de ayuda','Contacto','Reportar abuso','Verificación'].map(l => (
              <div key={l} style={{fontSize:'13px',color:'var(--text2)',marginBottom:'6px',cursor:'pointer'}}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{fontWeight:600,marginBottom:'10px',fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--text3)'}}>Legal</div>
            {['Términos de servicio','Política de privacidad','Política de cookies','Verificación de edad'].map(l => (
              <div key={l} style={{fontSize:'13px',color:'var(--text2)',marginBottom:'6px',cursor:'pointer'}}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{borderTop:'1px solid var(--border)',paddingTop:'1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem',fontSize:'12px',color:'var(--text3)'}}>
          <span>© 2025 FansVerse. Todos los derechos reservados.</span>
          <span>🔞 Solo para mayores de 18 años · Contenido para adultos</span>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
