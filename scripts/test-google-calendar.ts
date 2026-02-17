import { listCalendarEvents } from '../lib/googleCalendarAdmin';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGoogleCalendar() {
    console.log('Testing Google Calendar Connection...');
    console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? 'Set' : 'Missing');
    console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'Set' : 'Missing');
    // Log first few chars of key to verify it's not empty/corrupt
    const key = process.env.GOOGLE_PRIVATE_KEY || '';
    console.log('GOOGLE_PRIVATE_KEY (first 20 chars):', key.substring(0, 20).replace(/\n/g, '\\n'));
    console.log('GOOGLE_CALENDAR_ID:', process.env.GOOGLE_CALENDAR_ID ? 'Set' : 'Missing');

    try {
        console.log('Attempting to list events...');
        const events = await listCalendarEvents(5);
        console.log('Successfully fetched events:', events.length);
        events.forEach((e: any) => console.log(`- ${e.summary} (${e.start.dateTime || e.start.date})`));
        process.exit(0);
    } catch (error: any) {
        console.error('FAILED to fetch events.');
        console.error('Error message:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Full Error:', error);
        }
        process.exit(1);
    }
}

testGoogleCalendar().catch(e => {
    console.error('Unhandled script error:', e);
    process.exit(1);
});
