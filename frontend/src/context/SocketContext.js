import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const token = localStorage.getItem('fv_token');
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('new_message', (msg) => {
      setUnreadMessages(n => n + 1);
      // Dispatch custom event for message pages to listen
      window.dispatchEvent(new CustomEvent('fv:new_message', { detail: msg }));
    });

    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev.slice(0, 49)]);
      window.dispatchEvent(new CustomEvent('fv:notification', { detail: notif }));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const emit = (event, data) => socketRef.current?.emit(event, data);
  const clearUnread = () => setUnreadMessages(0);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, emit, unreadMessages, clearUnread, notifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
