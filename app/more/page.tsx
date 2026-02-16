'use client';

import CategoryCard from '@/components/CategoryCard';
import Link from 'next/link';
import { Gift, Calendar, CreditCard, PieChart, FileText, ChevronLeft, ChefHat, Camera, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function MorePage() {
    const { isAdmin, user } = useAuth();

    const hasPermission = (itemId: string) => {
        if (itemId === 'admin') return isAdmin;
        if (!user?.allowedMenuItems) return true; // Default to all if not set yet
        return user.allowedMenuItems.includes(itemId);
    };

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
                {hasPermission('birthdays') && (
                    <Link href="/birthdays">
                        <CategoryCard
                            title="Narozeniny"
                            description="Výročí"
                            icon={Gift}
                            color="var(--color-birthdays)"
                        />
                    </Link>
                )}
                {hasPermission('events') && (
                    <Link href="/events">
                        <CategoryCard
                            title="Události"
                            description="Kalendář"
                            icon={Calendar}
                            color="var(--color-events)"
                        />
                    </Link>
                )}
                {hasPermission('subscriptions') && (
                    <Link href="/subscriptions">
                        <CategoryCard
                            title="Předplatné"
                            description="Opakované platby"
                            icon={CreditCard}
                            color="var(--color-subscriptions)"
                        />
                    </Link>
                )}
                {hasPermission('finance') && (
                    <Link href="/finance">
                        <CategoryCard
                            title="Statistiky"
                            description="Přehled nákladů"
                            icon={PieChart}
                            color="var(--color-finance)"
                        />
                    </Link>
                )}
                {hasPermission('documents') && (
                    <Link href="/documents">
                        <CategoryCard
                            title="Doklady"
                            description="Osobní doklady"
                            icon={FileText}
                            color="var(--color-documents)"
                        />
                    </Link>
                )}
                {hasPermission('norms') && (
                    <Link href="/norms">
                        <CategoryCard
                            title="Normy"
                            description="Receptury (ČSN)"
                            icon={ChefHat}
                            color="#f97316" // Orange-500
                        />
                    </Link>
                )}
                {hasPermission('camera') && (
                    <Link href="/camera">
                        <CategoryCard
                            title="Kamera"
                            description="Online pohled"
                            icon={Camera} // Will import
                            color="#3b82f6" // Blue-500
                        />
                    </Link>
                )}
                {hasPermission('admin') && (
                    <Link href="/admin">
                        <CategoryCard
                            title="Administrace"
                            description="Správa systému"
                            icon={ShieldCheck}
                            color="#343a40" // Dark grey
                        />
                    </Link>
                )}
            </div>
        </main>
    );
}
