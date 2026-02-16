import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export async function getGoogleCalendarClient() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (privateKey && privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Remove potential surrounding quotes from .env
    if (privateKey?.startsWith('"') && privateKey?.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }

    privateKey = privateKey?.trim();

    if (!clientEmail || !privateKey) {
        throw new Error('Google Calendar credentials not configured');
    }

    const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: SCOPES
    });

    return google.calendar({ version: 'v3', auth });
}

export interface CalendarEventData {
    summary: string;
    description: string;
    start: {
        dateTime?: string;
        date?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
    };
    location?: string;
    colorId?: string;
    recurrence?: string[];
}

export async function upsertCalendarEvent(eventId: string | undefined, event: CalendarEventData) {
    const calendar = await getGoogleCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    const resource = {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        colorId: event.colorId,
        recurrence: event.recurrence,
        transparency: event.start.date ? 'transparent' : 'opaque',
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 24 * 60 },
                { method: 'popup', minutes: 7 * 24 * 60 },
            ],
        },
    };

    if (eventId) {
        try {
            const res = await calendar.events.patch({
                calendarId,
                eventId,
                requestBody: resource,
            });
            return res.data;
        } catch (error: any) {
            if (error.code === 404) {
                const res = await calendar.events.insert({
                    calendarId,
                    requestBody: resource,
                });
                return res.data;
            }
            throw error;
        }
    } else {
        const res = await calendar.events.insert({
            calendarId,
            requestBody: resource,
        });
        return res.data;
    }
}

export async function listCalendarEvents(maxResults = 20) {
    const calendar = await getGoogleCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    const res = await calendar.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
    });

    return res.data.items || [];
}

export async function deleteCelebrationEvent(eventId: string) {
    const calendar = await getGoogleCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    try {
        await calendar.events.delete({
            calendarId,
            eventId,
        });
    } catch (error: any) {
        if (error.code !== 404) {
            throw error;
        }
    }
}
