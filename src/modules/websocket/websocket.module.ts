import { Module } from '@nestjs/common';
import { RealtimeGateway } from './gateway/realtime.gateway';
import { RealtimeService } from './services/realtime.service';
import { DatabaseModule } from '@database/database.module';
import { CommonModule } from '@common/common.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService, RealtimeGateway],
})
export class WebSocketModule {}
