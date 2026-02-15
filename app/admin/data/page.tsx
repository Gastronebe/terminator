'use client';

import AdminLayout from '@/components/AdminLayout';
import Card from '@/components/Card';
import Link from 'next/link';
import styles from './page.module.css';

export default function AdminDataPage() {
    return (
        <AdminLayout>
            <h1 className={styles.title}>Správa dat</h1>
            <p className={styles.subtitle}>Vyberte typ položky, kterou chcete přidat.</p>

            <div className={styles.grid}>
                <Link href="/admin/assets/new?type=car" className={styles.link}>
                    <Card title="Nové Auto" className={styles.card}>
                        <p>Vytvořit auto + automaticky STK, pojištění...</p>
                    </Card>
                </Link>

                <Link href="/admin/assets/new?type=property" className={styles.link}>
                    <Card title="Nová Nemovitost" className={styles.card}>
                        <p>Vytvořit nemovitost + automaticky daň, pojištění...</p>
                    </Card>
                </Link>

                <Link href="/admin/subscriptions/new" className={styles.link}>
                    <Card title="Nové Předplatné" className={styles.card}>
                        <p>Netflix, Spotify, internet...</p>
                    </Card>
                </Link>

                <Link href="/admin/documents/new" className={styles.link}>
                    <Card title="Nový Doklad" className={styles.card}>
                        <p>Občanský průkaz, pas, řidičák...</p>
                    </Card>
                </Link>
            </div>
        </AdminLayout>
    );
}
