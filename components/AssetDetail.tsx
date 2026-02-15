'use client';

import { useState, useEffect } from 'react';
import { useAssets, useAssetItems } from '@/hooks/useData';
import Card from '@/components/Card';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { calculateStatus, formatDate } from '@/utils/status';
import Link from 'next/link';
import { Trash2, FileText, Download, Upload } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import styles from './AssetDetail.module.css';

import { useAuth } from '@/contexts/AuthContext';
import { writeBatch } from 'firebase/firestore';
import { Tabs } from './Tabs';

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
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#666' }}>Datum</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
            </div>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#666' }}>Stav (km)</label>
                <input type="number" value={value} onChange={e => setValue(e.target.value)} required placeholder="150000" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 40 }}>
                {loading ? '...' : 'Přidat'}
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

    // Tabs
    const [activeTab, setActiveTab] = useState('overview');

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

    // --- Document & Image Actions ---

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'greenCard') => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setSaving(true);

        try {
            let url = '';
            // If it's an image, resize
            if (file.type.startsWith('image/')) {
                try {
                    const { resizeImage } = await import('@/utils/image');
                    url = await resizeImage(file);
                } catch (err) {
                    console.error("Resize failed", err);
                    alert("Nepodařilo se zpracovat obrázek.");
                    setSaving(false);
                    return;
                }
            } else {
                alert('Vyberte prosím obrázek.');
                setSaving(false);
                return;
            }

            const updates: any = {};
            if (field === 'imageUrl') {
                updates['metadata.imageUrl'] = url;
            } else if (field === 'greenCard') {
                updates['metadata.greenCard'] = {
                    url,
                    validUntil: Date.now() + 31536000000 // Default 1 year, user can edit?
                };
            }

            await updateDoc(doc(db, 'assets', id), updates);
        } catch (error) {
            console.error(error);
            alert('Chyba při nahrávání');
        } finally {
            setSaving(false);
        }
    };

    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setSaving(true);

        try {
            let url = '';

            if (file.type === 'application/pdf') {
                if (file.size > 800 * 1024) {
                    alert('PDF je příliš velké (max 800KB).');
                    setSaving(false);
                    return;
                }
                // Convert PDF to Base64
                url = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                });
            } else if (file.type.startsWith('image/')) {
                const { resizeImage } = await import('@/utils/image');
                url = await resizeImage(file);
            } else {
                alert('Podporovány jsou pouze PDF a obrázky.');
                setSaving(false);
                return;
            }

            const newDoc = {
                name: file.name,
                url,
                type: file.type.startsWith('image/') ? 'image' : 'pdf',
                uploadedAt: Date.now()
            };

            const currentDocs = asset.metadata.otherDocuments || [];

            await updateDoc(doc(db, 'assets', id), {
                'metadata.otherDocuments': [...currentDocs, newDoc]
            });

        } catch (error) {
            console.error(error);
            alert('Chyba při nahrávání dokumentu');
        } finally {
            setSaving(false);
        }
    };

    const deleteDocument = async (index: number) => {
        if (!confirm('Opravdu chcete smazat tento dokument?')) return;
        try {
            const currentDocs = asset.metadata.otherDocuments || [];
            const newDocs = currentDocs.filter((_, i) => i !== index);
            await updateDoc(doc(db, 'assets', id), {
                'metadata.otherDocuments': newDocs
            });
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání');
        }
    };

    const backLink = asset.type === 'car' ? '/assets/cars' : '/assets/properties';

    return (
        <main className="container">
            <Link href={backLink} className={styles.backLink}>← Zpět</Link>

            {/* Header with Photo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                {asset.metadata.imageUrl ? (
                    <div style={{ position: 'relative', width: 80, height: 80 }}>
                        <img
                            src={asset.metadata.imageUrl}
                            alt={asset.name}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        />
                        {isAdmin && isEditingAsset && (
                            <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#007AFF', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <Upload size={14} />
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imageUrl')} style={{ display: 'none' }} />
                            </label>
                        )}
                    </div>
                ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, position: 'relative' }}>
                        {asset.type === 'car' ? '🚗' : '🏠'}
                        {isAdmin && isEditingAsset && (
                            <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#007AFF', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <Upload size={14} />
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imageUrl')} style={{ display: 'none' }} />
                            </label>
                        )}
                    </div>
                )}

                <div style={{ flex: 1 }}>
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
                </div>
            </div>

            {/* Tabs Navigation */}
            <Tabs
                tabs={[
                    { id: 'overview', label: 'Přehled' },
                    { id: 'documents', label: 'Dokumenty' },
                    { id: 'odometer', label: 'Tachometr' }
                ].filter(t => asset.type === 'car' || t.id !== 'odometer')}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {activeTab === 'overview' && (
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
            )}

            {activeTab === 'documents' && (
                <section className={styles.section}>
                    {asset.type === 'car' && (
                        <>
                            <h2 className={styles.sectionTitle}>Zelená karta</h2>
                            <Card>
                                {asset.metadata.greenCard ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <img
                                            src={asset.metadata.greenCard.url}
                                            alt="Zelená karta"
                                            style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8 }}
                                        />
                                        {isAdmin && (
                                            <div style={{ marginTop: 10 }}>
                                                <label className="btn btn-primary" style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
                                                    Změnit
                                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'greenCard')} style={{ display: 'none' }} />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>
                                        <p>Zatím žádná zelená karta</p>
                                        {isAdmin && (
                                            <label className="btn btn-primary" style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: 8, display: 'inline-block', marginTop: 10 }}>
                                                <Upload size={16} style={{ marginBottom: -3, marginRight: 6 }} />
                                                Nahrát (Obrázek)
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'greenCard')} style={{ display: 'none' }} />
                                            </label>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </>
                    )}

                    <h2 className={styles.sectionTitle} style={{ marginTop: 30 }}>Dokumenty</h2>
                    <div className={styles.grid}>
                        {(asset.metadata.otherDocuments || []).map((doc, index) => (
                            <Card key={index} className={styles.documentCard}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, background: '#f0f0f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {doc.type === 'image' ? (
                                            <img src={doc.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                        ) : (
                                            <FileText size={24} color="#666" />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                                        <div style={{ fontSize: 12, color: '#999' }}>{new Date(doc.uploadedAt).toLocaleDateString('cs-CZ')}</div>
                                    </div>
                                    <a href={doc.url} download={doc.name} style={{ color: '#007AFF', padding: 8 }}>
                                        <Download size={20} />
                                    </a>
                                    {isAdmin && (
                                        <button onClick={() => deleteDocument(index)} style={{ border: 'none', background: 'none', color: '#ff3b30', cursor: 'pointer', padding: 8 }}>
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {isAdmin && (
                        <div style={{ marginTop: 20 }}>
                            <label className="btn" style={{ cursor: 'pointer', padding: '12px', border: '1px dashed #ccc', borderRadius: 8, display: 'block', textAlign: 'center', color: '#666' }}>
                                + Přidat dokument (PDF nebo Obrázek)
                                <input type="file" accept="image/*,application/pdf" onChange={handleDocumentUpload} style={{ display: 'none' }} />
                            </label>
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'odometer' && asset.type === 'car' && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Historie tachometru</h2>

                    {/* Odometer List */}
                    <div className={styles.grid}>
                        {/* We need to sort history by date desc */}
                        {((asset.metadata.odometerHistory || []).sort((a, b) => b.date - a.date)).map((entry, index) => (
                            <Card key={index}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 18 }}>{entry.value.toLocaleString()} km</div>
                                        <div style={{ fontSize: 12, color: '#888' }}>{new Date(entry.date).toLocaleDateString('cs-CZ')}</div>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {(asset.metadata.odometerHistory || []).length === 0 && (
                            <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>Zatím žádné záznamy</div>
                        )}
                    </div>

                    {isAdmin && (
                        <div style={{ marginTop: 20 }}>
                            <h3 style={{ fontSize: 16 }}>Přidat záznam</h3>
                            <OdometerForm assetId={id} currentHistory={asset.metadata.odometerHistory || []} />
                        </div>
                    )}
                </section>
            )}

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
