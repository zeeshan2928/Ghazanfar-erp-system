import { WebSocketGateway, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private userConnections = new Map<number, Set<string>>();
  private orgConnections = new Map<number, Set<string>>();

  constructor(
    private jwtService: JwtService,
  ) {}

  /**
   * Handle client connection
   */
  async handleConnection(@ConnectedSocket() socket: Socket) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('Connection rejected: no token provided');
        socket.disconnect();
        return;
      }

      // Verify JWT token
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub || decoded.id;
      const organizationId = decoded.organizationId;

      if (!userId || !organizationId) {
        this.logger.warn('Connection rejected: invalid token');
        socket.disconnect();
        return;
      }

      // Store connection
      socket.data.userId = userId;
      socket.data.organizationId = organizationId;

      // Track user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId).add(socket.id);

      this.logger.log(`User ${userId} connected (${socket.id})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      socket.disconnect();
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId;

    if (userId) {
      const userSockets = this.userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.userConnections.delete(userId);
        }
      }
    }

    this.logger.log(`User ${userId} disconnected (${socket.id})`);
  }

  /**
   * Join organization
   */
  @SubscribeMessage('join:organization')
  handleJoinOrganization(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { organizationId: number },
  ) {
    const roomName = `org:${data.organizationId}`;
    socket.join(roomName);

    if (!this.orgConnections.has(data.organizationId)) {
      this.orgConnections.set(data.organizationId, new Set());
    }
    this.orgConnections.get(data.organizationId).add(socket.id);

    this.logger.log(`User joined organization room: ${roomName}`);
    return { success: true };
  }

  /**
   * Leave organization
   */
  @SubscribeMessage('leave:organization')
  handleLeaveOrganization(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { organizationId: number },
  ) {
    const roomName = `org:${data.organizationId}`;
    socket.leave(roomName);

    const orgSockets = this.orgConnections.get(data.organizationId);
    if (orgSockets) {
      orgSockets.delete(socket.id);
      if (orgSockets.size === 0) {
        this.orgConnections.delete(data.organizationId);
      }
    }

    this.logger.log(`User left organization room: ${roomName}`);
    return { success: true };
  }

  /**
   * Subscribe to KPI updates
   */
  @SubscribeMessage('subscribe:kpis')
  handleSubscribeKPIs(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { organizationId: number },
  ) {
    const roomName = `kpis:${data.organizationId}`;
    socket.join(roomName);
    this.logger.log(`User subscribed to KPIs: ${roomName}`);
    return { success: true };
  }

  /**
   * Unsubscribe from KPI updates
   */
  @SubscribeMessage('unsubscribe:kpis')
  handleUnsubscribeKPIs(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { organizationId: number },
  ) {
    const roomName = `kpis:${data.organizationId}`;
    socket.leave(roomName);
    this.logger.log(`User unsubscribed from KPIs: ${roomName}`);
    return { success: true };
  }

  /**
   * Notify bill created
   */
  notifyBillCreated(organizationId: number, billData: any) {
    const roomName = `org:${organizationId}`;
    this.server.to(roomName).emit('bill:created', billData);
    this.logger.log(`Bill created notification sent to ${roomName}`);
  }

  /**
   * Notify bill status changed
   */
  notifyBillStatusChanged(organizationId: number, billId: number, oldStatus: string, newStatus: string, changedBy: number, changedAt: Date) {
    const roomName = `org:${organizationId}`;
    this.server.to(roomName).emit('bill:status-changed', {
      billId,
      oldStatus,
      newStatus,
      changedBy,
      changedAt,
    });
    this.logger.log(`Bill status changed notification sent to ${roomName}`);
  }

  /**
   * Notify PO created
   */
  notifyPOCreated(organizationId: number, poData: any) {
    const roomName = `org:${organizationId}`;
    this.server.to(roomName).emit('po:created', poData);
    this.logger.log(`PO created notification sent to ${roomName}`);
  }

  /**
   * Notify PO status changed
   */
  notifyPOStatusChanged(organizationId: number, poId: number, oldStatus: string, newStatus: string, changedBy: number, changedAt: Date) {
    const roomName = `org:${organizationId}`;
    this.server.to(roomName).emit('po:status-changed', {
      poId,
      oldStatus,
      newStatus,
      changedBy,
      changedAt,
    });
    this.logger.log(`PO status changed notification sent to ${roomName}`);
  }

  /**
   * Broadcast KPI updates to all connected users in organization
   */
  broadcastKPIUpdate(organizationId: number, kpis: any) {
    const roomName = `kpis:${organizationId}`;
    this.server.to(roomName).emit('kpi:update', kpis);
  }

  /**
   * Notify low inventory
   */
  notifyLowInventory(organizationId: number, productId: number, stock: number) {
    const roomName = `org:${organizationId}`;
    this.server.to(roomName).emit('inventory:low', {
      productId,
      currentStock: stock,
      timestamp: new Date(),
    });
    this.logger.log(`Low inventory notification sent to ${roomName}`);
  }

  /**
   * Notify payment received
   */
  notifyPaymentReceived(organizationId: number, billId: number, amount: number, paymentMethod: string, receivedAt: Date) {
    const roomName = `org:${organizationId}`;
    this.server.to(roomName).emit('payment:received', {
      billId,
      amount,
      paymentMethod,
      receivedAt,
    });
    this.logger.log(`Payment received notification sent to ${roomName}`);
  }

  /**
   * Get active connections for organization
   */
  getActiveConnections(organizationId: number): number {
    const sockets = this.server.sockets.sockets;
    let count = 0;

    for (const socket of sockets.values()) {
      if (socket.data.organizationId === organizationId) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get user connections
   */
  getUserConnections(userId: number): number {
    return this.userConnections.get(userId)?.size || 0;
  }
}
