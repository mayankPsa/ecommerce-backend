import { Server } from 'socket.io';

let io: Server | null = null;

export class SocketUtilities {
  public static socketio = {
    init: function (server: any) {
      io = new Server(server, {
        cors: {
          origin: '*', // Replace '*' with your frontend URL in production
          methods: ['GET', 'POST', 'PUT'],
        },
      });
      console.log('Socket.IO initialized');
      return io;
    },
    getIO: function () {
      if (!io) {
        throw new Error("Can't get io instance before calling .init()");
      }
      return io;
    },
  };
}
