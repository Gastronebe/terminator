'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { resizeImage } from '@/utils/image';
import { Trash2 } from 'lucide-react';

import { useParams } from 'next/navigation';

export default function EditCardPage() {
    const params = useParams();
    const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

    const router = useRouter();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [color, setColor] = useState('#333333');
    const [note, setNote] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [codeImageUrl, setCodeImageUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchCard = async () => {
            try {
                const docRef = doc(db, 'discountCards', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setName(data.name || '');
                    setCode(data.code || '');
                    setColor(data.color || '#333333');
                    setNote(data.note || '');
                    setLogoUrl(data.logoUrl || '');
                    setCodeImageUrl(data.codeImageUrl || '');
                } else {
                    alert('Karta nenalezena');
                    router.push('/admin/cards');
                }
            } catch (error) {
                console.error('Error fetching card:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCard();
    }, [id, router]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'code') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Resize: Logo smaller (200px), Code larger (600px)
            const resized = await resizeImage(file, type === 'logo' ? 200 : 600, type === 'logo' ? 200 : 600);
            if (type === 'logo') setLogoUrl(resized);
            else setCodeImageUrl(resized);
        } catch (error) {
            console.error('Error resizing image:', error);
            alert('Chyba při zpracování obrázku');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (!id) throw new Error('Invalid ID');
            const docRef = doc(db, 'discountCards', id);
            const payload = {
                name: name || '',
                code: code || '',
                color: color || '#333333',
                note: note || '',
                logoUrl: logoUrl || '',
                codeImageUrl: codeImageUrl || ''
            };
            console.log('Saving card:', id, payload);
            await updateDoc(docRef, payload);
            router.push('/admin/cards');
        } catch (error) {
            console.error('Error updating card:', error);
            alert('Chyba při ukládání: ' + (error instanceof Error ? error.message : 'Neznámá chyba'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Opravdu chcete smazat tuto kartu?')) return;
        setSaving(true);
        try {
            if (!id) throw new Error('Invalid ID');
            await deleteDoc(doc(db, 'discountCards', id));
            router.push('/admin/cards');
        } catch (error) {
            console.error('Error deleting card:', error);
            alert('Chyba při mazání');
            setSaving(false);
        }
    };

    if (loading) return <div className="container">Načítání...</div>;

    return (
        <main className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Link href="/admin/cards" style={{ color: '#007AFF', textDecoration: 'none' }}>← Zpět</Link>
                <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer' }}>
                    <Trash2 size={24} />
                </button>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Upravit kartu</h1>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400 }}>
                {/* Name */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Název obchodu</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }} />
                </div>

                {/* Logo Upload */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Logo obchodu</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {logoUrl && <img src={logoUrl} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, border: '1px solid #eee' }} />}
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo')} />
                    </div>
                </div>

                {/* Code */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Číslo karty / Kód</label>
                    <input type="text" required value={code} onChange={e => setCode(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }} />
                </div>

                {/* Code Image Upload */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Obrázek kódu (QR/Čárový)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {codeImageUrl && (
                            <img src={codeImageUrl} alt="Code" style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee' }} />
                        )}
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'code')} />
                    </div>
                </div>

                {/* Color */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Barva karty</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)}
                            style={{ width: 50, height: 50, padding: 0, border: 'none', cursor: 'pointer' }} />
                        <div style={{ flex: 1, background: color, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                            Náhled
                        </div>
                    </div>
                </div>

                {/* Note */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Poznámka</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16, minHeight: 80 }} />
                </div>

                <button type="submit" disabled={saving}
                    style={{ background: '#007AFF', color: 'white', padding: '16px', borderRadius: 12, border: 'none', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 10 }}>
                    {saving ? 'Ukládám...' : 'Uložit změny'}
                </button>
            </form>
        </main>
    );
}
