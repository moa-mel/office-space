import { PrismaService } from "@/modules/core/prisma/services";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import Redis from "ioredis";
import { buildResponse } from "@/utils/api-response-util";
import { refreshJwtSecret, refreshTokenExpiresIn } from "@/config";
import { generateId } from "@/utils";
import * as bcrypt from 'bcryptjs';
import { ForgetPasswordDto, ResetPasswordDto, SignInDto, SignUpDto, VerifyCodeDto, VerifyEmailDto } from "../dtos";
import { DataStoredInToken, LoginMeta } from "../interfaces";
import { ForbiddenException, HttpStatus } from "@nestjs/common";
import { InvalidVerificationCodeException, UserNotFoundException } from "../errors";
import { MailService } from "@/mail/mail.service";

export class AuthService {
    constructor(
        private prisma: PrismaService,
        private emailService: MailService,
        private configService: ConfigService,
        private readonly jwtService: JwtService,
        @InjectRedis() private readonly redisService: Redis
    ) { }

    async comparePassword(password: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(password, hash)
    }

    private async generateTokenAndSaveToRedis(minutes: number, email: string) {
        const token = generateId({ type: 'token', length: 32 })

        await this.redisService.set(`verify:${token}`, email, 'EX', minutes * 60)

        return { token };

    }

    public async generateJwtTokens(userId: string) {
        const accessToken = await this.jwtService.signAsync({
            sub: userId,
        })
        const refreshToken = this.jwtService.sign({ sub: userId },
            {
                secret: refreshJwtSecret,
                expiresIn: refreshTokenExpiresIn as any
            }
        )
        await this.redisService.set(
            `refreshToken:${userId}`,
            refreshToken,
            'EX',
            15 * 24 * 60 * 60
        );
        return { accessToken, refreshToken }
    }

    async signUp(options: SignUpDto) {
        const hashedPassword = await bcrypt.hash(options.password, 10);

        const user = await this.prisma.$transaction(async (prisma) => {
            // Check if email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: options.email },
            });

            if (existingUser) {
                throw new Error('Email already in use');
            }

            // Create the new user
            const newUser = await prisma.user.create({
                data: {
                    identifier: generateId({ type: 'identifier' }),
                    firstName: options.firstName,
                    lastName: options.lastName,
                    email: options.email,
                    password: hashedPassword,
                    isVerified: false,
                    emailVerifiedAt: null, // make sure this is nullable in Prisma
                },
            });

            return newUser;
        });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to Redis
        await this.redisService.set(`otp:${user.identifier}`, otp, 'EX', 5 * 60);

        const verification = await this.redisService.get(`otp:${user.identifier}`);
        console.log('OTP saved verification:', {
            identifier: user.identifier,
            otpSaved: !!verification,
            otp: verification
        });

        // Send OTP email
        await this.emailService.sendEmailOTP(user.firstName, user.email, otp);

        return buildResponse({
            message: 'User created successfully. Check your email for verification code',
            data: user,
        });
    }

    async verifyEmail(options: VerifyEmailDto, identifier: string) {
        const otpKey = `otp:${identifier}`;

        const storedOtp = await this.redisService.get(otpKey);

        if (!storedOtp || storedOtp.trim() !== options.otp.trim()) {
            throw new Error("Invalid or expired OTP");
        }

        const user = await this.prisma.user.findUnique({
            where: { identifier }
        });

        if (!user)
            throw new UserNotFoundException('User not found', HttpStatus.BAD_REQUEST);

        // SIGNUP verification
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                emailVerifiedAt: new Date()
            }
        });

        await this.redisService.del(otpKey);

        return buildResponse({
            message: "Email verified successfully"
        });
    }

    async signIn(options: SignInDto) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: options.email
            },
            select: {
                id: true,
                identifier: true,
                firstName: true,
                lastName: true,
                email: true,
                password: true,
                isVerified: true
            }
        });

        if (!user) {
            throw new Error('User not found')
        }

        if (!user.isVerified) {
            throw new Error('Email not verified. Please verify your email to log in.');
        }

        const validPassword = await this.comparePassword(
            options.password,
            user.password,
        );

        if (!validPassword) {
            throw new Error('Invalid credentials')
        }

        const { accessToken, refreshToken } = await this.generateJwtTokens(
            user.identifier
        );

        const loginData: LoginMeta = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        }

        return buildResponse({
            message: "User Logged in successfully",
            data: {
                accessToken,
                refreshToken,
                meta: loginData,
            }
        })
    }

    async signOut(accessToken: string) {
        console.log('accessToken', accessToken)
        const decodeToken = this.jwtService.decode(accessToken);
        if (!decodeToken) {
            throw new Error('Invalid token')
        }

        // Blacklist the access token
        await this.redisService.set(
            `blacklist:${accessToken}`,
            'revoked',
            'EX',
            decodeToken.exp - Math.floor(Date.now() / 1000)
        );

        // Also delete the refresh token for the user
        await this.redisService.del(`refreshToken:${decodeToken.sub}`);

        return buildResponse({
            message: "User Logged out successfully",
        })

    }

    async forgetPassword(options: ForgetPasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { email: options.email } });
        if (!user) throw new Error('User not found');

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in Redis per user
        await this.redisService.set(`resetOtp:${user.identifier}`, otp, 'EX', 5 * 60); // expires in 5 min

        await this.emailService.sendPasswordResetOTP(user.firstName, user.email, otp);

        return buildResponse({
            message: "Password reset OTP sent to your email",
            data: { identifier: user.identifier }
        });
    }

    async verifyResetOtp(options: VerifyCodeDto) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: options.email,
            },
        });

        if (!user) {
            throw new InvalidVerificationCodeException(
                'Invalid or expired verification code',
                HttpStatus.BAD_REQUEST,
            );
        }

        const otpKey = `resetOtp:${user.identifier}`;
        const storedOtp = await this.redisService.get(otpKey);

        if (!storedOtp || storedOtp.trim() !== options.otp.trim()) {
            throw new InvalidVerificationCodeException(
                'Invalid or expired verification code',
                HttpStatus.BAD_REQUEST,
            );
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode: null,
                codeTTL: null,
            },
        });

        // Set reset permission in Redis for 10 minutes
        await this.redisService.set(`resetAllowed:${user.identifier}`, user.id.toString(), 'EX', 10 * 60);

        return buildResponse({
            message: 'Code verified successfully.',
        });
    }

    async resetPassword(options: ResetPasswordDto, identifier: string) {
        if (options.password.trim() !== options.confirmPassword.trim()) throw new Error('Passwords do not match');

        // Get userId from Redis
        const userIdStr = await this.redisService.get(`resetAllowed:${identifier}`);
        if (!userIdStr) throw new Error("Reset permission expired or OTP not verified");

        const userId = parseInt(userIdStr, 10);

        const hashedPassword = await bcrypt.hash(options.password, 10);

        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        // Clean up
        await this.redisService.del(`resetAllowed:${identifier}`);

        return buildResponse({
            message: "Password reset successfully"
        });
    }

    async refreshAccessToken(token: string) {
        try {
            const payload: DataStoredInToken = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<'string'>('REFRESH_JWT_SECRET'),
            });

            const savedToken = await this.redisService.get(
                `refreshToken:${payload.sub}`,
            );

            if (savedToken !== token) {
                throw new ForbiddenException('Invalid refresh token');
            }

            const accessToken = await this.jwtService.signAsync({
                sub: payload.sub,
            });

            return buildResponse({
                message: 'Access token refreshed successfully',
                data: {
                    accessToken,
                },
            });
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw new ForbiddenException('Invalid or expired refresh token');
        }
    }
}