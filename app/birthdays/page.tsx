'use client';

import { useBirthdays } from '@/hooks/useData';
import Card from '@/components/Card';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/status';
import { Trash2, Edit } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function BirthdaysPage() {
    const { data: birthdays, loading } = useBirthdays();
    const { isAdmin } = useAuth();

    // Helper to calculate next birthday date
    // (This logic might be better in utils, but placing here for now)
    const getNextBirthday = (birthDateTimestamp: number) => {
        const birthDate = new Date(birthDateTimestamp);
        const today = new Date();
        const currentYear = today.getFullYear();

        let next = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

        // If birthday has passed this year, it's next year
        // We set hours to 0 to compare dates properly
        today.setHours(0, 0, 0, 0);
        if (next < today) {
            next.setFullYear(currentYear + 1);
        }

        return next;
    };

    const sortedBirthdays = [...birthdays].sort((a, b) => {
        const nextA = getNextBirthday(a.date);
        const nextB = getNextBirthday(b.date);
        return nextA.getTime() - nextB.getTime();
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Opravdu chcete smazat?')) return;
        try {
            await deleteDoc(doc(db, 'birthdays', id));
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání');
        }
    };

    return (
        <main className="container">
            <Link href="/" style={{ display: 'inline-block', marginBottom: 20, color: '#007AFF', textDecoration: 'none' }}>← Zpět</Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Narozeniny</h1>
                {isAdmin && (
                    <Link href="/admin/birthdays/new" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px', background: '#007AFF', color: 'white', borderRadius: 20, textDecoration: 'none' }}>
                        + Přidat
                    </Link>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {sortedBirthdays.map(birthday => {
                    const nextDate = getNextBirthday(birthday.date);
                    const age = nextDate.getFullYear() - new Date(birthday.date).getFullYear();
                    const daysUntil = Math.ceil((nextDate.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));

                    return (
                        <Card key={birthday.id} style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                {birthday.photoUrl ? (
                                    <img
                                        src={birthday.photoUrl}
                                        alt={birthday.name}
                                        style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    />
                                ) : (
                                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                                        🎂
                                    </div>
                                )}

                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: 18 }}>{birthday.name}</h3>
                                    <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
                                        {nextDate.toLocaleDateString('cs-CZ')} ({age} let)
                                    </p>
                                    <p style={{ margin: '4px 0 0 0', color: daysUntil <= 7 ? '#FF3B30' : '#34C759', fontWeight: 600, fontSize: 13 }}>
                                        {daysUntil === 0 ? 'Dnes!' : `Za ${daysUntil} dní`}
                                    </p>
                                </div>
                            </div>

                            {isAdmin && (
                                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
                                    <Link href={`/admin/birthdays/edit/${birthday.id}`} style={{ color: '#ccc' }}>
                                        <Edit size={16} />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(birthday.id)}
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

                {birthdays.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#888', gridColumn: '1/-1' }}>Žádné narozeniny</p>
                )}
            </div>
        </main>
    );
}
