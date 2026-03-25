
import { Request } from 'express';
import { User } from 'generated/prisma/browser';


export interface LoginMeta {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface RequestWithUser extends Request {
  user: User;
}

export interface DataStoredInToken {
  sub: string;
}
