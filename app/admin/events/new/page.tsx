'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import Card from '@/components/Card';
import { authFetch } from '@/lib/authFetch';

const GOOGLE_COLORS = [
    { id: '1', name: 'Levandulová', hex: '#7986cb' },
    { id: '2', name: 'Šalvějová', hex: '#33b679' },
    { id: '3', name: 'Grapfruitová', hex: '#8e24aa' },
    { id: '4', name: 'Plameňáková', hex: '#e67c73' },
    { id: '5', name: 'Banánová', hex: '#f6bf26' },
    { id: '6', name: 'Mandarinková', hex: '#f4511e' },
    { id: '7', name: 'Paví', hex: '#039be5' },
    { id: '8', name: 'Grafitová', hex: '#616161' },
    { id: '9', name: 'Borůvková', hex: '#3f51b5' },
    { id: '10', name: 'Bazalková', hex: '#0b8043' },
    { id: '11', name: 'Rajčatová', hex: '#d50000' },
];

export default function NewEventPage() {
    const router = useRouter();
    const [summary, setSummary] = useState('');
    const [occasion, setOccasion] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [allDay, setAllDay] = useState(false);
    const [colorId, setColorId] = useState('7'); // Default Peacock blue
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const start = allDay
                ? { date }
                : { dateTime: `${date}T${startTime}:00Z` }; // Using UTC for simplicity, Google might adjust

            const end = allDay
                ? { date: new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0] }
                : { dateTime: `${date}T${endTime}:00Z` };

            const finalSummary = occasion ? `[${occasion}] ${summary}` : summary;

            const res = await authFetch('/api/admin/calendar/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary: finalSummary,
                    description,
                    location,
                    colorId,
                    start,
                    end
                })
            });

            if (!res.ok) throw new Error('Failed to create event');

            router.push('/events');
        } catch (error) {
            console.error(error);
            alert('Chyba při vytváření události');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="container" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Nová událost</h1>

                <Card>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Název události</label>
                            <input
                                type="text"
                                value={summary}
                                onChange={e => setSummary(e.target.value)}
                                placeholder="Např. Kontrola u lékaře"
                                style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Příležitost / Kategorie</label>
                            <input
                                type="text"
                                value={occasion}
                                onChange={e => setOccasion(e.target.value)}
                                placeholder="Např. Lékař, Nákup, Rodina"
                                style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Barva události</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                                {GOOGLE_COLORS.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setColorId(c.id)}
                                        title={c.name}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            background: c.hex,
                                            border: colorId === c.id ? '3px solid #000' : '1px solid #ddd',
                                            cursor: 'pointer'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Datum</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="checkbox"
                                id="allDay"
                                checked={allDay}
                                onChange={e => setAllDay(e.target.checked)}
                            />
                            <label htmlFor="allDay">Celý den</label>
                        </div>

                        {!allDay && (
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Od</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={e => setStartTime(e.target.value)}
                                        style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                                    />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Do</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Místo</label>
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="Např. Ordinace Praha"
                                style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Popis</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16, fontFamily: 'inherit' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: 16,
                                padding: 14,
                                borderRadius: 8,
                                background: '#007AFF',
                                color: 'white',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: 16
                            }}
                        >
                            {loading ? 'Ukládám...' : 'Přidat do kalendáře'}
                        </button>
                    </form>
                </Card>
            </div>
        </AdminLayout>
    );
}
