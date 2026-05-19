const jwt = require('jsonwebtoken');

let ioInstance;

const initSocketIO = (io) => {
  ioInstance = io;

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Auth token required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WS] User connected: ${socket.userId}`);

    // Join personal room
    socket.join(`user:${socket.userId}`);

    // Join conversation room
    socket.on('join_conversation', ({ with_user_id }) => {
      const roomId = [socket.userId, with_user_id].sort().join(':');
      socket.join(`conv:${roomId}`);
    });

    socket.on('leave_conversation', ({ with_user_id }) => {
      const roomId = [socket.userId, with_user_id].sort().join(':');
      socket.leave(`conv:${roomId}`);
    });

    // Typing indicator
    socket.on('typing', ({ to_user_id }) => {
      socket.to(`user:${to_user_id}`).emit('user_typing', { from: socket.userId });
    });

    socket.on('stop_typing', ({ to_user_id }) => {
      socket.to(`user:${to_user_id}`).emit('user_stop_typing', { from: socket.userId });
    });

    // Mark messages read
    socket.on('messages_read', ({ from_user_id }) => {
      socket.to(`user:${from_user_id}`).emit('messages_seen', { by: socket.userId });
    });

    socket.on('disconnect', () => {
      console.log(`[WS] User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => ioInstance;

const emitToUser = (userId, event, data) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
};

const emitNotification = (userId, notification) => {
  emitToUser(userId, 'notification', notification);
};

module.exports = { initSocketIO, getIO, emitToUser, emitNotification };
