'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import Card from '@/components/Card';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

// Reuse styles from existing forms or generic admin styles
// Since I cannot easily see page.module.css content for every file, I will assume a standard structure 
// or I can create a new css file. For now, I'll inline some styles or try to reuse if possible.
// Actually, I'll copy the structure of NewDocumentPage and assume `page.module.css` exists or I'll create it.
// To be safe, I'll create the CSS file too.

export default function NewBirthdayPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPhoto(e.target.files[0]);
        }
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let photoUrl = '';
            if (photo) {
                // Check size (e.g. max 500KB for base64 to avoid Firestore limits)
                if (photo.size > 500 * 1024) {
                    alert('Fotka je příliš velká. Maximální velikost je 500KB.');
                    setLoading(false);
                    return;
                }
                photoUrl = await convertToBase64(photo);
            }

            await addDoc(collection(db, 'birthdays'), {
                name,
                date: new Date(date).getTime(),
                photoUrl,
                createdAt: Date.now()
            });

            router.push('/birthdays');
        } catch (error) {
            console.error(error);
            alert('Chyba při vytváření');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="container" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Nové Narozeniny</h1>

                <Card>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Jméno</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Např. Babička"
                                style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Datum narození</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Fotka (max 500KB)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#007AFF', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                        >
                            {loading ? 'Vytvářím...' : 'Vytvořit'}
                        </button>
                    </form>
                </Card>
            </div>
        </AdminLayout>
    );
}
