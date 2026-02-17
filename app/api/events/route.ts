import { NextRequest, NextResponse } from 'next/server';
import { listCalendarEvents } from '@/lib/googleCalendarAdmin';
import { requireAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic'; // Disable static optimization

export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const googleEvents = await listCalendarEvents(30);

        const events = googleEvents.map((e: any) => ({
            id: e.id,
            summary: e.summary,
            description: e.description,
            start: e.start.dateTime || e.start.date,
            end: e.end.dateTime || e.end.date,
            location: e.location,
            allDay: !!e.start.date,
            colorId: e.colorId
        }));

        return NextResponse.json(events);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}
