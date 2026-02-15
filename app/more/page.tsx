'use client';

import CategoryCard from '@/components/CategoryCard';
import Link from 'next/link';
import { Gift, Calendar, CreditCard, PieChart, FileText, ChevronLeft } from 'lucide-react';

export default function MorePage() {
    return (
        <main className="container">
            <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <Link href="/" style={{ padding: 8, color: 'var(--accent-blue)' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Další</h1>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16
            }}>
                <Link href="/birthdays">
                    <CategoryCard
                        title="Narozeniny"
                        description="Výročí"
                        icon={Gift}
                        color="var(--color-birthdays)"
                    />
                </Link>
                <Link href="/events">
                    <CategoryCard
                        title="Události"
                        description="Kalendář"
                        icon={Calendar}
                        color="var(--color-events)"
                    />
                </Link>
                <Link href="/subscriptions">
                    <CategoryCard
                        title="Předplatné"
                        description="Opakované platby"
                        icon={CreditCard}
                        color="var(--color-subscriptions)"
                    />
                </Link>
                <Link href="/finance">
                    <CategoryCard
                        title="Statistiky"
                        description="Přehled nákladů"
                        icon={PieChart}
                        color="var(--color-finance)"
                    />
                </Link>
                <Link href="/documents">
                    <CategoryCard
                        title="Doklady"
                        description="Osobní doklady"
                        icon={FileText}
                        color="var(--color-documents)"
                    />
                </Link>
            </div>
        </main>
    );
}
