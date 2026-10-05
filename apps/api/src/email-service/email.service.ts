import nodemailer, { Transporter } from 'nodemailer';

// Sends through Gmail SMTP with an App Password (Google Account -> Security -> 2-Step Verification -> App passwords).
// EMAIL_USER is the Gmail address; Gmail sends as that account whatever the From header says.
// EMAIL_SMTP_HOST / EMAIL_SMTP_PORT / EMAIL_SMTP_SECURE exist only to point at another SMTP server (or a test sink).

let transporter: Transporter | null = null;

const createTransporter = (): Transporter | null => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_APP_PASSWORD;

    if (!user || !pass) {
        console.warn('⚠️  EMAIL_USER / EMAIL_APP_PASSWORD not configured. Email sending will be disabled.');
        return null;
    }

    const port = parseInt(process.env.EMAIL_SMTP_PORT || '465', 10);
    const secure = process.env.EMAIL_SMTP_SECURE ? process.env.EMAIL_SMTP_SECURE === 'true' : port === 465;

    const t = nodemailer.createTransport({
        host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
        port,
        secure,
        auth: { user, pass },
        // Fail fast: if the host blocks outbound SMTP, a request must not hang for minutes waiting on a dead socket
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
    });

    // Check the credentials once at startup, in the background, so a bad App Password shows up in the logs
    t.verify()
        .then(() => console.log(`✅ Email ready (sending as ${user})`))
        .catch((err) => console.error(`❌ Email transport check failed: ${err.message}`));

    return t;
};

transporter = createTransporter();

export const sendEmail = async (to: string, subject: string, htmlContent: string) => {
    if (!transporter) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] Mock Email to ${to}: ${subject}`);
            return true;
        }
        return false;
    }

    try {
        await transporter.sendMail({
            from: { name: 'ECare+', address: process.env.EMAIL_USER as string },
            to,
            subject,
            html: htmlContent,
        });
        console.log(`✅ Email sent successfully to ${to}`);
        return true;
    } catch (error: any) {
        console.error(`❌ Email send error: ${error.message}`);
        return false;
    }
};
