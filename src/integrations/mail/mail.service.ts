import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { otpEmailTemplate } from './templates/otp.template';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private fromName: string;
  private fromEmail: string;
  private appName: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('mail.smtp.host')!;
    const port = this.config.get<number>('mail.smtp.port')!;
    const user = this.config.get<string>('mail.smtp.user')!;
    const pass = this.config.get<string>('mail.smtp.pass')!;
    const secure = this.config.get<boolean>('mail.smtp.secure') ?? false;

    this.fromName = this.config.get<string>('mail.fromName')!;
    this.fromEmail = this.config.get<string>('mail.fromEmail')!;
    this.appName = this.config.get<string>('app.name') ?? 'ASE School';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  /**
   * Basic send
   */
  async sendMail(params: { to: string; subject: string; html?: string; text?: string }) {
    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
  }

  /**
   * OTP email send
   */
  async sendOtpEmail(params: {
    to: string;
    otp: string;
    ttlSeconds: number;
    schoolCode?: string;
  }) {
    const expiresInMinutes = Math.max(1, Math.ceil(params.ttlSeconds / 60));
    const tpl = otpEmailTemplate({
      appName: this.appName,
      otp: params.otp,
      expiresInMinutes,
      schoolCode: params.schoolCode,
    });

    await this.sendMail({
      to: params.to,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
  }
}
