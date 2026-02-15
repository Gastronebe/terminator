'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import Card from '@/components/Card';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

interface DefaultItem {
    id: string;
    name: string;
    type: string;
    notifyBeforeDays: number;
    validUntil: string;
    price: string;
    note: string;
    enabled: boolean;
    payer?: string;
}

function NewAssetContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const type_param = searchParams.get('type');
    const type = (type_param === 'car' || type_param === 'property') ? type_param : 'car';

    const { user } = useAuth();
    const [name, setName] = useState('');
    const [note, setNote] = useState('');
    const [spz, setSpz] = useState('');
    const [loading, setLoading] = useState(false);
    const [defaultItems, setDefaultItems] = useState<DefaultItem[]>([]);

    useEffect(() => {
        if (type === 'car') {
            setDefaultItems([
                { id: '1', name: 'STK', type: 'stk', notifyBeforeDays: 30, validUntil: '', price: '', note: '', enabled: true },
                { id: '2', name: 'Povinné ručení', type: 'insurance', notifyBeforeDays: 30, validUntil: '', price: '', note: '', enabled: true },
                { id: '3', name: 'Dálniční známka', type: 'vignette', notifyBeforeDays: 14, validUntil: '', price: '', note: '', enabled: false }
            ]);
        } else {
            setDefaultItems([
                { id: '1', name: 'Pojištění nemovitosti', type: 'insurance', notifyBeforeDays: 30, validUntil: '', price: '', note: '', enabled: true },
                { id: '2', name: 'Daň z nemovitosti', type: 'property_tax', notifyBeforeDays: 30, validUntil: '', price: '', note: '', enabled: true },
                { id: '3', name: 'Revize komína', type: 'chimney', notifyBeforeDays: 30, validUntil: '', price: '', note: '', enabled: true }
            ]);
        }
    }, [type]);

    const handleItemChange = (id: string, field: keyof DefaultItem, value: any) => {
        setDefaultItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            const batch = writeBatch(db);
            const assetRef = doc(collection(db, 'assets'));
            batch.set(assetRef, {
                type, name, ownerId: user.id,
                metadata: type === 'car' ? { spz, note } : { note },
                createdAt: Date.now()
            });
            const itemsCollection = collection(db, 'assetItems');
            defaultItems.forEach(item => {
                if (!item.enabled) return;
                const validUntilTs = item.validUntil ? new Date(item.validUntil).getTime() : Date.now() + 31536000000;
                const itemRef = doc(itemsCollection);
                batch.set(itemRef, {
                    assetId: assetRef.id, name: item.name, type: item.type,
                    notifyBeforeDays: item.notifyBeforeDays, validUntil: validUntilTs,
                    price: item.price ? Number(item.price) : 0, note: item.note,
                    payer: item.payer || '', createdAt: Date.now()
                });
            });
            await batch.commit();
            router.push(`/assets/${type === 'car' ? 'cars' : 'properties'}/${assetRef.id}`);
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
                <h1 className={styles.title}>Nové {type === 'car' ? 'Auto' : 'Nemovitost'}</h1>
                <Card>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.sectionHeader}>Základní údaje</div>
                        <div className={styles.field}>
                            <label>Název</label>
                            <input value={name} onChange={e => setName(e.target.value)} required
                                placeholder={type === 'car' ? "Např. Škoda Octavia" : "Např. Byt Praha"} />
                        </div>
                        {type === 'car' && (
                            <div className={styles.field}>
                                <label>SPZ</label>
                                <input value={spz} onChange={e => setSpz(e.target.value)} placeholder="1A2 3456" />
                            </div>
                        )}
                        <div className={styles.field}>
                            <label>Poznámka</label>
                            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} />
                        </div>
                        <div className={styles.sectionHeader} style={{ marginTop: 24 }}>Automatické položky (Závazky)</div>
                        <p className={styles.hint}>Vyberte, které položky vytvořit. Nevyplněné datum se nastaví na rok od teď.</p>
                        {defaultItems.map(item => (
                            <div key={item.id} className={styles.itemRow} style={{ opacity: item.enabled ? 1 : 0.6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <input type="checkbox" checked={item.enabled}
                                        onChange={e => handleItemChange(item.id, 'enabled', e.target.checked)}
                                        style={{ width: 20, height: 20 }} />
                                    <div className={styles.itemName} style={{ marginBottom: 0 }}>{item.name}</div>
                                </div>
                                {item.enabled && (
                                    <div className={styles.itemFields}>
                                        <div className={styles.fieldSm}>
                                            <label>Platnost do</label>
                                            <input type="date" value={item.validUntil}
                                                onChange={e => handleItemChange(item.id, 'validUntil', e.target.value)} />
                                        </div>
                                        <div className={styles.fieldSm}>
                                            <label>Cena (Kč/rok)</label>
                                            <input type="number" placeholder="0" value={item.price}
                                                onChange={e => handleItemChange(item.id, 'price', e.target.value)} />
                                        </div>
                                        <div className={styles.fieldSm}>
                                            <label>Plátce</label>
                                            <input type="text" placeholder="Např. Martin" value={item.payer || ''}
                                                onChange={e => handleItemChange(item.id, 'payer', e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 16 }}>
                            {loading ? 'Vytvářím...' : 'Vytvořit'}
                        </button>
                    </form>
                </Card>
            </div>
        </AdminLayout>
    );
}

export default function NewAssetPage() {
    return (
        <Suspense fallback={<div>Načítání...</div>}>
            <NewAssetContent />
        </Suspense>
    );
}