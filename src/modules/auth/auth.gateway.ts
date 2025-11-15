import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({ cors: true })
export class AuthGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  async handleConnection(client: Socket) {
    try {
      const rawHeader = client.handshake.headers.authorization;

      if (!rawHeader) {
        console.warn('⚠️ No Authorization header found');
        client.disconnect();
        return;
      }

      const token = rawHeader.replace('Bearer ', '').trim();

      if (!token) {
        console.warn('⚠️ Empty token received');
        client.disconnect();
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      const userId = decoded.sub;
      client.join(userId);

      console.log(`Usuario conectado a room: ${userId}`);
    } catch (err) {
      console.error('❌ Error validando token en socket:', err);
      client.disconnect();
    }
  }
}
