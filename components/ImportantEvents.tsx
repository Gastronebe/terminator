'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import styles from './ImportantEvents.module.css';

interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: string; // ISO string from API
    end: string;
    location?: string;
    allDay?: boolean;
}

export default function ImportantEvents() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch('/api/events');
                if (!res.ok) throw new Error('Failed to fetch events');
                const data = await res.json();

                // API might return error object
                if (data.error) throw new Error(data.error);
                if (data.message) {
                    // Config missing, treat as empty
                    setEvents([]);
                } else {
                    setEvents(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error(err);
                setError('Nepodařilo se načíst události');
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    if (loading) return <Card title="Události" icon={<Calendar size={20} />}>Načítám...</Card>;
    if (error) return <Card title="Události" icon={<Calendar size={20} />} status="error">{error}</Card>;

    // Get top 3 events
    const displayEvents = events.slice(0, 3);

    // Calculate nearest event status
    let nearestStatus = 'active';
    if (events.length > 0) {
        const nearest = new Date(events[0].start);
        const now = new Date();
        const diffDays = differenceInCalendarDays(nearest, now);

        if (diffDays <= 3) nearestStatus = 'expired'; // Red for very close
        else if (diffDays <= 7) nearestStatus = 'warning'; // Orange for upcoming week
    }

    return (
        <Card title="Události" icon={<Calendar size={20} />} status={events.length > 0 ? nearestStatus : undefined}>
            {displayEvents.length > 0 ? (
                <div className={styles.list}>
                    {displayEvents.map(event => {
                        const date = new Date(event.start);
                        const diffDays = differenceInCalendarDays(date, new Date());
                        const isToday = diffDays === 0;
                        const dateString = isToday ? 'Dnes' : date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });

                        return (
                            <div key={event.id} className={styles.eventRow}>
                                <div className={styles.dateBadge}>
                                    {dateString}
                                </div>
                                <div className={styles.eventContent}>
                                    <div className={styles.eventName}>{event.summary}</div>
                                    {event.allDay && <div className={styles.eventTime}>Celý den</div>}
                                    {!event.allDay && <div className={styles.eventTime}>{date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</div>}
                                </div>
                            </div>
                        );
                    })}
                    {events.length > 3 && (
                        <div className={styles.moreLink}>
                            <Link href="/events">+ Další ({events.length - 3})</Link>
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.empty}>Žádné nadcházející události</div>
            )}
        </Card>
    );
}
