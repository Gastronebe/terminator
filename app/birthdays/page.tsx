'use client';

import { useBirthdays } from '@/hooks/useData';
import Card from '@/components/Card';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/status';
import { Trash2, Edit } from 'lucide-react';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AddButton from '@/components/AddButton';
import { differenceInCalendarDays } from 'date-fns';

export default function BirthdaysPage() {
    const { data: birthdays, loading } = useBirthdays();
    const { isAdmin } = useAuth();

    // Unified logic to get next occurrence
    const getNextOccurrence = (date: number) => {
        const d = new Date(date);
        const today = new Date();
        const currentYear = today.getFullYear();
        let next = new Date(currentYear, d.getMonth(), d.getDate());
        today.setHours(0, 0, 0, 0);
        if (next < today) next.setFullYear(currentYear + 1);
        return next;
    };

    const allCelebrations: any[] = [];
    birthdays.forEach(person => {
        const nextBday = getNextOccurrence(person.date);
        const nextNday = person.nameDayDate ? getNextOccurrence(person.nameDayDate) : null;

        let primaryDate = nextBday;
        let primaryType = 'birthday';
        let primaryLabel = 'Narozeniny';
        let primaryIcon = '🎂';

        let secondaryDate = nextNday;
        let secondaryType = 'nameday';
        let secondaryLabel = 'Svátek';
        let secondaryOriginalDate = null;

        // If Name Day is sooner than Birthday, swap them
        if (nextNday && nextNday.getTime() < nextBday.getTime()) {
            primaryDate = nextNday;
            primaryType = 'nameday';
            primaryLabel = 'Svátek';
            primaryIcon = '🌸';

            secondaryDate = nextBday;
            secondaryType = 'birthday';
            secondaryLabel = 'Narozeniny';
            secondaryOriginalDate = person.date;
        } else if (nextNday) {
            // If Birthday is primary, Name Day is secondary
            secondaryDate = nextNday;
            secondaryType = 'nameday';
            secondaryLabel = 'Svátek';
        }

        allCelebrations.push({
            id: person.id,
            personId: person.id,
            name: person.name,
            photoUrl: person.photoUrl,
            originalDate: primaryType === 'birthday' ? person.date : person.nameDayDate,
            nextDate: primaryDate,
            type: primaryType,
            icon: primaryIcon,
            label: primaryLabel,
            secondaryDate,
            secondaryLabel,
            secondaryOriginalDate: secondaryType === 'birthday' ? person.date : null
        });
    });

    const sortedCelebrations = [...allCelebrations].sort((a, b) => {
        return a.nextDate.getTime() - b.nextDate.getTime();
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Opravdu chcete smazat osobu a všechny její oslavy?')) return;
        try {
            const docRef = doc(db, 'birthdays', id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání');
        }
    };

    if (loading) return <div className="container" style={{ padding: 20 }}>Načítám...</div>;

    return (
        <main className="container">
            <Link href="/" style={{ display: 'inline-block', marginBottom: 20, color: '#007AFF', textDecoration: 'none' }}>← Zpět</Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Oslavy</h1>
                {isAdmin && (
                    <AddButton href="/admin/birthdays/new" label="Oslavu" />
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {sortedCelebrations.map(cel => {
                    const daysUntil = Math.ceil((cel.nextDate.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                    const isBirthday = cel.type === 'birthday';
                    const age = isBirthday ? cel.nextDate.getFullYear() - new Date(cel.originalDate).getFullYear() : null;

                    return (
                        <Card key={cel.id} style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                {cel.photoUrl ? (
                                    <img
                                        src={cel.photoUrl}
                                        alt={cel.name}
                                        style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    />
                                ) : (
                                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                                        {cel.icon}
                                    </div>
                                )}

                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: 18 }}>
                                        <span style={{ marginRight: 8 }}>{cel.icon}</span>
                                        {cel.name}
                                    </h3>
                                    <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
                                        <strong>{cel.label}:</strong> {cel.nextDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })} {isBirthday && age !== null && `(${age} let)`}
                                    </p>
                                    {cel.secondaryDate && (
                                        <p style={{ margin: '2px 0 0 0', color: '#999', fontSize: 13 }}>
                                            {cel.secondaryLabel}: {cel.secondaryDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
                                            {cel.secondaryLabel === 'Narozeniny' && cel.secondaryOriginalDate && (
                                                ` (${cel.secondaryDate.getFullYear() - new Date(cel.secondaryOriginalDate).getFullYear()} let)`
                                            )}
                                        </p>
                                    )}
                                    <p style={{ margin: '4px 0 0 0', color: daysUntil <= 7 ? '#FF3B30' : '#34C759', fontWeight: 600, fontSize: 13 }}>
                                        {daysUntil === 0 ? 'Dnes!' : (daysUntil === 1 ? 'Zítra' : `Za ${daysUntil} dní`)}
                                    </p>
                                </div>
                            </div>

                            {isAdmin && (
                                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
                                    <Link href={`/admin/birthdays/edit/${cel.personId}`} style={{ color: '#ccc' }}>
                                        <Edit size={16} />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(cel.personId)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#ccc',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </Card>
                    );
                })}

                {!loading && birthdays.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#888', gridColumn: '1/-1' }}>Žádné oslavy</p>
                )}
            </div>
        </main>
    );
}
