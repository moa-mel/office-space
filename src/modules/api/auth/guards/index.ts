import { CanActivate, ExecutionContext, ForbiddenException, HttpStatus, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { AuthTokenValidationException, InvalidAuthTokenException, PrismaNetworkException, UserNotFoundException } from "../errors";
import { DataStoredInToken } from "../interfaces";
import { jwtSecret } from "@/config";
import logger from 'moment-logger';
import { JwtService } from "@nestjs/jwt";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { PrismaService } from "@/modules/core/prisma/services";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    @InjectRedis() private readonly redisService: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new InvalidAuthTokenException(
        'Authorization header is missing',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isBlacklisted = await this.redisService.get(
      `blacklist:accessToken:${token}`,
    );

    if (isBlacklisted) {
      throw new ForbiddenException('Token has been revoked');
    }

    try {
      const payload: DataStoredInToken = await this.jwtService.verifyAsync(
        token,
        {
          secret: jwtSecret,
        },
      );
      console.log('JWT payload:', payload);

      const user = await this.prisma.user.findUnique({
        where: {
          identifier: payload.sub,
        },
      });
      if (!user) {
        throw new UserNotFoundException(
          'Your session is unauthorized',
          HttpStatus.UNAUTHORIZED,
        );
      }

      request.user = user;
    } catch (error) {
      logger.error(error);
      switch (true) {
        case error instanceof UserNotFoundException: {
          throw error;
        }

        case error.name == 'PrismaClientKnownRequestError': {
          throw new PrismaNetworkException(
            'Unable to process request. Please try again',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }

        default: {
          throw new AuthTokenValidationException(
            'Your session is unauthorized or expired',
            HttpStatus.UNAUTHORIZED,
          );
        }
      }
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
  const authHeader = request.headers.get('authorization');
  const [type, token] = authHeader?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}

}
