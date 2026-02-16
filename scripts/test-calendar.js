const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local from the project root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testCalendar() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (privateKey && privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }
    if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    privateKey = privateKey?.trim();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    console.log('--- Diagnostic Info ---');
    console.log('Client Email:', clientEmail);
    console.log('Calendar ID:', calendarId);
    if (privateKey) {
        console.log('Key Length:', privateKey.length);
        const codes = [];
        for (let i = 0; i < Math.min(100, privateKey.length); i++) {
            codes.push(privateKey.charCodeAt(i));
        }
        console.log('First 100 char codes:');
        console.log(JSON.stringify(codes));
    }
    console.log('-----------------------');

    if (!clientEmail || !privateKey || !calendarId) {
        console.error('Missing environment variables!');
        process.exit(1);
    }

    try {
        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/calendar.events']
        });

        const calendar = google.calendar({ version: 'v3', auth });
        const res = await calendar.events.list({
            calendarId,
            timeMin: new Date().toISOString(),
            maxResults: 1,
            singleEvents: true,
        });

        console.log('SUCCESS! Successfully connected and fetched events.');
        console.log('First event summary:', res.data.items?.[0]?.summary || 'No events found');
    } catch (error) {
        console.error('FAILURE! Authentication or API call failed:');
        console.error(error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testCalendar();
