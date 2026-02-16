import { NextResponse } from 'next/server';
import { upsertCalendarEvent, deleteCelebrationEvent } from '@/lib/googleCalendarAdmin';

export async function POST(request: Request) {
    try {
        const { summary, description, location, colorId, start, end, id } = await request.json();

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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
