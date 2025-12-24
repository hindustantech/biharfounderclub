import nodemailer from "nodemailer";

const mailTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

// Verify SMTP connection at startup
mailTransporter.verify((error, success) => {
    if (error) {
        console.error("❌ Email server configuration error:", error);
    } else {
        console.log("✅ Email server is ready");
    }
});

export default mailTransporter;
