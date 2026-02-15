'use client';

import { useDiscountCards } from '@/hooks/useData';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminCardsPage() {
    const { data: cards } = useDiscountCards();

    const handleDelete = async (id: string) => {
        if (confirm('Opravdu smazat tuto kartu?')) {
            await deleteDoc(doc(db, 'discountCards', id));
        }
    };

    return (
        <main className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700 }}>Správa karet</h1>
                <Link href="/admin/cards/new" style={{
                    background: '#007AFF',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    fontWeight: 500
                }}>
                    <Plus size={20} /> Přidat
                </Link>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cards.map(card => (
                    <div key={card.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'white', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 25, background: card.color || '#333', borderRadius: 4 }}></div>
                            <div>
                                <div style={{ fontWeight: 600 }}>{card.name}</div>
                                <div style={{ fontSize: 13, color: '#666', fontFamily: 'monospace' }}>{card.code}</div>
                            </div>
                        </div>
                        <button onClick={() => handleDelete(card.id)} style={{ padding: 8, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={20} />
                        </button>
                    </div>
                ))}
            </div>
        </main>
    );
}
