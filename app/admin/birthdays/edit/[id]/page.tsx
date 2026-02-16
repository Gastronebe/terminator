'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import Card from '@/components/Card';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css'; // Reusing styles if possible, or inline

export default function EditBirthdayPage() {
    const router = useRouter();
    const { id } = useParams();
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [nameDayDay, setNameDayDay] = useState('');
    const [nameDayMonth, setNameDayMonth] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [currentPhotoUrl, setCurrentPhotoUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, 'birthdays', id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setName(data.name);
                    // Convert timestamp to YYYY-MM-DD
                    const isoDate = new Date(data.date).toISOString().split('T')[0];
                    setDate(isoDate);

                    if (data.nameDayDate) {
                        const nd = new Date(data.nameDayDate);
                        setNameDayDay((nd.getDate()).toString());
                        setNameDayMonth((nd.getMonth() + 1).toString());
                    }

                    setCurrentPhotoUrl(data.photoUrl || '');
                } else {
                    alert('Narozeniny nenalezeny');
                    router.push('/birthdays');
                }
            } catch (error) {
                console.error("Error fetching birthday:", error);
                alert('Chyba při načítání');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPhoto(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            let photoUrl = currentPhotoUrl;
            if (photo) {
                try {
                    const { resizeImage } = await import('@/utils/image');
                    photoUrl = await resizeImage(photo);
                } catch (err) {
                    console.error("Resize failed", err);
                    alert("Nepodařilo se zpracovat obrázek.");
                    setSaving(false);
                    return;
                }
            }

            let nameDayTimestamp = null;
            if (nameDayDay && nameDayMonth) {
                const nd = new Date(2000, parseInt(nameDayMonth) - 1, parseInt(nameDayDay));
                nameDayTimestamp = nd.getTime();
            }

            await updateDoc(doc(db, 'birthdays', id as string), {
                name,
                date: new Date(date).getTime(),
                nameDayDate: nameDayTimestamp,
                photoUrl,
                updatedAt: Date.now()
            });

            router.push('/admin/birthdays');
        } catch (error) {
            console.error(error);
            alert('Chyba při ukládání');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Načítám...</div>;

    return (
        <AdminLayout>
            <div className="container" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Upravit Narozeniny</h1>

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
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Datum svátku (den a měsíc)</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <select
                                    value={nameDayDay}
                                    onChange={e => setNameDayDay(e.target.value)}
                                    style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                                >
                                    <option value="">Den</option>
                                    {[...Array(31)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}.</option>
                                    ))}
                                </select>
                                <select
                                    value={nameDayMonth}
                                    onChange={e => setNameDayMonth(e.target.value)}
                                    style={{ flex: 2, padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
                                >
                                    <option value="">Měsíc</option>
                                    {['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'].map((m, i) => (
                                        <option key={i + 1} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Fotka (automaticky se zmenší)</label>

                            {currentPhotoUrl && !photo && (
                                <div style={{ marginBottom: 8 }}>
                                    <img src={currentPhotoUrl} alt="Current" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                                    <p style={{ fontSize: 12, color: '#999', margin: 0 }}>Současná fotka</p>
                                </div>
                            )}

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                                style={{ flex: 1, padding: 12, borderRadius: 8, background: '#007AFF', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                            >
                                {saving ? 'Ukládám...' : 'Uložit změny'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                style={{ padding: 12, borderRadius: 8, background: '#f5f5f5', color: '#333', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Zrušit
                            </button>
                        </div>
                    </form>
                </Card>
            </div>
        </AdminLayout>
    );
}
