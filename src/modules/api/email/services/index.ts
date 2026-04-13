import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter
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
        const html = `<h1>Verification Code</h1>
                  <h3>Hello ${name}</h3>
                  <p>Your OTP for email verification is: <strong>${otp}</strong></p>`;

        await this.sendMail(email, 'Verify Your Email', html);

    }

    async sendPasswordResetOTP(name: string, email: string, otp: string) {
        const html = `<h1>Password Reset OTP</h1>
                  <h3>Hello ${name}</h3>
                  <p>Your OTP for resetting your password is: <strong>${otp}</strong></p>`;

        await this.sendMail(email, 'Password Reset OTP', html);
    }

    async sendAddUserEmail(name: string, email:string, office_name:string){
        const html = `<h1>User Added to Office</h1>
                  <h3>Hello ${name}</h3>
                  <p>Happy to inform you that you have being added to <strong>${office_name}</strong></p>`;

        await this.sendMail(email, 'Add User email', html);
    }

     async sendRemoveUserEmail(name: string, email:string, office_name:string){
        const html = `<h1>User Removed from the Office</h1>
                  <h3>Hello ${name}</h3>
                  <p>Sorry to inform you that you have been removed from <strong>${office_name}</strong></p>`;

        await this.sendMail(email, 'Remove User Email', html);
    }
}