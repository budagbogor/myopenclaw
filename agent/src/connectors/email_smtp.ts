import nodemailer from 'nodemailer';
import { Config } from '../config.js';

function isConfigured(): boolean {
  const c = Config.email.smtp;
  return !!(c.host && c.user && c.pass && c.from);
}

export async function emailSmtpStatus(): Promise<{ enabled: boolean; reason?: string }> {
  if (!isConfigured()) {
    return { enabled: false, reason: 'Konfigurasi SMTP belum lengkap (EMAIL_SMTP_HOST/USER/PASS/FROM)' };
  }
  return { enabled: true };
}

export async function emailSendSmtp(to: string, subject: string, text: string): Promise<unknown> {
  const c = Config.email.smtp;
  if (!isConfigured()) {
    throw new Error('SMTP belum dikonfigurasi');
  }

  const transport = nodemailer.createTransport({
    host: c.host!,
    port: c.port,
    secure: c.secure,
    auth: {
      user: c.user!,
      pass: c.pass!,
    },
  });

  const info = await transport.sendMail({
    from: c.from!,
    to,
    subject,
    text,
  });

  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

