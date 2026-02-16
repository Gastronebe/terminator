'use client';

import { useCalendarEvents } from '@/hooks/useData';
import Card from '@/components/Card';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import AddButton from '@/components/AddButton';

export default function EventsPage() {
    const { data: events, loading, error } = useCalendarEvents();

    return (
        <main className="container">
            <Link href="/" style={{ display: 'inline-block', marginBottom: 20, color: '#007AFF', textDecoration: 'none' }}>← Zpět</Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Důležité události</h1>
                <AddButton href="/admin/events/new" label="Událost" />
            </div>

            {loading && <p>Načítám...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {events.map((event, index) => {
                    const date = new Date(event.start);
                    const now = new Date();
                    const diffDays = differenceInCalendarDays(date, now);

                    // Parse [Category] from summary
                    const categoryMatch = event.summary.match(/^\[(.*?)\]\s*(.*)$/);
                    const category = categoryMatch ? categoryMatch[1] : null;
                    const cleanSummary = categoryMatch ? categoryMatch[2] : event.summary;

                    const googleColors: any = {
                        '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
                        '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
                        '9': '#3f51b5', '10': '#0b8043', '11': '#d50000'
                    };
                    const eventColor = googleColors[event.colorId] || '#f5f5f7';

                    let status = 'active';
                    if (diffDays <= 3) status = 'expired';
                    else if (diffDays <= 7) status = 'warning';

                    return (
                        <Card key={index} status={status}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    minWidth: 60,
                                    padding: '8px 0',
                                    textAlign: 'center',
                                    background: eventColor,
                                    color: event.colorId ? '#fff' : '#333',
                                    borderRadius: 8,
                                    fontWeight: 600
                                }}>
                                    <div style={{ fontSize: 13, textTransform: 'uppercase', opacity: 0.8 }}>
                                        {date.toLocaleDateString('cs-CZ', { month: 'short' })}
                                    </div>
                                    <div style={{ fontSize: 20 }}>
                                        {date.getDate()}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        {category && (
                                            <span style={{
                                                fontSize: 10,
                                                background: '#eee',
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                textTransform: 'uppercase',
                                                fontWeight: 700,
                                                color: '#666'
                                            }}>
                                                {category}
                                            </span>
                                        )}
                                        <div style={{ fontSize: 16, fontWeight: 600 }}>{cleanSummary}</div>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#666' }}>
                                        {event.allDay ? 'Celý den' : date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                                        {event.location && ` • ${event.location}`}
                                    </div>
                                    {event.description && (
                                        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                                            {event.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}

                {!loading && events.length === 0 && (
                    <p style={{ color: '#888', textAlign: 'center' }}>Žádné nadcházející události.</p>
                )}
            </div>
        </main>
    );
}
