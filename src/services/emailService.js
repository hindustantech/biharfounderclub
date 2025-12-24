import mailTransporter from "../config/mailTransporter.js";

export const sendMail = async ({
    to,
    subject,
    text,
    html,
}) => {
    try {
        const mailOptions = {
            from: `"ASK BFC India" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        };

        const info = await mailTransporter.sendMail(mailOptions);
        return {
            success: true,
            messageId: info.messageId,
        };
    } catch (error) {
        console.error("❌ Email sending failed:", error);
        throw new Error("Email delivery failed");
    }
};
