import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BrevoClient } from "@getbrevo/brevo";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly brevo: BrevoClient;
    private readonly senderEmail: string;
    private readonly senderName: string;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>("BREVO_API_KEY");
        const senderEmail = this.configService.get<string>("EMAIL_FROM");

        if (!apiKey) {
            throw new Error("BREVO_API_KEY is not configured");
        }

        if (!senderEmail) {
            throw new Error("EMAIL_FROM is not configured");
        }

        this.brevo = new BrevoClient({ apiKey });
        this.senderEmail = senderEmail;
        this.senderName =
            this.configService.get<string>("EMAIL_FROM_NAME") || "Office Space";
    }

    async sendMail(
        to: string,
        subject: string,
        html: string,
    ): Promise<void> {
        try {
            const result = await this.brevo.transactionalEmails.sendTransacEmail({
                sender: {
                    email: this.senderEmail,
                    name: this.senderName,
                },
                to: [{ email: to }],
                subject,
                htmlContent: html,
            });

            this.logger.log(
                `Email accepted by Brevo for ${to}. Message ID: ${result.messageId}`,
            );
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);

            this.logger.error(`Failed to send email to ${to}: ${message}`);
            throw error;
        }
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

    async createEvent(
        name: string,
        email: string,
        title: string,
        startDate: string,
        endDate: string,
        timezone: string,
        meetingUrl: string,
        notes: string
    ) {
        try {
            const filePath = path.join(__dirname, 'templates', 'create-Event.html');

            let html = fs.readFileSync(filePath, 'utf8');

            html = html
                .replace(/{{name}}/g, name)
                .replace(/{{title}}/g, title)
                .replace(/{{startDate}}/g, startDate)
                .replace(/{{endDate}}/g, endDate)
                .replace(/{{timezone}}/g, timezone)
                .replace(/{{meetingUrl}}/g, meetingUrl)
                .replace(/{{notes}}/g, notes || 'N/A')
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, 'New Event Scheduled', html);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}`, error);
            throw error;
        }
    }

    async updateEvent(
        name: string,
        email: string,
        title: string,
        startDate: string,
        endDate: string,
        notes: string
    ) {
        try {
            const filePath = path.join(__dirname, 'templates', 'create-Event.html');

            let html = fs.readFileSync(filePath, 'utf8');

            html = html
                .replace(/{{name}}/g, name)
                .replace(/{{title}}/g, title)
                .replace(/{{startDate}}/g, startDate)
                .replace(/{{endDate}}/g, endDate)
                .replace(/{{notes}}/g, notes || 'N/A')
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, 'New Event Scheduled', html);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}`, error);
            throw error;
        }
    }
}