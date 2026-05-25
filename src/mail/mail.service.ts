import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter
    private readonly logger = new Logger(MailService.name);

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('EMAIL_HOST'),
            port: this.configService.get('EMAIL_PORT'),
            secure: true,
            auth: {
                user: this.configService.get('EMAIL_USER'),
                pass: this.configService.get('EMAIL_PASS'),
            },
        })
    }

    async sendMail(to: string, subject: string, html: string) {
        const mailOptions = {
            from: this.configService.get('EMAIL_USER'),
            to,
            subject,
            html,
        }

        await this.transporter.sendMail(mailOptions)

    }

    async sendEmailOTP(name: string, email: string, otp: string) {
        try {
            const filePath = path.join(__dirname, 'templates', 'verify-email.html');

            let html = fs.readFileSync(filePath, 'utf8');

            html = html
                .replace(/{{name}}/g, name)
                .replace(/{{otp}}/g, otp)
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, 'Verify Your Email', html);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}`, error);
            throw error;
        }
    }


    async sendPasswordResetOTP(name: string, email: string, otp: string) {
        try {
            const filePath = path.join(__dirname, 'templates', 'password-reset.html');

            let html = fs.readFileSync(filePath, 'utf8');

            html = html
                .replace(/{{name}}/g, name)
                .replace(/{{otp}}/g, otp)
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, 'Password Reset OTP', html);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}`, error);
            throw error;
        }
    }

    async sendAddUserEmail(name: string, email: string, office_name: string) {
        try {
            const filePath = path.join(__dirname, 'templates', 'add-user.html');

            let html = fs.readFileSync(filePath, 'utf8');

            html = html
                .replace(/{{name}}/g, name)
                .replace(/{{office_name}}/g, office_name)
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, 'User Added to Office', html);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}`, error);
            throw error;
        }
    }

    async sendRemoveUserEmail(name: string, email: string, office_name: string) {
        try {
            const filePath = path.join(__dirname, 'templates', 'remove-user.html');

            let html = fs.readFileSync(filePath, 'utf8');

            html = html
                .replace(/{{name}}/g, name)
                .replace(/{{office_name}}/g, office_name)
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, 'User Removed from the Office', html);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}`, error);
            throw error;
        }
    }
}