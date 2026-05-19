import React from 'react';

export default function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--dark)', gap: '1rem'
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700,
        background: 'linear-gradient(135deg, #E8365D, #D4A843)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
      }}>FansVerse</div>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );
}
