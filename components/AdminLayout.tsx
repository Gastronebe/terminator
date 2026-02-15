'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './AdminLayout.module.css';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) return <div className="container">Načítání...</div>;

    if (!isAdmin) {
        return (
            <div className="container">
                <h1>Neautorizovaný přístup</h1>
                <p>Pro přístup do této sekce musíte být administrátor.</p>
                <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>Zpět na hlavní stránku</Link>
            </div>
        );
    }

    return (
        <div className={styles.adminWrapper}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>Admin</div>
                <nav className={styles.nav}>
                    <Link href="/admin/data" className={styles.navItem}>Správa dat</Link>
                    <Link href="/admin/users" className={styles.navItem}>Uživatelé</Link>
                    <Link href="/admin/requests" className={styles.navItem}>Žádosti</Link>
                    <Link href="/" className={styles.navItem}>← Zpět do aplikace</Link>
                </nav>
            </aside>
            <main className={styles.content}>
                {children}
            </main>
        </div>
    );
}
