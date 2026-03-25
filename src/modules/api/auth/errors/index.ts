import { HttpException } from '@nestjs/common';

export class InvalidUserCredentialException extends HttpException {
  name = 'InvalidUserCredentialException';
}

export class InvalidAuthTokenException extends HttpException {
  name = 'InvalidAuthTokenException';
}

export class UserNotFoundException extends HttpException {
  name = 'UserNotFoundException';
}

export class PrismaNetworkException extends HttpException {
  name = 'PrismaNetworkException';
}

export class AuthTokenValidationException extends HttpException {
  name = 'AuthTokenValidationException';
}