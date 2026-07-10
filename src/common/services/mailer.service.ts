import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export interface SendMailResult {
  sent: boolean;
  reason?: string;
  messageId?: string;
}

/**
 * Real SMTP wiring via nodemailer. Credentials (SMTP_HOST/PORT/USER/PASSWORD,
 * EMAIL_FROM - see .env.example) are not set in dev yet, so sendMail() logs
 * and returns { sent: false } instead of throwing when unconfigured. Once
 * credentials are added to .env, sending works with no code change.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
      secure: SMTP_PORT === '465',
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });

    return this.transporter;
  }

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(
        `sendMail to ${options.to} skipped: SMTP not configured (set SMTP_HOST/SMTP_USER/SMTP_PASSWORD in .env)`,
      );
      return { sent: false, reason: 'SMTP not configured' };
    }

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    this.logger.log(`Email sent to ${options.to}: ${options.subject} (messageId=${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  }
}
