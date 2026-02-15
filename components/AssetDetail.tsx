'use client';

import { useState, useEffect } from 'react';
import { useAssets, useAssetItems } from '@/hooks/useData';
import Card from '@/components/Card';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { calculateStatus, formatDate } from '@/utils/status';
import Link from 'next/link';
import { Trash2, FileText, Download, Upload, ChevronLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc, writeBatch } from 'firebase/firestore';
import styles from './AssetDetail.module.css';

import { useAuth } from '@/contexts/AuthContext';
import { Tabs } from './Tabs';

// ... (OdometerForm kept simple inline or extracted, keeping inline for now to save steps but styled)
const OdometerForm = ({ assetId, currentHistory }: { assetId: string, currentHistory: any[] }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const newEntry = {
                date: new Date(date).getTime(),
                value: Number(value)
            };
            await updateDoc(doc(db, 'assets', assetId), {
                'metadata.odometerHistory': [...currentHistory, newEntry]
            });
            setValue('');
        } catch (error) {
            console.error(error);
            alert('Chyba při ukládání');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.editForm} style={{ background: 'var(--surface)', padding: 16, borderRadius: 16 }}>
            <div className={styles.editField}>
                <label>Datum</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className={styles.editField}>
                <label>Stav (km)</label>
                <input type="number" value={value} onChange={e => setValue(e.target.value)} required placeholder="150000" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '...' : 'Přidat záznam'}
            </button>
        </form>
    );
};

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

    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editPayer, setEditPayer] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [isEditingAsset, setIsEditingAsset] = useState(false);
    const [assetName, setAssetName] = useState('');
    const [assetNote, setAssetNote] = useState('');

    const [activeTab, setActiveTab] = useState('overview');

    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemDate, setNewItemDate] = useState('');
    const [newItemPayer, setNewItemPayer] = useState('');

    const accentColor = asset?.type === 'car' ? 'var(--color-cars)' : 'var(--color-properties)';

    const startEditingAsset = () => {
        if (!asset) return;
        setAssetName(asset.name);
        setAssetNote(asset.type === 'car' ? asset.metadata.spz || '' : asset.metadata.note || '');
        setIsEditingAsset(true);
    };

    useEffect(() => {
        if (isAdmin && editMode === 'true' && asset && !isEditingAsset) {
            startEditingAsset();
        }
    }, [editMode, asset, isAdmin]);

    if (!asset) {
        return <div className="container" style={{ textAlign: 'center', marginTop: 40 }}>Načítám...</div>;
    }

    // ... (Keep saveAsset, handleDeleteAsset, handleAddItem, saveItem, deleteItem logic same as before)
    const saveAsset = async () => {
        setSaving(true);
        try {
            const updates: any = { name: assetName };
            if (asset.type === 'car') updates['metadata.spz'] = assetNote;
            else updates['metadata.note'] = assetNote;
            await updateDoc(doc(db, 'assets', id), updates);
            setIsEditingAsset(false);
        } catch (error) { console.error(error); alert('Chyba'); } finally { setSaving(false); }
    };

    const handleDeleteAsset = async () => {
        if (!confirm(`Smazat ${asset.name}?`)) return;
        setDeleting(true);
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'assets', id));
            items.forEach(item => batch.delete(doc(db, 'assetItems', item.id)));
            await batch.commit();
            router.push(asset.type === 'car' ? '/assets/cars' : '/assets/properties');
        } catch (error) { console.error(error); alert('Chyba'); setDeleting(false); }
    };

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
            setIsAddingItem(false); setNewItemName(''); setNewItemPrice(''); setNewItemDate(''); setNewItemPayer('');
        } catch (error) { console.error(error); alert('Chyba'); } finally { setSaving(false); }
    };

    const startEditingItem = (item: any) => {
        setEditingItemId(item.id);
        setEditDate(new Date(item.validUntil).toISOString().split('T')[0]);
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
        } catch (error) { console.error(error); alert('Chyba'); } finally { setSaving(false); }
    };

    const deleteItem = async (itemId: string) => {
        if (!confirm('Smazat položku?')) return;
        try { await deleteDoc(doc(db, 'assetItems', itemId)); } catch (error) { console.error(error); alert('Chyba'); }
    };

    // ... (Keep handleImageUpload, handleDocumentUpload, deleteDocument logic)
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'greenCard') => {
        if (!e.target.files?.[0]) return;
        setSaving(true);
        try {
            // Simplified for brevity - reuse existing logic or import
            // Assuming direct upload for now or same logic as before
            const file = e.target.files[0];
            let url = '';
            if (file.type.startsWith('image/')) {
                const { resizeImage } = await import('@/utils/image');
                url = await resizeImage(file);
            } else { alert('Obrázek prosím'); setSaving(false); return; }

            const updates: any = {};
            if (field === 'imageUrl') updates['metadata.imageUrl'] = url;
            else if (field === 'greenCard') updates['metadata.greenCard'] = { url, validUntil: Date.now() + 31536000000 };
            await updateDoc(doc(db, 'assets', id), updates);
        } catch (error) { console.error(error); alert('Chyba'); } finally { setSaving(false); }
    };

    // ... Copy remaining methods from previous read ...
    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setSaving(true);
        try {
            let url = '';
            if (file.type === 'application/pdf') {
                if (file.size > 800000) { alert('Moc velké PDF'); setSaving(false); return; }
                url = await new Promise((r) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => r(reader.result as string); });
            } else if (file.type.startsWith('image/')) {
                const { resizeImage } = await import('@/utils/image');
                url = await resizeImage(file);
            } else { alert('PDF nebo Obrázek'); setSaving(false); return; }

            const newDoc = { name: file.name, url, type: file.type.startsWith('image/') ? 'image' : 'pdf', uploadedAt: Date.now() };
            await updateDoc(doc(db, 'assets', id), { 'metadata.otherDocuments': [...(asset.metadata.otherDocuments || []), newDoc] });
        } catch (error) { console.error(error); alert('Chyba'); } finally { setSaving(false); }
    };

    const deleteDocument = async (index: number) => {
        if (!confirm('Smazat?')) return;
        try {
            const newDocs = (asset.metadata.otherDocuments || []).filter((_: any, i: number) => i !== index);
            await updateDoc(doc(db, 'assets', id), { 'metadata.otherDocuments': newDocs });
        } catch (error) { console.error(error); alert('Chyba'); }
    };


    const backLink = asset.type === 'car' ? '/assets/cars' : '/assets/properties';

    return (
        <main className="container">
            <Link href={backLink} className={styles.backLink}>
                <ChevronLeft size={20} /> Zpět
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                <div style={{ width: 72, height: 72, position: 'relative' }}>
                    {asset.metadata.imageUrl ? (
                        <img src={asset.metadata.imageUrl} alt={asset.name} style={{ width: '100%', height: '100%', borderRadius: '20px', objectFit: 'cover', boxShadow: 'var(--shadow-md)' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', borderRadius: '20px', background: `${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                            {asset.type === 'car' ? '🚗' : '🏠'}
                        </div>
                    )}
                    {isAdmin && isEditingAsset && (
                        <label style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--accent-blue)', color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                            <Upload size={14} />
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imageUrl')} style={{ display: 'none' }} />
                        </label>
                    )}
                </div>

                <div style={{ flex: 1 }}>
                    {isEditingAsset ? (
                        <div className={styles.editAssetForm}>
                            <input className={styles.titleInput} value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="Název" />
                            <input className={styles.subtitleInput} value={assetNote} onChange={e => setAssetNote(e.target.value)} placeholder={asset.type === 'car' ? "SPZ" : "Poznámka"} />
                            <div className={styles.editActions} style={{ marginTop: 8 }}>
                                <button onClick={saveAsset} disabled={saving} className="btn-primary" style={{ padding: '8px 16px', borderRadius: 8, border: 'none', color: 'white', cursor: 'pointer' }}>Uložit</button>
                                <button onClick={() => setIsEditingAsset(false)} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#eee', cursor: 'pointer' }}>Zrušit</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <h1 className={styles.title}>{asset.name}</h1>
                            <p className={styles.subtitle}>{asset.type === 'car' ? asset.metadata.spz : asset.metadata.note}</p>
                            {isAdmin && (
                                <button onClick={startEditingAsset} style={{ position: 'absolute', top: 0, right: 0, border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                                    Upravit
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Tabs
                tabs={[
                    { id: 'overview', label: 'Přehled' },
                    { id: 'documents', label: 'Dokumenty' },
                    { id: 'odometer', label: 'Tachometr' }
                ].filter(t => asset.type === 'car' || t.id !== 'odometer')}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                accentColor={accentColor}
            />

            <div className={styles.section}>
                {activeTab === 'overview' && (
                    <>
                        {items.map(item => {
                            const isEditing = editingItemId === item.id;
                            const status = calculateStatus(item.validUntil, item.notifyBeforeDays);
                            return (
                                <Card key={item.id} title={item.name} status={!isEditing ? status : undefined}>
                                    {isEditing ? (
                                        <div className={styles.editForm}>
                                            <div className={styles.editField}><label>Platí do</label><input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></div>
                                            <div className={styles.editField}><label>Cena</label><input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} /></div>
                                            <div className={styles.editField}><label>Plátce</label><input value={editPayer} onChange={e => setEditPayer(e.target.value)} /></div>
                                            <div className={styles.editActions}>
                                                <button onClick={() => saveItem(item.id)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: 8, border: 'none', color: 'white' }}>Uložit</button>
                                                <button onClick={() => setEditingItemId(null)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#eee' }}>Zrušit</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles.itemRow}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Platnost:</span>
                                                <span style={status === 'expired' ? { color: 'var(--status-expired)', fontWeight: 600 } : { fontWeight: 500 }}>{formatDate(item.validUntil)}</span>
                                            </div>
                                            <div className={styles.itemRow}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Cena:</span>
                                                <span style={{ fontWeight: 500 }}>{item.price || 0} Kč {item.payer ? `(${item.payer})` : ''}</span>
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
                        {isAdmin && (
                            isAddingItem ? (
                                <Card title="Nová položka">
                                    <div className={styles.editForm}>
                                        <div className={styles.editField}><label>Název</label><input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Např. Pojistka" /></div>
                                        <div className={styles.editField}><label>Platnost do</label><input type="date" value={newItemDate} onChange={e => setNewItemDate(e.target.value)} /></div>
                                        <div className={styles.editField}><label>Cena</label><input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} /></div>
                                        <div className={styles.editField}><label>Plátce</label><input value={newItemPayer} onChange={e => setNewItemPayer(e.target.value)} /></div>
                                        <div className={styles.editActions}>
                                            <button onClick={handleAddItem} className="btn-primary" style={{ padding: '8px 16px', borderRadius: 8, border: 'none', color: 'white' }}>Přidat</button>
                                            <button onClick={() => setIsAddingItem(false)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#eee' }}>Zrušit</button>
                                        </div>
                                    </div>
                                </Card>
                            ) : (
                                <button onClick={() => setIsAddingItem(true)} className={styles.addItemBtn}>+ Přidat nový závazek</button>
                            )
                        )}
                    </>
                )}

                {activeTab === 'documents' && (
                    <div className={styles.grid}>
                        {/* Green Card for Cars */}
                        {asset.type === 'car' && (
                            <Card title="Zelená karta">
                                {asset.metadata.greenCard ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <img src={asset.metadata.greenCard.url} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
                                        {isAdmin && <label className="btn-primary" style={{ display: 'inline-block', marginTop: 12, padding: '8px 16px', borderRadius: 8, color: 'white', fontSize: 13, cursor: 'pointer' }}>Změnit<input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'greenCard')} style={{ display: 'none' }} /></label>}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 13 }}>
                                        Není nahrána
                                        {isAdmin && <label className="btn-primary" style={{ display: 'block', marginTop: 12, padding: '8px 16px', borderRadius: 8, color: 'white', width: 'fit-content', margin: '12px auto', cursor: 'pointer' }}>Nahrát<input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'greenCard')} style={{ display: 'none' }} /></label>}
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Other Documents */}
                        {(asset.metadata.otherDocuments || []).map((doc, i) => (
                            <Card key={i}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, background: '#f5f5f7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {doc.type === 'image' ? <img src={doc.url} style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} /> : <FileText size={20} color="#666" />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                                        <div style={{ fontSize: 11, color: '#999' }}>{new Date(doc.uploadedAt).toLocaleDateString('cs-CZ')}</div>
                                    </div>
                                    <a href={doc.url} download={doc.name} style={{ color: 'var(--accent-blue)', padding: 8 }}><Download size={18} /></a>
                                    {isAdmin && <button onClick={() => deleteDocument(i)} style={{ border: 'none', background: 'none', color: 'var(--status-expired)' }}><Trash2 size={18} /></button>}
                                </div>
                            </Card>
                        ))}

                        {isAdmin && (
                            <label className={styles.addItemBtn} style={{ display: 'block', textAlign: 'center' }}>
                                + Nahrát dokument
                                <input type="file" accept="image/*,application/pdf" onChange={handleDocumentUpload} style={{ display: 'none' }} />
                            </label>
                        )}
                    </div>
                )}

                {activeTab === 'odometer' && (
                    <div className={styles.grid}>
                        {((asset.metadata.odometerHistory || []).sort((a: any, b: any) => b.date - a.date)).map((entry: any, i: number) => (
                            <Card key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600 }}>{entry.value.toLocaleString()} km</span>
                                    <span style={{ color: '#888', fontSize: 13 }}>{new Date(entry.date).toLocaleDateString('cs-CZ')}</span>
                                </div>
                            </Card>
                        ))}
                        {isAdmin && <OdometerForm assetId={id} currentHistory={asset.metadata.odometerHistory || []} />}
                    </div>
                )}

                {isAdmin && (
                    <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <button onClick={handleDeleteAsset} style={{ width: '100%', padding: 12, color: 'var(--status-expired)', border: '1px solid var(--status-expired)', background: 'none', borderRadius: 12, fontWeight: 600 }}>
                            Smazat {asset.type === 'car' ? 'vozidlo' : 'nemovitost'}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
