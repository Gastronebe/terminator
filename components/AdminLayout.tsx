'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) return <div className="container" style={{ marginTop: 40, textAlign: 'center' }}>Načítám...</div>;

    if (!isAdmin) {
        return (
            <div className="container" style={{ marginTop: 40, textAlign: 'center' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700 }}>Neautorizovaný přístup</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '16px 0' }}>Pro přístup do této sekce musíte být administrátor.</p>
                <Link href="/" className="btn btn-primary">Zpět na domovskou stránku</Link>
            </div>
        );
    }

    return (
        <div className="container">
            {children}
        </div>
    );
}
