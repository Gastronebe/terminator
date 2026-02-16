'use client';

import { useCalendarEvents } from '@/hooks/useData';
import styles from '@/app/page.module.css'; // Reusing dashboard styles
import { Calendar } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';

export default function ImportantEventsWidget() {
    const { data: events, loading } = useCalendarEvents();

    if (loading) return null; // Don't show anything while loading to avoid layout shift or show skeleton
    if (!events || events.length === 0) return null;

    const nearestEvent = events[0];
    const now = new Date();
    const eventDate = new Date(nearestEvent.start);

    // Calculate days until using calendar days to ignore time-of-day shifts
    const diffDays = differenceInCalendarDays(eventDate, now);

    // Logic for color/urgency
    const isUrgent = diffDays <= 3;
    const isUpcoming = diffDays <= 7;

    return (
        <div className={styles.birthdayBox} style={{ marginTop: 12, borderLeft: isUrgent ? '4px solid #ff3b30' : isUpcoming ? '4px solid #ff9500' : '4px solid #34c759' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={20} color="#007AFF" />
                </div>

                <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {diffDays <= 0 ? 'Dnes:' : diffDays === 1 ? 'Zítra:' : `Za ${diffDays} dní:`}
                    </div>
                    <div style={{ fontSize: 16, color: '#333' }}>
                        {nearestEvent.summary}
                    </div>
                </div>
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4, width: '100%', paddingLeft: 52 }}>
                {new Date(nearestEvent.start).toLocaleDateString('cs-CZ')} {nearestEvent.allDay ? '' : new Date(nearestEvent.start).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
}
