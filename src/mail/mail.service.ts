
import {
    Injectable,
    Logger,
    InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { Resend } from "resend";

@Injectable()
export class MailService {
    private readonly resend: Resend;
    private readonly logger = new Logger(MailService.name);
    private readonly fromEmail: string;

    constructor(private readonly configService: ConfigService) {
        this.resend = new Resend(
            this.configService.getOrThrow<string>("RESEND_API_KEY"),
        );

        this.fromEmail =
            this.configService.getOrThrow<string>("EMAIL_FROM");
    }

    private async sendMail(
        to: string,
        subject: string,
        html: string,
    ): Promise<void> {
        const { data, error } = await this.resend.emails.send({
            from: this.fromEmail,
            to,
            subject,
            html,
        });

        if (error) {
            this.logger.error(
                `Failed to send email to ${to}: ${error.message}`,
            );
            throw new InternalServerErrorException(
                "Failed to send email",
            );
        }

        this.logger.log(
            `Email request accepted for ${to}. ID: ${data?.id ?? "unknown"}`,
        );
    }

    private loadTemplate(templateName: string): string {
        const filePath = path.join(
            __dirname,
            "templates",
            templateName,
        );

        return fs.readFileSync(filePath, "utf8");
    }

    async sendEmailOTP(
        name: string,
        email: string,
        otp: string,
    ): Promise<void> {
        try {
            const html = this.loadTemplate("verify-email.html")
                .replace(/{{name}}/g, name)
                .replace(/{{otp}}/g, otp)
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, "Verify Your Email", html);
        } catch (error) {
            this.logger.error(`Email verification failed for ${email}`, error);
            throw error;
        }
    }

    async sendPasswordResetOTP(
        name: string,
        email: string,
        otp: string,
    ): Promise<void> {
        try {
            const html = this.loadTemplate("password-reset.html")
                .replace(/{{name}}/g, name)
                .replace(/{{otp}}/g, otp)
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, "Password Reset OTP", html);
        } catch (error) {
            this.logger.error(`Password reset email failed for ${email}`, error);
            throw error;
        }
    }

    async sendAddUserEmail(
        name: string,
        email: string,
        office_name: string,
    ): Promise<void> {
        try {
            const html = this.loadTemplate("add-user.html")
                .replace(/{{name}}/g, name)
                .replace(/{{office_name}}/g, office_name)
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, "User Added to Office", html);
        } catch (error) {
            this.logger.error(`Add-user email failed for ${email}`, error);
            throw error;
        }
    }

    async sendRemoveUserEmail(
        name: string,
        email: string,
        office_name: string,
    ): Promise<void> {
        try {
            const html = this.loadTemplate("remove-user.html")
                .replace(/{{name}}/g, name)
                .replace(/{{office_name}}/g, office_name)
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, "User Removed from the Office", html);
        } catch (error) {
            this.logger.error(`Remove-user email failed for ${email}`, error);
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
        notes: string,
    ): Promise<void> {
        try {
            const html = this.loadTemplate("create-Event.html")
                .replace(/{{name}}/g, name)
                .replace(/{{title}}/g, title)
                .replace(/{{startDate}}/g, startDate)
                .replace(/{{endDate}}/g, endDate)
                .replace(/{{timezone}}/g, timezone)
                .replace(/{{meetingUrl}}/g, meetingUrl)
                .replace(/{{notes}}/g, notes || "N/A")
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, "New Event Scheduled", html);
        } catch (error) {
            this.logger.error(`Create-event email failed for ${email}`, error);
            throw error;
        }
    }

    async updateEvent(
        name: string,
        email: string,
        title: string,
        startDate: string,
        endDate: string,
        notes: string,
    ): Promise<void> {
        try {
            const html = this.loadTemplate("create-Event.html")
                .replace(/{{name}}/g, name)
                .replace(/{{title}}/g, title)
                .replace(/{{startDate}}/g, startDate)
                .replace(/{{endDate}}/g, endDate)
                .replace(/{{notes}}/g, notes || "N/A")
                .replace(/{{year}}/g, String(new Date().getFullYear()));

            await this.sendMail(email, "Event Updated", html);
        } catch (error) {
            this.logger.error(`Update-event email failed for ${email}`, error);
            throw error;
        }
    }
}
