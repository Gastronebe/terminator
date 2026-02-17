import { NextRequest, NextResponse } from 'next/server';
import { upsertCalendarEvent } from '@/lib/googleCalendarAdmin';
import { requireAdmin } from '@/lib/apiAuth';

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    try {
        const { summary, description, location, colorId, start, end, id } = await request.json();

        if (!summary || !start || !end) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const eventData = {
            summary,
            description,
            location,
            colorId,
            start,
            end
        };

        const result = await upsertCalendarEvent(id, eventData);

        return NextResponse.json({ success: true, event: result });
    } catch (error: any) {
        console.error('Calendar Event creation error:', error);
        return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
    }
}
