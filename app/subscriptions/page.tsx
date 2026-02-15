'use client';

import { useSubscriptions } from '@/hooks/useData';
import Card from '@/components/Card';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';
import { calculateStatus, formatDate } from '@/utils/status';

export default function SubscriptionsPage() {
    const { data: subscriptions, loading } = useSubscriptions();
    const { isAdmin } = useAuth();

    if (loading) return <div className="container">Načítám...</div>;

    return (
        <main className="container">
            <Link href="/" className={styles.backLink}>← Zpět</Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 className={styles.title} style={{ marginBottom: 0 }}>Předplatné</h1>
                {isAdmin && (
                    <Link href="/admin/subscriptions/new" className="btn btn-primary">
                        + Přidat
                    </Link>
                )}
            </div>

            <div className={styles.grid}>
                {subscriptions.map(sub => {
                    // Logic to determine status display. If not tracked, we might want to show gray or just 'active' visually but not alert.
                    // But here we rely on the generic card/status logic. 
                    // Let's calculate status anyway to show it in the UI, but maybe distinct if tracked or not?
                    // The user said "neobjeví se v semaforu", but on the list it probably should exist.
                    const status = sub.trackStatus !== false ? calculateStatus(sub.nextPaymentDate, 7) : 'active';

                    return (
                        <div key={sub.id} style={{ position: 'relative' }}>
                            <Link href={`/subscriptions/${sub.id}`} className={styles.link}>
                                <Card title={sub.name} status={status}>
                                    <div className={styles.row}>
                                        <span>Cena:</span>
                                        <span>{sub.monthlyPrice} Kč / {sub.billingPeriod === 'monthly' ? 'měs' : 'rok'}</span>
                                    </div>
                                    <div className={styles.row}>
                                        <span>Další platba:</span>
                                        <span className={status === 'expired' ? styles.expiredText : ''}>
                                            {formatDate(sub.nextPaymentDate)}
                                        </span>
                                    </div>
                                    {sub.payer && (
                                        <div className={styles.row} style={{ fontSize: 13, color: '#666' }}>
                                            <span>Plátce:</span>
                                            <span>{sub.payer}</span>
                                        </div>
                                    )}
                                    {sub.trackStatus === false && (
                                        <div style={{ fontSize: 12, color: '#999', marginTop: 4, fontStyle: 'italic' }}>
                                            Nesledováno
                                        </div>
                                    )}
                                </Card>
                            </Link>

                            {isAdmin && (
                                <Link
                                    href={`/admin/subscriptions/edit/${sub.id}`}
                                    className={styles.editIcon}
                                    style={{
                                        position: 'absolute',
                                        top: 12,
                                        right: 12,
                                        background: 'rgba(255,255,255,0.9)',
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--accent-blue)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        zIndex: 10,
                                        textDecoration: 'none'
                                    }}
                                >
                                    ✎
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>

            {subscriptions.length === 0 && (
                <p className={styles.empty}>Žádné předplatné</p>
            )}
        </main>
    );
}
