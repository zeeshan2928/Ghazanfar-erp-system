import { Exclude } from 'class-transformer';

export class UserEntity {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
