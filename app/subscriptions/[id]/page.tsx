'use client';

import { useState, useEffect } from 'react';
import { useSubscriptions } from '@/hooks/useData';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import styles from './page.module.css';

export default function SubscriptionDetail() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { data: subscriptions } = useSubscriptions();
    const { user, isAdmin } = useAuth();

    // Find subscription
    const sub = subscriptions.find(s => s.id === id);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editPeriod, setEditPeriod] = useState('monthly');
    const [editDate, setEditDate] = useState('');
    const [editCredentials, setEditCredentials] = useState('');
    const [editNote, setEditNote] = useState('');
    const [editPayer, setEditPayer] = useState('');
    const [saving, setSaving] = useState(false);
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        if (sub) {
            setEditName(sub.name);
            setEditPrice(String(sub.monthlyPrice));
            setEditPeriod(sub.billingPeriod);
            setEditDate(new Date(sub.nextPaymentDate).toISOString().split('T')[0]);
            setEditCredentials(sub.credentials || '');
            setEditNote(sub.note || '');
            setEditPayer(sub.payer || '');
        }
    }, [sub]);

    if (!sub) return <div className="container" style={{ padding: 20 }}>Načítání nebo nenalezeno...</div>;

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'subscriptions', id), {
                name: editName,
                monthlyPrice: Number(editPrice),
                billingPeriod: editPeriod,
                nextPaymentDate: new Date(editDate).getTime(),
                credentials: editCredentials,
                note: editNote,
                payer: editPayer
            });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert('Chyba při ukládání');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Opravdu smazat toto předplatné?')) return;
        try {
            await deleteDoc(doc(db, 'subscriptions', id));
            router.push('/subscriptions');
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání');
        }
    };

    const handleRequestAccess = async () => {
        if (!user) return;
        setRequesting(true);
        try {
            await addDoc(collection(db, 'accessRequests'), {
                subscriptionId: id,
                requestedByUserId: user.id,
                status: 'pending',
                createdAt: Date.now()
            });
            alert('Žádost odeslána');
        } catch (error) {
            console.error(error);
            alert('Chyba při odesílání žádosti');
        } finally {
            setRequesting(false);
        }
    };

    return (
        <main className={styles.container}>
            <Link href="/subscriptions" className={styles.backLink}>← Zpět</Link>

            {isEditing ? (
                <div className={styles.editForm}>
                    <h1 className={styles.title}>Upravit předplatné</h1>
                    <Card className={styles.detailCard}>
                        <div className={styles.field}>
                            <label>Název</label>
                            <input value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className={styles.field}>
                            <label>Cena</label>
                            <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                        </div>
                        <div className={styles.field}>
                            <label>Období</label>
                            <select value={editPeriod} onChange={e => setEditPeriod(e.target.value)}>
                                <option value="monthly">Měsíčně</option>
                                <option value="yearly">Ročně</option>
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label>Další platba</label>
                            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                        </div>
                        <div className={styles.field}>
                            <label>Plátce</label>
                            <input value={editPayer} onChange={e => setEditPayer(e.target.value)} />
                        </div>
                        <div className={styles.field}>
                            <label>Přihlašovací údaje</label>
                            <textarea value={editCredentials} onChange={e => setEditCredentials(e.target.value)} rows={3} />
                        </div>
                        <div className={styles.field}>
                            <label>Poznámka</label>
                            <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={2} />
                        </div>

                        <div className={styles.editActions}>
                            <button onClick={handleSave} disabled={saving} className="btn btn-primary">Uložit</button>
                            <button onClick={() => setIsEditing(false)} disabled={saving} className="btn">Zrušit</button>
                        </div>
                    </Card>
                    <div style={{ marginTop: 20 }}>
                        <button onClick={handleDelete} className="btn-sm btn-danger" style={{ color: 'red' }}>Smazat předplatné</button>
                    </div>
                </div>
            ) : (
                <>
                    <h1 className={styles.title}>{sub.name}</h1>

                    <Card className={styles.detailCard}>
                        <div className={styles.row}>
                            <span>Cena:</span>
                            <span>{sub.monthlyPrice} Kč / {sub.billingPeriod === 'monthly' ? 'měs' : 'rok'}</span>
                        </div>
                        <div className={styles.row}>
                            <span>Plátce:</span>
                            <span>{sub.payer || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <span>Další platba:</span>
                            <span>{new Date(sub.nextPaymentDate).toLocaleDateString()}</span>
                        </div>
                        {sub.note && (
                            <div className={styles.row} style={{ display: 'block' }}>
                                <span style={{ display: 'block', marginBottom: 4 }}>Poznámka:</span>
                                <span style={{ color: 'var(--text-primary)' }}>{sub.note}</span>
                            </div>
                        )}

                        {isAdmin && sub.credentials && (
                            <div className={styles.credentials}>
                                <h3>Přihlašovací údaje</h3>
                                <p className={styles.blur}>{sub.credentials}</p>
                                <small>Viditelné pouze pro admina</small>
                            </div>
                        )}
                    </Card>

                    <div className={styles.actions}>
                        {isAdmin ? (
                            <button onClick={() => setIsEditing(true)} className="btn btn-primary">Upravit</button>
                        ) : (
                            <button onClick={handleRequestAccess} disabled={requesting} className="btn btn-primary">
                                {requesting ? 'Odesílám...' : 'Požádat o přístup'}
                            </button>
                        )}
                    </div>
                </>
            )}
        </main>
    );
}
