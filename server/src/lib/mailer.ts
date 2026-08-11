import nodemailer from "nodemailer";
import type { AppConfig } from "../config.js";

export interface Mailer {
  send(to: string, subject: string, text: string): Promise<void>;
}

// No SMTP is configured for the beta yet. Logging the message keeps the verification/reset
// flows fully usable end to end (read the code from the server log) until a real provider is
// wired up via SMTP_URL — see docs/CLAUDE_HANDOFF.md.
function consoleMailer(app: { log: { warn: (obj: unknown, msg: string) => void } }): Mailer {
  return {
    async send(to, subject, text) {
      app.log.warn({ to, subject, text }, "SMTP_URL not configured; logging mail instead of sending");
    },
  };
}

function smtpMailer(smtpUrl: string, from: string): Mailer {
  const transport = nodemailer.createTransport(smtpUrl);
  return {
    async send(to, subject, text) {
      await transport.sendMail({ from, to, subject, text });
    },
  };
}

export function createMailer(config: AppConfig, app: { log: { warn: (obj: unknown, msg: string) => void } }): Mailer {
  return config.SMTP_URL ? smtpMailer(config.SMTP_URL, config.MAIL_FROM) : consoleMailer(app);
}
