import { WebSocketGateway, OnGatewayConnection, WebSocketServer, MessageBody, ConnectedSocket, SubscribeMessage } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SocketService } from './socket.service';
import {
    Logger,
    LoggerService,
} from '@nestjs/common';

@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection {
    @WebSocketServer()
    private server: Socket;
    private logger: LoggerService;
    private roomDataMap = new Map<string, { userId: string, data: string }[]>();

    constructor(private readonly socketService: SocketService) {
        this.logger = new Logger(SocketGateway.name);
    }

    handleConnection(socket: Socket): void {
        this.socketService.handleConnection(socket);
    }

    @SubscribeMessage("JoinSocketRoom")
    public async createRoom(
        @MessageBody() roomId: string,
        @ConnectedSocket() socket: Socket
    ) {
        this.logger.log('[SOCKET] - JoinCreateSocketRoom');
        socket.join(roomId);

        if (!this.roomDataMap.has(roomId)) {
            this.roomDataMap.set(roomId, []);
        }

        socket.emit("JoinSocketRoom", 'success');

        this.logger.warn(`[SOCKET] - JoinCreateSocketRoom (Room '${roomId}' - joined)`);
    }

    @SubscribeMessage("SendNewPoints")
    public async SendNewPoints(
        @MessageBody() body: string,
        @ConnectedSocket() socket: Socket
    ) {
        this.logger.log('[SOCKET] - SendNewPoints');
        const { userId, roomId, data } = JSON.parse(body);

        if (this.roomDataMap.has(roomId)) {
            const roomData = this.roomDataMap.get(roomId) || [];

            const existingUserIndex = roomData.findIndex(item => item.userId === userId);

            if (existingUserIndex !== -1) {
                roomData[existingUserIndex] = { userId, data };
            } else {
                roomData.push({ userId, data });
            }

            this.roomDataMap.set(roomId, roomData);
            this.logger.warn(`[SOCKET] - SendNewPoints (Room '${roomId}' - updated)`);
        } else {
            socket.emit("SendNewPoints", 'Room not found');
        }
    }

    @SubscribeMessage("DeleteRoom")
    public async Event(
        @MessageBody() body: string,
        @ConnectedSocket() socket: Socket
    ) {
        this.logger.log('[SOCKET] - DeleteRoom');
        const { roomId } = JSON.parse(body);

        if (this.roomDataMap.has(roomId)) {
            this.roomDataMap.delete(roomId);
            socket.emit("DeleteRoom", this.roomDataMap);
        } else {
            socket.emit("DeleteRoom", 'Room not found');
        }
    }

}
