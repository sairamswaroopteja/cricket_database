const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const nodemailer = require('nodemailer');

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;

console.log('--- Testing Gmail SMTP Configuration ---');
console.log('GMAIL_USER:', user ? user : '(NOT SET)');
console.log('GMAIL_APP_PASSWORD:', pass ? '****** (configured, length: ' + pass.length + ')' : '(NOT SET)');

if (!user || !pass) {
    console.error('\n❌ ERROR: GMAIL_USER or GMAIL_APP_PASSWORD is not set in server/.env');
    console.error('Please create server/.env and fill in your Gmail credentials.');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
});

console.log('\nVerifying SMTP connection...');
transporter.verify((err, success) => {
    if (err) {
        console.error('\n❌ SMTP Verification Failed:');
        console.error(err.message);
        if (err.message.includes('Username and Password not accepted') || err.message.includes('535')) {
            console.error('\n👉 Tip: Make sure you are using a 16-character Google "App Password", NOT your regular Google password.');
            console.error('Generate one here: https://myaccount.google.com/apppasswords');
        }
        process.exit(1);
    }

    console.log('✅ SMTP connection verified successfully!');
    console.log('\nSending test email to yourself (' + user + ')...');

    transporter.sendMail({
        from: `"CRICINFO Test" <${user}>`,
        to: user,
        subject: 'CRICINFO Email Test',
        text: 'Congratulations! Your CRICINFO Gmail SMTP setup is working correctly.'
    }).then((info) => {
        console.log('✅ Test email sent successfully! Message ID:', info.messageId);
        process.exit(0);
    }).catch((sendErr) => {
        console.error('❌ Failed to send test email:', sendErr.message);
        process.exit(1);
    });
});
