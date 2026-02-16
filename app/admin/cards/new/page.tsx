'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { resizeImage } from '@/utils/image';

export default function NewCardPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [color, setColor] = useState('#333333');
    const [note, setNote] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [codeImageUrl, setCodeImageUrl] = useState('');
    const [loading, setLoading] = useState(false);

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
        setLoading(true);

        try {
            await addDoc(collection(db, 'discountCards'), {
                name,
                code,
                color,
                note,
                logoUrl,
                codeImageUrl,
                type: 'text', // Default to text/barcode later
                createdAt: Date.now()
            });
            router.push('/admin/cards');
        } catch (error) {
            console.error('Error adding card:', error);
            alert('Chyba při ukládání');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="container">
            <Link href="/admin/cards" style={{ display: 'inline-block', marginBottom: 20, color: '#007AFF', textDecoration: 'none' }}>← Zpět</Link>

            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Nová karta</h1>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400 }}>
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Název obchodu</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Např. Tesco, IKEA..."
                        style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                    />
                </div>

                {/* Logo Upload */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Logo obchodu</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {logoUrl && <img src={logoUrl} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, border: '1px solid #eee' }} />}
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logo')} />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Číslo karty / Kód</label>
                    <input
                        type="text"
                        required
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        placeholder="Např. 633100..."
                        style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                    />
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

                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Barva karty</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            type="color"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            style={{ width: 50, height: 50, padding: 0, border: 'none', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, background: color, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                            Náhled
                        </div>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Poznámka</label>
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16, minHeight: 80 }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        background: '#007AFF',
                        color: 'white',
                        padding: '16px',
                        borderRadius: 12,
                        border: 'none',
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: 10
                    }}
                >
                    {loading ? 'Ukládám...' : 'Uložit kartu'}
                </button>
            </form>
        </main>
    );
}
