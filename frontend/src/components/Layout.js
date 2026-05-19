import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import styles from './Layout.module.css';

const NavItem = ({ to, icon, label, badge }) => (
  <NavLink to={to} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
    <span className={styles.navIcon}>{icon}</span>
    <span className={styles.navLabel}>{label}</span>
    {badge > 0 && <span className={styles.badge}>{badge > 99 ? '99+' : badge}</span>}
  </NavLink>
);

export default function Layout({ children }) {
  const { user, logout }                = useAuth();
  const { connected }                   = useSocket();
  const navigate                        = useNavigate();
  const [menuOpen, setMenuOpen]         = useState(false);
  const [unreadMsgs, setUnreadMsgs]     = useState(0);

  const isCreator = user?.role === 'creator' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  // Cargar mensajes no leídos al iniciar
  useEffect(() => {
    if (!user) return;
    api.get('/messages/conversations')
      .then(r => {
        const total = (r.data.conversations || []).reduce((sum, c) => sum + (parseInt(c.unread_count) || 0), 0);
        setUnreadMsgs(total);
      })
      .catch(() => {});
  }, [user]);

  // Escuchar mensajes nuevos en tiempo real
  useEffect(() => {
    const handler = () => setUnreadMsgs(n => n + 1);
    window.addEventListener('fv:new_message', handler);
    return () => window.removeEventListener('fv:new_message', handler);
  }, []);

  // Resetear badge cuando entra a mensajes
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.location.pathname.startsWith('/messages')) {
        setUnreadMsgs(0);
      }
    };
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${menuOpen ? styles.open : ''}`}>
        <div className={styles.logo} onClick={() => navigate('/')}>
          <span className={styles.logoText}>FansVerse</span>
          <span className={`${styles.dot} ${connected ? styles.online : ''}`} />
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>
            <p className={styles.navSectionLabel}>Descubrir</p>
            <NavItem to="/explore" icon="🔥" label="Explorar" />
            <NavItem to="/search"  icon="🔍" label="Buscar" />
          </div>

          {user && (
            <div className={styles.navSection}>
              <p className={styles.navSectionLabel}>Tu espacio</p>
              <NavItem to="/feed"     icon="📰" label="Feed" />
              <NavItem to="/messages" icon="💬" label="Mensajes" badge={unreadMsgs} />
              <NavItem to="/rewards"  icon="🏆" label="Recompensas" />
            </div>
          )}

          {isAdmin && (
            <div className={styles.navSection}>
              <p className={styles.navSectionLabel}>Admin</p>
              <NavItem to="/admin" icon="⚙️" label="Panel Admin" />
            </div>
          )}
          {isCreator && (
            <div className={styles.navSection}>
              <p className={styles.navSectionLabel}>Creador</p>
              <NavItem to="/dashboard"  icon="📊" label="Dashboard" />
              <NavItem to="/content"    icon="🎬" label="Contenido" />
              <NavItem to="/payouts"    icon="💸" label="Pagos" />
              <NavItem to="/analytics"  icon="📈" label="Analytics" />
              <NavItem to="/kyc"        icon="🪪" label="Verificación" />
              <NavItem to="/migrate"    icon="🚀" label="Migrar desde OF" />
            </div>
          )}
        </nav>

        <div className={styles.sidebarBottom}>
          {user ? (
            <>
              <NavLink to={`/${user.username}`} className={styles.profileLink}>
                <div className={styles.avatarSm}>
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt={user.username} />
                    : user.username?.[0]?.toUpperCase()}
                </div>
                <div className={styles.profileInfo}>
                  <span className={styles.profileName}>{user.display_name || user.username}</span>
                  <span className={styles.profileRole}>{user.role === 'creator' ? '✨ Creador' : '👤 Fan'}</span>
                </div>
              </NavLink>
              <button className={styles.settingsLink} onClick={() => navigate('/settings')}>⚙️</button>
              <button className={styles.logoutBtn} onClick={logout} title="Cerrar sesión">↩</button>
            </>
          ) : (
            <div className={styles.authButtons}>
              <button className="btn btn-outline btn-sm btn-full" onClick={() => navigate('/login')}>Iniciar sesión</button>
              <button className="btn btn-primary btn-sm btn-full" onClick={() => navigate('/register')} style={{marginTop:'8px'}}>Registrarse</button>
            </div>
          )}
        </div>
      </aside>

      <header className={styles.topbar}>
        <button className={styles.menuToggle} onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? '✕' : '☰'}
        </button>
        <span className={styles.logoMobile} style={{cursor:'pointer'}} onClick={() => navigate('/')}>FansVerse</span>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          {user && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setUnreadMsgs(0); navigate('/messages'); }}>
              💬 {unreadMsgs > 0 && <span className="badge badge-rose">{unreadMsgs}</span>}
            </button>
          )}
        </div>
      </header>

      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
