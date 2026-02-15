import { NextResponse } from 'next/server';
import { fetchCalendarEvents } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic'; // Disable static optimization

export async function GET() {
    try {
        const icalUrl = process.env.ICAL_URL;
        if (!icalUrl) {
            // Return mock data if no URL is configured (to avoid crashing)
            return NextResponse.json({
                events: [],
                message: 'ICAL_URL not configured'
            });
        }

        const events = await fetchCalendarEvents(icalUrl);
        return NextResponse.json(events);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}
