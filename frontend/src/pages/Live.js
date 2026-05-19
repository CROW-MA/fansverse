import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const AGORA_APP_ID = 'a772738647ff4b45b6cbdf144d4531e6';

export default function Live() {
  const { channelId } = useParams();
  const { user }      = useNavigate();
  const navigate      = useNavigate();
  const { user: currentUser } = useAuth();

  const [joined, setJoined]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [viewers, setViewers]   = useState(0);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg]           = useState('');
  const [isLive, setIsLive]     = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [creatorInfo, setCreator] = useState(null);

  const clientRef    = useRef(null);
  const localTrackRef = useRef({ audio: null, video: null });
  const localVideoRef = useRef(null);

  const isCreator = currentUser?.username === channelId;

  useEffect(() => {
    // Cargar info del creador
    api.get(`/creators/${channelId}/profile`)
      .then(r => setCreator(r.data.creator))
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => { leaveChannel(); };
  }, [channelId]);

  const joinChannel = async () => {
    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      clientRef.current = client;

      // El creador es host, los fans son audience
      await client.setClientRole(isCreator ? 'host' : 'audience');

      // Token - en producción generar desde backend con SDK de Agora
      const uid = await client.join(AGORA_APP_ID, channelId, null, currentUser?.id?.substring(0,8));

      if (isCreator) {
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTrackRef.current = { audio: audioTrack, video: videoTrack };
        await client.publish([audioTrack, videoTrack]);
        videoTrack.play(localVideoRef.current);
        setIsLive(true);
      }

      client.on('user-published', async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === 'video') remoteUser.videoTrack?.play(localVideoRef.current);
        if (mediaType === 'audio') remoteUser.audioTrack?.play();
      });

      client.on('user-joined', () => setViewers(v => v + 1));
      client.on('user-left',   () => setViewers(v => Math.max(0, v - 1)));

      setJoined(true);
      toast.success(isCreator ? '🔴 Live iniciado!' : '✅ Conectado al live');
    } catch (err) {
      console.error('Agora error:', err);
      toast.error('Error al conectar al live: ' + err.message);
    }
  };

  const leaveChannel = async () => {
    localTrackRef.current.audio?.close();
    localTrackRef.current.video?.close();
    await clientRef.current?.leave();
    setJoined(false);
    setIsLive(false);
  };

  const sendMessage = () => {
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { user: currentUser?.display_name || 'Anónimo', text: msg, time: new Date().toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'}) }]);
    setMsg('');
  };

  const sendTip = async () => {
    const amount = parseFloat(tipAmount);
    if (!amount || amount < 1) return toast.error('Mínimo $1');
    try {
      await api.post('/tips', { creator_id: creatorInfo?.id, amount, message: '💝 Propina en live!' });
      toast.success(`💝 Propina de $${amount} enviada!`);
      setMessages(prev => [...prev, { user: currentUser?.display_name, text: `💝 Envió una propina de $${amount}`, time: '', isSystem: true }]);
      setTipAmount('');
    } catch { toast.error('Error al enviar propina'); }
  };

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><div className="spinner" style={{width:36,height:36}} /></div>;

  return (
    <div style={{height:'calc(100vh - 56px)',display:'grid',gridTemplateColumns:'1fr 320px',background:'#000',overflow:'hidden'}}>

      {/* Video */}
      <div style={{position:'relative',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div ref={localVideoRef} style={{width:'100%',height:'100%',background:'#111'}} />

        {!joined && (
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1rem'}}>
            <div style={{fontSize:'4rem',marginBottom:'0.5rem'}}>🎥</div>
            <h2 style={{fontFamily:'var(--font-display)',color:'white',fontSize:'1.5rem'}}>
              {isCreator ? 'Iniciar tu Live' : `Live de ${creatorInfo?.display_name || channelId}`}
            </h2>
            {creatorInfo?.avatar_url && (
              <img src={creatorInfo.avatar_url} alt="" style={{width:80,height:80,borderRadius:'50%',objectFit:'cover',border:'3px solid #E8365D'}} />
            )}
            <button className="btn btn-primary btn-lg" onClick={joinChannel} style={{marginTop:'0.5rem'}}>
              {isCreator ? '🔴 Iniciar Live' : '▶️ Unirme al Live'}
            </button>
          </div>
        )}

        {/* HUD del live */}
        {joined && (
          <>
            <div style={{position:'absolute',top:16,left:16,display:'flex',gap:'10px',alignItems:'center'}}>
              {isLive && (
                <span style={{background:'#E8365D',color:'white',fontSize:'12px',fontWeight:700,padding:'4px 10px',borderRadius:'6px',display:'flex',alignItems:'center',gap:'4px'}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:'white',display:'inline-block',animation:'pulse 1s infinite'}} />
                  EN VIVO
                </span>
              )}
              <span style={{background:'rgba(0,0,0,0.6)',color:'white',fontSize:'12px',padding:'4px 10px',borderRadius:'6px'}}>
                👁 {viewers} viendo
              </span>
            </div>
            {isCreator && (
              <button onClick={leaveChannel}
                style={{position:'absolute',top:16,right:16,background:'rgba(239,68,68,0.8)',border:'none',color:'white',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:600}}>
                ⏹ Terminar Live
              </button>
            )}
          </>
        )}
      </div>

      {/* Chat y tips */}
      <div style={{background:'var(--dark2)',border:'none',borderLeft:'1px solid var(--border)',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{padding:'1rem',borderBottom:'1px solid var(--border)'}}>
          <div style={{fontWeight:600,fontSize:'14px'}}>Chat en vivo</div>
          <div style={{fontSize:'11px',color:'var(--text3)'}}>{viewers} espectadores</div>
        </div>

        {/* Mensajes */}
        <div style={{flex:1,overflowY:'auto',padding:'0.75rem',display:'flex',flexDirection:'column',gap:'8px'}}>
          {messages.length === 0 && (
            <div style={{textAlign:'center',color:'var(--text3)',fontSize:'13px',padding:'2rem 0'}}>
              Los mensajes aparecerán aquí
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{fontSize:'13px',lineHeight:1.5}}>
              {m.isSystem
                ? <div style={{background:'rgba(212,168,67,0.15)',borderRadius:'6px',padding:'6px 10px',color:'#D4A843',fontWeight:500}}>{m.text}</div>
                : <><strong style={{color:'#E8365D'}}>{m.user}</strong>{' '}<span style={{color:'var(--text)'}}>{m.text}</span>{m.time&&<span style={{color:'var(--text3)',fontSize:'10px',marginLeft:'4px'}}>{m.time}</span>}</>
              }
            </div>
          ))}
        </div>

        {/* Tips */}
        {!isCreator && currentUser && (
          <div style={{padding:'8px',borderTop:'1px solid var(--border)',background:'rgba(212,168,67,0.05)'}}>
            <div style={{fontSize:'11px',color:'#D4A843',marginBottom:'6px',fontWeight:600}}>💝 Enviar propina en live</div>
            <div style={{display:'flex',gap:'4px',marginBottom:'6px'}}>
              {[1,5,10].map(a => (
                <button key={a} onClick={() => setTipAmount(String(a))}
                  style={{flex:1,padding:'5px',borderRadius:'6px',border:`1px solid ${tipAmount==a?'#D4A843':'var(--border)'}`,background:tipAmount==a?'rgba(212,168,67,0.2)':'transparent',color:tipAmount==a?'#D4A843':'var(--text3)',cursor:'pointer',fontSize:'12px',fontFamily:'var(--font-body)'}}>
                  ${a}
                </button>
              ))}
              <input
                style={{flex:2,background:'var(--dark3)',border:'1px solid var(--border)',borderRadius:'6px',padding:'5px 8px',fontSize:'12px',color:'white',outline:'none'}}
                type="number" min="1" placeholder="Otro..."
                value={tipAmount} onChange={e=>setTipAmount(e.target.value)} />
            </div>
            <button className="btn btn-gold btn-full btn-sm" onClick={sendTip} disabled={!tipAmount}>
              💝 Enviar propina
            </button>
          </div>
        )}

        {/* Input chat */}
        <div style={{padding:'8px',borderTop:'1px solid var(--border)',display:'flex',gap:'6px'}}>
          <input
            style={{flex:1,background:'var(--dark3)',border:'1px solid var(--border)',borderRadius:'20px',padding:'8px 12px',fontSize:'13px',color:'white',outline:'none',fontFamily:'var(--font-body)'}}
            placeholder={currentUser ? 'Escribe un mensaje...' : 'Inicia sesión para comentar'}
            value={msg}
            onChange={e=>setMsg(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&sendMessage()}
            disabled={!currentUser}
          />
          <button onClick={sendMessage} disabled={!msg.trim()}
            style={{background:msg.trim()?'#E8365D':'var(--dark3)',border:'none',color:'white',width:36,height:36,borderRadius:'50%',cursor:msg.trim()?'pointer':'not-allowed',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
