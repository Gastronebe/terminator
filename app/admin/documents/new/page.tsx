'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import Card from '@/components/Card';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function NewDocumentPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [type, setType] = useState('id_card');
    const [validUntil, setValidUntil] = useState('');
    const [notifyDays, setNotifyDays] = useState('30');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const getTypeLabel = (t: string) => {
        switch (t) {
            case 'id_card': return 'Občanský průkaz';
            case 'passport': return 'Cestovní pas';
            case 'health_card': return 'Kartička pojišťovny';
            case 'drivers_license': return 'Řidičský průkaz';
            default: return t;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            await addDoc(collection(db, 'personalDocuments'), {
                type,
                ownerId: user.id,
                validUntil: new Date(validUntil).getTime(),
                notifyBeforeDays: Number(notifyDays),
                name,
                createdAt: Date.now()
            });
            router.push('/documents');
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
                <h1 className={styles.title}>Nový Doklad</h1>

                <Card>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.field}>
                            <label>Typ dokladu</label>
                            <select value={type} onChange={e => setType(e.target.value)}>
                                <option value="id_card">Občanský průkaz</option>
                                <option value="passport">Cestovní pas</option>
                                <option value="health_card">Kartička pojišťovny</option>
                                <option value="drivers_license">Řidičský průkaz</option>
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label>Jméno na dokladu</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Např. Martin"
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Platnost do</label>
                            <input
                                type="date"
                                value={validUntil}
                                onChange={e => setValidUntil(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Upozornit předem (dny)</label>
                            <input
                                type="number"
                                value={notifyDays}
                                onChange={e => setNotifyDays(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Vytvářím...' : 'Vytvořit'}
                        </button>
                    </form>
                </Card>
            </div>
        </AdminLayout>
    );
}
