'use client';

import { useSubscriptions } from '@/hooks/useData';
import Card from '@/components/Card';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';
import { calculateStatus, formatDate } from '@/utils/status';
import { ChevronLeft, Plus, Edit2 } from 'lucide-react';

export default function SubscriptionsPage() {
    const { data: subscriptions, loading } = useSubscriptions();
    const { isAdmin } = useAuth();

    if (loading) return <div className="container" style={{ marginTop: 40, textAlign: 'center' }}>Načítám...</div>;

    return (
        <main className="container">
            <Link href="/" className={styles.backLink}>
                <ChevronLeft size={20} /> Zpět
            </Link>

            <div className={styles.headerRow}>
                <h1 className={styles.title}>Předplatné</h1>
                {isAdmin && (
                    <Link href="/admin/subscriptions/new" className={styles.addBtn}>
                        <Plus size={20} />
                        <span className="hidden-mobile">Přidat</span>
                    </Link>
                )}
            </div>

            <div className={styles.grid}>
                {subscriptions.map(sub => {
                    const status = sub.trackStatus !== false ? calculateStatus(sub.nextPaymentDate, 7) : 'active';

                    return (
                        <div key={sub.id} style={{ position: 'relative' }}>
                            <Link href={`/subscriptions/${sub.id}`} className={styles.link}>
                                <Card title={sub.name} status={sub.trackStatus !== false ? status : undefined}>
                                    <div className={styles.row}>
                                        <span className={styles.label}>Cena:</span>
                                        <span className={styles.value}>{sub.monthlyPrice} Kč / {sub.billingPeriod === 'monthly' ? 'měs' : 'rok'}</span>
                                    </div>
                                    <div className={styles.row}>
                                        <span className={styles.label}>Další platba:</span>
                                        <span className={`${styles.value} ${status === 'expired' ? styles.expiredText : ''}`}>
                                            {formatDate(sub.nextPaymentDate)}
                                        </span>
                                    </div>
                                    {sub.payer && (
                                        <div className={styles.row}>
                                            <span className={styles.label}>Plátce:</span>
                                            <span className={styles.value}>{sub.payer}</span>
                                        </div>
                                    )}
                                    {sub.trackStatus === false && (
                                        <div className={styles.note}>Nesledováno</div>
                                    )}
                                </Card>
                            </Link>

                            {isAdmin && (
                                <Link href={`/admin/subscriptions/edit/${sub.id}`} className={styles.editIcon}>
                                    <Edit2 size={16} />
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>

            {subscriptions.length === 0 && (
                <div className={styles.empty}>
                    <p>Zatím žádné předplatné.</p>
                </div>
            )}
        </main>
    );
}
