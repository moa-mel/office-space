
import { Request } from 'express';
import { User } from 'generated/prisma/client';

export interface RequestWithUser extends Request {
  user: User;
}

export interface DataStoredInToken {
  sub: string;
}
