'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import Card from '@/components/Card';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import styles from './page.module.css';

export default function NewSubscriptionPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [date, setDate] = useState('');
    const [credentials, setCredentials] = useState('');
    const [note, setNote] = useState('');
    const [payer, setPayer] = useState('');
    const [trackStatus, setTrackStatus] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await addDoc(collection(db, 'subscriptions'), {
                name,
                monthlyPrice: Number(price),
                billingPeriod: period,
                nextPaymentDate: new Date(date).getTime(),
                credentials,
                note,
                payer,
                trackStatus: trackStatus,
                createdAt: Date.now()
            });
            router.push('/subscriptions');
        } catch (error) {
            console.error(error);
            alert('Chyba při vytváření');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className={styles.container}>
                <h1 className={styles.title}>Nové Předplatné</h1>

                <Card>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.field}>
                            <label>Název</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="Např. Netflix"
                            />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.field}>
                                <label>Cena (Kč)</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    required
                                />
                            </div>
                            <div className={styles.field}>
                                <label>Fakturace</label>
                                <select value={period} onChange={e => setPeriod(e.target.value as any)}>
                                    <option value="monthly">Měsíčně</option>
                                    <option value="yearly">Ročně</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label>Plátce</label>
                            <input
                                type="text"
                                placeholder="Např. Martin"
                                value={payer}
                                onChange={e => setPayer(e.target.value)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Příští platba</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.checkboxField} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 12 }}>
                            <input
                                type="checkbox"
                                checked={trackStatus}
                                onChange={e => setTrackStatus(e.target.checked)}
                                id="trackStatus"
                                style={{ width: 'auto', margin: 0 }}
                            />
                            <label htmlFor="trackStatus" style={{ margin: 0, fontWeight: 'normal' }}>Sledovat stav expirace (zobrazit v semaforu)</label>
                        </div>

                        <div className={styles.field}>
                            <label>Přihlašovací údaje (vidí jen Admin)</label>
                            <textarea
                                value={credentials}
                                onChange={e => setCredentials(e.target.value)}
                                rows={2}
                                placeholder="Login: ... Heslo: ..."
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Poznámka</label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Vytvářím...' : 'Vytvořit'}
                        </button>
                    </form>
                </Card>
            </div>
        </AdminLayout>
    );
}
