import { UnauthorizedException } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({ cors: true, namespace: 'metrics' })
export class MetricsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  getUserFromClient(client: any) {
    try {
      // 1. Intentar obtener token desde auth
      let token = client.handshake?.auth?.token;

      // 2. Si no viene, intentar desde headers
      if (!token) {
        const authHeader = client.handshake?.headers?.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token) {
        throw new UnauthorizedException('Token no proporcionado');
      }

      // 3. Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('Token inválido');
      }

      return decoded; // retorna el payload del token (ej: { id, email, ... })
    } catch (error) {
      console.error('❌ Error al obtener usuario del cliente WS:', error.message);
      throw new UnauthorizedException('Acceso no autorizado');
    }
  }
  handleConnection(client: any) {
    const user = this.getUserFromClient(client); // decodifica JWT
    if (user?.sub) {
      client.join(user.sub); // 👈 IMPORTANTE
      console.log(`Client joined room: ${user.sub}`);
    }
  }

  handleDisconnect(client: any) {
    console.log('Client disconnected:', client.id);
  }

  sendPurchaseCreated(userId: string, payload: any) {
    /* this.server.emit('purchaseCreated', payload); */
    this.server.to(userId).emit('purchaseCreated', payload);
  }
}
