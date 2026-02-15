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
import { ChevronLeft, Trash2, Edit2, CreditCard } from 'lucide-react';
import { formatDate } from '@/utils/status';

export default function SubscriptionDetail() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { data: subscriptions, loading } = useSubscriptions();
    const { user, isAdmin } = useAuth();

    const sub = subscriptions.find(s => s.id === id);

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

    if (!sub) return <div className="container" style={{ marginTop: 40, textAlign: 'center' }}>Načítám...</div>;

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
        } catch (error) { console.error(error); alert('Chyba'); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Opravdu smazat?')) return;
        try { await deleteDoc(doc(db, 'subscriptions', id)); router.push('/subscriptions'); } catch (error) { console.error(error); alert('Chyba'); }
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
        } catch (error) { console.error(error); alert('Chyba'); } finally { setRequesting(false); }
    };

    // Use AssetDetail styles for consistency where possible, or define similar here
    // Since we are overwriting the whole file, we can just use inline styles or new module classes.
    // I'll update page.module.css for this detail page too.

    return (
        <main className="container">
            <Link href="/subscriptions" className={styles.backLink}>
                <ChevronLeft size={20} /> Zpět
            </Link>

            {isEditing ? (
                <div className={styles.editSection}>
                    <h1 className={styles.title}>Upravit předplatné</h1>
                    <div className={styles.formCard}>
                        <div className={styles.field}>
                            <label>Název</label>
                            <input value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className={styles.rowField}>
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
                            <label>Poznámka</label>
                            <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={2} />
                        </div>
                        <div className={styles.field}>
                            <label>Přihlašovací údaje</label>
                            <textarea value={editCredentials} onChange={e => setEditCredentials(e.target.value)} rows={3} placeholder="Login: ... Heslo: ..." />
                        </div>

                        <div className={styles.editActions}>
                            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 12, border: 'none', color: 'white' }}>Uložit změnny</button>
                            <button onClick={() => setIsEditing(false)} disabled={saving} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#eee' }}>Zrušit</button>
                        </div>
                    </div>

                    <button onClick={handleDelete} style={{ marginTop: 24, padding: 12, width: '100%', border: 'none', background: '#ffe5e5', color: '#d32f2f', borderRadius: 12, fontWeight: 600 }}>
                        Smazat předplatné
                    </button>
                </div>
            ) : (
                <>
                    <div className={styles.header}>
                        <div className={styles.iconBox}>
                            <CreditCard size={32} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h1 className={styles.detailTitle}>{sub.name}</h1>
                            <p className={styles.detailSubtitle}>{sub.monthlyPrice} Kč / {sub.billingPeriod === 'monthly' ? 'měs' : 'rok'}</p>
                        </div>
                        {isAdmin && (
                            <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                                <Edit2 size={20} />
                            </button>
                        )}
                    </div>

                    <div className={styles.infoGrid}>
                        <Card title="Informace">
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Další platba</span>
                                <span className={styles.infoValue}>{formatDate(sub.nextPaymentDate)}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Plátce</span>
                                <span className={styles.infoValue}>{sub.payer || '-'}</span>
                            </div>
                            {sub.note && (
                                <div className={styles.infoBlock}>
                                    <span className={styles.infoLabel}>Poznámka</span>
                                    <p className={styles.noteText}>{sub.note}</p>
                                </div>
                            )}
                        </Card>

                        {isAdmin && sub.credentials && (
                            <Card title="Přihlašovací údaje" className={styles.credentialsCard}>
                                <div className={styles.credentialsBox}>
                                    {sub.credentials}
                                </div>
                            </Card>
                        )}

                        {!isAdmin && (
                            <div style={{ marginTop: 20 }}>
                                <button onClick={handleRequestAccess} disabled={requesting} className="btn-primary" style={{ width: '100%', padding: 16, borderRadius: 12 }}>
                                    {requesting ? 'Odesílám...' : 'Požádat o přístup'}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </main>
    );
}
