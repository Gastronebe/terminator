'use client';

import { useDocuments } from '@/hooks/useData';
import Card from '@/components/Card';
import Link from 'next/link';
import { calculateStatus, formatDate } from '@/utils/status';
import styles from './page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DocumentsPage() {
    const { data: documents } = useDocuments();
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

    return (
        <main className="container">
            <Link href=".." className={styles.backLink}>← Zpět</Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 className={styles.title} style={{ marginBottom: 0 }}>Osobní doklady</h1>
                {isAdmin && (
                    <Link href="/admin/documents/new" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                        + Přidat
                    </Link>
                )}
            </div>

            <div className={styles.grid}>
                {documents.map(d => {
                    const status = calculateStatus(d.validUntil, d.notifyBeforeDays);

                    return (
                        <Card key={d.id} title={mapDocType(d.type)} status={status}>
                            <div className={styles.row}>
                                <span>Platnost do:</span>
                                <span className={status === 'expired' ? styles.expired : ''}>
                                    {formatDate(d.validUntil)}
                                </span>
                            </div>
                            <div className={styles.row}>
                                <span>Jméno:</span>
                                <span>{d.name}</span>
                            </div>
                            {isAdmin && (
                                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => handleDelete(d.id)}
                                        style={{ background: 'none', border: 'none', color: '#FF453A', cursor: 'pointer', fontSize: 13 }}
                                    >
                                        Smazat
                                    </button>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
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
