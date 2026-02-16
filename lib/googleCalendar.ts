import ICAL from 'ical.js';

export interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
    allDay?: boolean;
}

export async function fetchCalendarEvents(icalUrl: string): Promise<CalendarEvent[]> {
    if (!icalUrl) {
        console.warn('ICAL_URL is not defined');
        return [];
    }

    try {
        const res = await fetch(icalUrl);
        if (!res.ok) {
            console.error(`Failed to fetch ICS: ${res.status} ${res.statusText}`);
            return [];
        }
        const text = await res.text();

        const jcalData = ICAL.parse(text);
        const vcalendar = new ICAL.Component(jcalData);
        const vevents = vcalendar.getAllSubcomponents('vevent');

        const events: CalendarEvent[] = [];

        vevents.forEach((vevent: any) => {
            const event = new ICAL.Event(vevent);

            const startDate = event.startDate.toJSDate();
            const endDate = event.endDate.toJSDate();

            if (startDate && endDate) {
                // For all-day events, the end date in iCal is usually the next day at 00:00
                // but let's keep the raw dates and handle normalization in the UI.
                events.push({
                    id: event.uid,
                    summary: event.summary,
                    description: event.description,
                    start: startDate,
                    end: endDate,
                    location: event.location,
                    allDay: event.startDate.isDate
                });
            }
        });

        // Filter for future events only (and today)
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const futureEvents = events.filter(e => e.end >= now);

        // Sort by date ascending
        futureEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

        return futureEvents;
    } catch (error) {
        console.error('Error fetching/parsing iCal:', error);
        return [];
    }
}
