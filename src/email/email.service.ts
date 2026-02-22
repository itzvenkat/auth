import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(EmailService.name);

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('mail.host'),
            port: this.configService.get<number>('mail.port'),
            secure: this.configService.get<boolean>('mail.secure'),
            auth:
                this.configService.get('mail.user')
                    ? {
                        user: this.configService.get('mail.user'),
                        pass: this.configService.get('mail.pass'),
                    }
                    : undefined,
        });
    }

    private getTemplate(name: string, vars: Record<string, string>): string {
        const templatePath = path.join(__dirname, 'templates', `${name}.html`);
        let html = fs.existsSync(templatePath)
            ? fs.readFileSync(templatePath, 'utf-8')
            : this.defaultTemplate(name, vars);

        Object.entries(vars).forEach(([key, value]) => {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        return html;
    }

    private defaultTemplate(
        type: string,
        vars: Record<string, string>,
    ): string {
        const messages: Record<string, string> = {
            verify: `<h2>Verify your email</h2><p>Click <a href="{{url}}">here</a> to verify your email. Link expires in 24 hours.</p>`,
            'reset-password': `<h2>Reset your password</h2><p>Click <a href="{{url}}">here</a> to reset your password. Link expires in 1 hour.</p>`,
            'security-alert': `<h2>Security Alert</h2><p>{{message}}</p>`,
            'welcome': `<h2>Welcome to AuthService!</h2><p>Hello {{name}}, your account is now active.</p>`,
        };
        let body = messages[type] || `<p>Notification from Auth Service</p>`;
        Object.entries(vars).forEach(([k, v]) => {
            body = body.replace(new RegExp(`{{${k}}}`, 'g'), v);
        });
        return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px">${body}</body></html>`;
    }

    async sendVerificationEmail(email: string, token: string, name?: string) {
        const appUrl = this.configService.get('APP_URL', 'http://localhost:3000');
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:4200');
        const url = `${frontendUrl}/verify-email?token=${token}`;
        const html = this.getTemplate('verify', { url, name: name || email });

        await this.send(email, 'Verify your email address', html);
    }

    async sendPasswordResetEmail(email: string, token: string, name?: string) {
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:4200');
        const url = `${frontendUrl}/reset-password?token=${token}`;
        const html = this.getTemplate('reset-password', { url, name: name || email });

        await this.send(email, 'Reset your password', html);
    }

    async sendSecurityAlert(email: string, message: string) {
        const html = this.getTemplate('security-alert', { message });
        await this.send(email, 'Security Alert - Auth Service', html);
    }

    async sendWelcomeEmail(email: string, name?: string) {
        const html = this.getTemplate('welcome', { name: name || email });
        await this.send(email, 'Welcome to Auth Service!', html);
    }

    private async send(to: string, subject: string, html: string) {
        try {
            await this.transporter.sendMail({
                from: this.configService.get('mail.from'),
                to,
                subject,
                html,
            });
            this.logger.log(`Email sent to ${to}: ${subject}`);
        } catch (err) {
            this.logger.error(`Failed to send email to ${to}`, err);
        }
    }
}
