'use client';

import { useState, useEffect } from 'react';
import { useAssets, useAssetItems } from '@/hooks/useData';
import Card from '@/components/Card';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { calculateStatus, formatDate } from '@/utils/status';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import styles from './AssetDetail.module.css';

import { useAuth } from '@/contexts/AuthContext';
import { writeBatch } from 'firebase/firestore';

export default function AssetDetail() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { user, isAdmin } = useAuth();
    const searchParams = useSearchParams();
    const editMode = searchParams.get('edit');

    const { data: allAssets } = useAssets();
    const { data: allItems } = useAssetItems();

    const asset = allAssets.find(a => a.id === id);
    const items = allItems.filter(i => i.assetId === id);

    // Editing Item State
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editPayer, setEditPayer] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Asset Editing State
    const [isEditingAsset, setIsEditingAsset] = useState(false);
    const [assetName, setAssetName] = useState('');
    const [assetNote, setAssetNote] = useState(''); // SPZ only for car, note for both

    // New Item State
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemDate, setNewItemDate] = useState('');
    const [newItemPayer, setNewItemPayer] = useState('');

    const startEditingAsset = () => {
        if (!asset) return;
        setAssetName(asset.name);
        setAssetNote(asset.type === 'car' ? asset.metadata.spz || '' : asset.metadata.note || '');
        setIsEditingAsset(true);
    };

    // Use effect to handle initial load edit mode
    useEffect(() => {
        if (isAdmin && editMode === 'true' && asset && !isEditingAsset) {
            startEditingAsset();
        }
    }, [editMode, asset, isAdmin]);

    if (!asset) {
        return <div className="container">Nenalezeno</div>;
    }

    const saveAsset = async () => {
        setSaving(true);
        try {
            const updates: any = { name: assetName };
            if (asset.type === 'car') {
                updates['metadata.spz'] = assetNote;
            } else {
                updates['metadata.note'] = assetNote;
            }

            await updateDoc(doc(db, 'assets', id), updates);
            setIsEditingAsset(false);
        } catch (error) {
            console.error(error);
            alert('Chyba při ukládání');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAsset = async () => {
        if (!confirm(`Opravdu chcete smazat ${asset.name} a všechny jeho položky?`)) return;
        setDeleting(true);
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'assets', id));
            items.forEach(item => {
                batch.delete(doc(db, 'assetItems', item.id));
            });
            await batch.commit();
            router.push(asset.type === 'car' ? '/assets/cars' : '/assets/properties');
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání');
            setDeleting(false);
        }
    };

    // --- Item Actions ---

    const handleAddItem = async () => {
        setSaving(true);
        try {
            await addDoc(collection(db, 'assetItems'), {
                assetId: id,
                name: newItemName || 'Nová položka',
                type: 'other',
                validUntil: newItemDate ? new Date(newItemDate).getTime() : Date.now() + 31536000000,
                notifyBeforeDays: 30,
                price: Number(newItemPrice),
                payer: newItemPayer,
                createdAt: Date.now()
            });
            setIsAddingItem(false);
            setNewItemName('');
            setNewItemPrice('');
            setNewItemDate('');
            setNewItemPayer('');
        } catch (error) {
            console.error(error);
            alert('Chyba při přidávání');
        } finally {
            setSaving(false);
        }
    };

    const startEditingItem = (item: any) => {
        setEditingItemId(item.id);
        const date = new Date(item.validUntil);
        setEditDate(date.toISOString().split('T')[0]);
        setEditPrice(item.price || '');
        setEditPayer(item.payer || '');
    };

    const saveItem = async (itemId: string) => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'assetItems', itemId), {
                validUntil: new Date(editDate).getTime(),
                price: Number(editPrice),
                payer: editPayer
            });
            setEditingItemId(null);
        } catch (error) {
            console.error(error);
            alert('Chyba při ukládání');
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (itemId: string) => {
        if (!confirm('Opravdu chcete smazat tuto položku?')) return;
        try {
            await deleteDoc(doc(db, 'assetItems', itemId));
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání');
        }
    };

    const backLink = asset.type === 'car' ? '/assets/cars' : '/assets/properties';

    return (
        <main className="container">
            <Link href={backLink} className={styles.backLink}>← Zpět</Link>

            {/* Asset Header & Editing */}
            {isEditingAsset ? (
                <div className={styles.editAssetForm}>
                    <input
                        className={styles.titleInput}
                        value={assetName}
                        onChange={e => setAssetName(e.target.value)}
                        placeholder="Název"
                    />
                    <input
                        className={styles.subtitleInput}
                        value={assetNote}
                        onChange={e => setAssetNote(e.target.value)}
                        placeholder={asset.type === 'car' ? "SPZ" : "Poznámka"}
                    />
                    <div className={styles.editActions} style={{ marginTop: 8 }}>
                        <button onClick={saveAsset} disabled={saving} className="btn-sm btn-primary">Uložit</button>
                        <button onClick={() => setIsEditingAsset(false)} disabled={saving} className="btn-sm">Zrušit</button>
                    </div>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    <h1 className={styles.title}>{asset.name}</h1>
                    <p className={styles.subtitle}>
                        {asset.type === 'car' ? asset.metadata.spz : asset.metadata.note}
                    </p>
                    {isAdmin && (
                        <button
                            onClick={startEditingAsset}
                            style={{ position: 'absolute', top: 0, right: 0, border: 'none', background: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}
                        >
                            Upravit
                        </button>
                    )}
                </div>
            )}

            <section className={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className={styles.sectionTitle}>Závazky</h2>
                </div>

                <div className={styles.grid}>
                    {items.map(item => {
                        const isEditing = editingItemId === item.id;
                        const status = calculateStatus(item.validUntil, item.notifyBeforeDays);

                        return (
                            <Card key={item.id} title={item.name} status={!isEditing ? status : 'active'}>
                                {isEditing ? (
                                    <div className={styles.editForm}>
                                        <div className={styles.editField}>
                                            <label>Platí do:</label>
                                            <input
                                                type="date"
                                                value={editDate}
                                                onChange={e => setEditDate(e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.editField}>
                                            <label>Cena:</label>
                                            <input
                                                type="number"
                                                value={editPrice}
                                                onChange={e => setEditPrice(e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.editField}>
                                            <label>Plátce:</label>
                                            <input
                                                type="text"
                                                value={editPayer}
                                                onChange={e => setEditPayer(e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.editActions}>
                                            <button onClick={() => saveItem(item.id)} disabled={saving} className="btn-sm btn-primary">Uložit</button>
                                            <button onClick={() => setEditingItemId(null)} disabled={saving} className="btn-sm">Zrušit</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles.itemRow}>
                                            <span>Platné do:</span>
                                            <span className={status === 'expired' ? styles.expiredText : ''}>
                                                {formatDate(item.validUntil)}
                                            </span>
                                        </div>
                                        <div className={styles.itemRow}>
                                            <span>Cena:</span>
                                            <span>{item.price || 0} Kč {item.payer ? `(${item.payer})` : ''}</span>
                                        </div>
                                        {isAdmin && (
                                            <div className={styles.actions}>
                                                <button onClick={() => startEditingItem(item)} className={styles.actionBtn}>Upravit</button>
                                                <button onClick={() => deleteItem(item.id)} className={styles.actionBtnDelete}>Smazat</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </Card>
                        );
                    })}

                    {/* Add Item Card */}
                    {isAdmin && (
                        isAddingItem ? (
                            <Card title="Nová položka" className={styles.newItemCard}>
                                <div className={styles.editForm}>
                                    <div className={styles.editField}>
                                        <label>Název</label>
                                        <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Např. Pojistka" />
                                    </div>
                                    <div className={styles.editField}>
                                        <label>Platnost do</label>
                                        <input type="date" value={newItemDate} onChange={e => setNewItemDate(e.target.value)} />
                                    </div>
                                    <div className={styles.editField}>
                                        <label>Cena</label>
                                        <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0" />
                                    </div>
                                    <div className={styles.editField}>
                                        <label>Plátce</label>
                                        <input value={newItemPayer} onChange={e => setNewItemPayer(e.target.value)} placeholder="Např. Martin" />
                                    </div>
                                    <div className={styles.editActions}>
                                        <button onClick={handleAddItem} disabled={saving} className="btn-sm btn-primary">Přidat</button>
                                        <button onClick={() => setIsAddingItem(false)} disabled={saving} className="btn-sm">Zrušit</button>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <button onClick={() => setIsAddingItem(true)} className={styles.addItemBtn}>
                                + Přidat nový závazek
                            </button>
                        )
                    )}
                </div>
            </section>

            {isAdmin && (
                <div style={{ marginTop: 40, borderTop: '1px solid #eee', paddingTop: 20 }}>
                    <button
                        onClick={handleDeleteAsset}
                        disabled={deleting}
                        className="btn-danger"
                        style={{ width: '100%', padding: '12px', background: '#ffe5e5', color: '#d32f2f', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                    >
                        {deleting ? 'Mažu...' : `Smazat ${asset.type === 'car' ? 'auto' : 'nemovitost'}`}
                    </button>
                </div>
            )}
        </main>
    );
}
