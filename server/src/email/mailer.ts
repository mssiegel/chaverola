import { createTransport } from "nodemailer";
import type { Logger } from "pino";

import type { Config } from "../config";

/*
  The one place a transcript email actually leaves the process. Two modes,
  chosen once at boot from config.smtp:

  - "gmail": a nodemailer transport over Gmail SMTP (the founder's account +
    an app password, GMAIL_USER / GMAIL_APP_PASSWORD on Render). A stopgap,
    isolated here so swapping to a real provider touches one file.
  - "log": no credentials — the mailer logs instead of sending, so dev needs
    zero env vars. In dev it logs the whole composed email (that's how the
    format gets eyeballed); in production it logs a warning with the
    recipient and counts only — never the student messages, which have no
    business in Render's log stream.

  Nothing calls send() until feature 11 prompt 3 (End activity); prompt 2
  builds and wires the mailer so that prompt stays pure feature.
*/

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  mode: "gmail" | "log";
  send(message: EmailMessage): Promise<void>;
}

/** One digit per line, for the log-mode warning — a transcript's shape
 *  without its contents. */
function lineCount(text: string): number {
  return text.split("\n").length;
}

export function createMailer(config: Config, logger: Logger): Mailer {
  const log = logger.child({ module: "mail" });

  if (config.smtp) {
    const from = `Chaverola <${config.smtp.user}>`;
    const transport = createTransport({
      service: "gmail",
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
    log.info({ mode: "gmail" }, "mailer ready — sending via Gmail SMTP");
    return {
      mode: "gmail",
      async send({ to, subject, text }) {
        await transport.sendMail({ from, to, subject, text });
      },
    };
  }

  // No credentials → log mode. Loud in production, since a real deploy that
  // reaches this branch will silently never deliver a transcript.
  const isProd = config.nodeEnv === "production";
  if (isProd) {
    log.warn(
      { mode: "log" },
      "no GMAIL_USER / GMAIL_APP_PASSWORD — transcript emails will be logged, not sent"
    );
  } else {
    log.info({ mode: "log" }, "mailer in log-only mode (no SMTP credentials)");
  }

  return {
    mode: "log",
    async send({ to, subject, text }) {
      if (isProd) {
        // Never the body in production — recipient and shape only.
        log.warn(
          { to, subject, lines: lineCount(text) },
          "transcript email not sent (log mode)"
        );
      } else {
        log.info(
          { to, subject, text },
          "transcript email (log mode — not actually sent)"
        );
      }
    },
  };
}
