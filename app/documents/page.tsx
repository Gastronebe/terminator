'use client';

import { useDocuments } from '@/hooks/useData';
import Card from '@/components/Card';
import Link from 'next/link';
import { calculateStatus, formatDate } from '@/utils/status';
import styles from './page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, Plus, Trash2, FileText, User } from 'lucide-react';

export default function DocumentsPage() {
    const { data: documents, loading } = useDocuments();
    const { isAdmin } = useAuth();

    const handleDelete = async (id: string) => {
        if (!confirm('Opravdu chcete smazat tento doklad?')) return;
        try {
            await deleteDoc(doc(db, 'documents', id));
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání');
        }
    };

    if (loading) return <div className="container" style={{ marginTop: 40, textAlign: 'center' }}>Načítám...</div>;

    return (
        <main className="container">
            <Link href="/" className={styles.backLink}>
                <ChevronLeft size={20} /> Zpět
            </Link>

            <div className={styles.headerRow}>
                <h1 className={styles.title}>Osobní doklady</h1>
                {isAdmin && (
                    <Link href="/admin/documents/new" className={styles.addBtn}>
                        <Plus size={20} />
                        Doklad
                    </Link>
                )}
            </div>

            <div className={styles.grid}>
                {documents.map(d => {
                    const status = calculateStatus(d.validUntil, d.notifyBeforeDays);

                    return (
                        <Card key={d.id} title={mapDocType(d.type)} status={status} icon={<FileText size={20} />}>
                            <div className={styles.row}>
                                <span className={styles.label}>Platnost do:</span>
                                <span className={`${styles.value} ${status === 'expired' ? styles.expiredText : ''}`}>
                                    {formatDate(d.validUntil)}
                                </span>
                            </div>
                            <div className={styles.row}>
                                <span className={styles.label}>Jméno:</span>
                                <span className={styles.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <User size={14} /> {d.name}
                                </span>
                            </div>

                            {isAdmin && (
                                <div className={styles.actions}>
                                    <button onClick={() => handleDelete(d.id)} className={styles.deleteBtn}>
                                        <Trash2 size={16} /> Smazat
                                    </button>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {documents.length === 0 && (
                <div className={styles.empty}>
                    <p>Zatím žádné doklady.</p>
                </div>
            )}
        </main>
    );
}

function mapDocType(type: string): string {
    const map: Record<string, string> = {
        'id_card': 'Občanský průkaz',
        'passport': 'Cestovní pas',
        'health_card': 'Kartička pojišťovny',
        'drivers_license': 'Řidičský průkaz'
    };
    return map[type] || type;
}
