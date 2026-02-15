'use client';

import { useCalendarEvents } from '@/hooks/useData';
import Card from '@/components/Card';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

export default function EventsPage() {
    const { data: events, loading, error } = useCalendarEvents();

    return (
        <main className="container">
            <Link href="/" style={{ display: 'inline-block', marginBottom: 20, color: '#007AFF', textDecoration: 'none' }}>← Zpět</Link>

            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Důležité události</h1>

            {loading && <p>Načítám...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {events.map((event, index) => {
                    const date = new Date(event.start);
                    const now = new Date();
                    const diffDays = Math.ceil((date.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));

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
                                    background: '#f5f5f7',
                                    borderRadius: 8,
                                    fontWeight: 600
                                }}>
                                    <div style={{ fontSize: 13, textTransform: 'uppercase', color: '#888' }}>
                                        {date.toLocaleDateString('cs-CZ', { month: 'short' })}
                                    </div>
                                    <div style={{ fontSize: 20, color: '#333' }}>
                                        {date.getDate()}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{event.summary}</div>
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
