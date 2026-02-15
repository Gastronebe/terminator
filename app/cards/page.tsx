'use client';

import { useDiscountCards } from '@/hooks/useData';
import DiscountCardList from '@/components/DiscountCardList';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CardsPage() {
    const { data: cards, loading } = useDiscountCards();

    return (
        <main className="container" style={{ paddingBottom: 80 }}>
            <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <Link href="/" style={{ padding: 8 }}>
                    <ArrowLeft size={24} color="#007AFF" />
                </Link>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Slevové karty</h1>
            </header>

            {loading ? (
                <p>Načítám kartičky...</p>
            ) : cards.length > 0 ? (
                <DiscountCardList cards={cards} />
            ) : (
                <div style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>
                    <p>Zatím žádné karty.</p>
                </div>
            )}
        </main>
    );
}
