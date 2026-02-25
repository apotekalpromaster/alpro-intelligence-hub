require('dotenv').config();
const nodemailer = require('nodemailer');

const RECEIVER_EMAIL = 'hendri@apotekalpro.id';

// Create reusable transporter object using the default SMTP transport
async function createTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // Fallback for development/testing if no actual SMTP config exists
    console.log('⚠️ No SMTP config found in .env. Using Ethereal Email for testing...');
    let testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
}

/**
 * Send email alert for high impact strategic alerts.
 * @param {Array} items Array of items from market_trends with score > 7
 */
async function sendStrategicAlert(items) {
    if (!items || items.length === 0) return;

    try {
        const transporter = await createTransporter();

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d9381e;">⚠️ Critical Intelligence Alert</h2>
                <p>Hello Hendri,</p>
                <p>The Alpro Intelligence Hub has detected <strong>${items.length}</strong> new high-impact market events (Score > 7) in the last scan.</p>
                
                <hr style="border: 1px solid #eee; my-4" />
                
                ${items.map(item => `
                    <div style="margin-bottom: 20px; padding: 15px; background: #fff8f8; border-left: 4px solid #d9381e; border-radius: 4px;">
                        <span style="font-size: 10px; font-weight: bold; background: #d9381e; color: #fff; padding: 3px 6px; border-radius: 3px;">
                            ${item.source_type} (Score: ${item.sentiment_score * 10}/10)
                        </span>
                        <h4 style="margin: 10px 0 5px 0;">
                            <a href="${item.source_url || '#'}" style="color: #0056b3; text-decoration: none;">${item.title}</a>
                        </h4>
                        <p style="font-size: 13px; color: #555; margin: 0 0 10px 0;">${item.summary}</p>
                        <strong style="font-size: 12px; color: #d9381e;">Recommendation:</strong>
                        <p style="font-size: 12px; margin: 5px 0 0 0;">${item.recommendation}</p>
                    </div>
                `).join('')}
                
                <hr style="border: 1px solid #eee; margin-top: 20px" />
                <p style="font-size: 11px; color: #999;">Check your <a href="http://localhost:5173" style="color: #0056b3;">Dashboard</a> for full details.<br/>&copy; 2026 Dept. OASIS, Apotek Alpro Indonesia</p>
            </div>
        `;

        const info = await transporter.sendMail({
            from: '"Alpro Hub OASIS" <no-reply@apotekalpro.id>',
            to: RECEIVER_EMAIL,
            subject: `[Alpro Hub] ${items.length} Critical Strategic Alerts Detected`,
            html: htmlContent,
        });

        console.log(`📧 Strategic Alert Email sent to ${RECEIVER_EMAIL}`);
        if (info.messageId && nodemailer.getTestMessageUrl(info)) {
            console.log(`Preview Email: ${nodemailer.getTestMessageUrl(info)}`);
        }
    } catch (err) {
        console.error('❌ Failed to send Strategic Alert email:', err.message);
    }
}

/**
 * Send email alert summarizing new customer pulse data.
 * @param {Array} reviews Processed reviews from review_sentiments
 */
async function sendCustomerPulseAlert(reviews) {
    if (!reviews || reviews.length === 0) return;

    try {
        const counts = { POSITIVE: 0, STOK_ISSUE: 0, SERVICE_ISSUE: 0, NEUTRAL: 0 };
        reviews.forEach(r => { counts[r.sentiment_category] = (counts[r.sentiment_category] || 0) + 1; });

        const transporter = await createTransporter();

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0ea5e9;">📊 Customer Pulse Update</h2>
                <p>Hello Hendri,</p>
                <p>The Alpro Intelligence Hub has just processed <strong>${reviews.length}</strong> new customer reviews.</p>
                
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #0284c7;">Summary Breakdown:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 5px;"><strong style="color: #16a34a;">Positive:</strong> ${counts.POSITIVE || 0} reviews</li>
                        <li style="margin-bottom: 5px;"><strong style="color: #dc2626;">Stock Issues:</strong> ${counts.STOK_ISSUE || 0} reviews</li>
                        <li style="margin-bottom: 5px;"><strong style="color: #ea580c;">Service Issues:</strong> ${counts.SERVICE_ISSUE || 0} reviews</li>
                    </ul>
                </div>
                
                <p style="font-size: 13px;">If you see high numbers in Stock or Service issues, please review immediately on the dashboard.</p>
                
                <hr style="border: 1px solid #eee; margin-top: 30px" />
                <p style="font-size: 11px; color: #999;">Check your <a href="http://localhost:5173" style="color: #0056b3;">Dashboard</a> for full details.<br/>&copy; 2026 Dept. OASIS, Apotek Alpro Indonesia</p>
            </div>
        `;

        const info = await transporter.sendMail({
            from: '"Alpro Hub OASIS" <no-reply@apotekalpro.id>',
            to: RECEIVER_EMAIL,
            subject: `[Alpro Hub] Daily Customer Pulse Update: ${reviews.length} New Reviews`,
            html: htmlContent,
        });

        console.log(`📧 Customer Pulse Email sent to ${RECEIVER_EMAIL}`);
        if (info.messageId && nodemailer.getTestMessageUrl(info)) {
            console.log(`Preview Email: ${nodemailer.getTestMessageUrl(info)}`);
        }
    } catch (err) {
        console.error('❌ Failed to send Customer Pulse email:', err.message);
    }
}

module.exports = {
    sendStrategicAlert,
    sendCustomerPulseAlert
};
