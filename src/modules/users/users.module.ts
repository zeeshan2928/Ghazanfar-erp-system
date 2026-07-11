import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersController } from './users.controller';
import { UsersService } from './services/users.service';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '@database/database.module';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set - refusing to start with a default secret');
}

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRATION || '7d',
      },
    }),
  ],
  controllers: [UsersController],
  providers: [PasswordService, UsersService, AuthService, JwtStrategy],
  exports: [UsersService, AuthService],
})
export class UsersModule {}
