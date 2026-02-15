'use client';

import AdminLayout from '@/components/AdminLayout';
import { useAccessRequests } from '@/hooks/useData';
import Card from '@/components/Card';
import styles from './page.module.css';

export default function AdminRequestsPage() {
    const { data: requests, loading } = useAccessRequests();

    const pendingRequests = requests.filter(r => r.status === 'pending');

    const handleResolve = async (id: string) => {
        if (!confirm('Označit jako vyřešené?')) return;
        try {
            await fetch(`/api/admin/requests/${id}`, { method: 'PATCH' });
            // OR direct firestore if we want to skip API for simple update,
            // but API is cleaner. For MVP let's do direct from client if rules allow,
            // or just console log for now as API route doesn't exist yet.
            // Let's implement a simple direct update since we are admin.
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            await updateDoc(doc(db, 'accessRequests', id), {
                status: 'resolved',
                resolvedAt: Date.now()
            });
        } catch (err) {
            alert('Chyba při aktualizaci');
            console.error(err);
        }
    };

    return (
        <AdminLayout>
            <h1 className={styles.title}>Žádosti o přístup</h1>

            {pendingRequests.length === 0 && (
                <p>Žádné čekající žádosti.</p>
            )}

            <div className={styles.grid}>
                {pendingRequests.map(req => (
                    <Card key={req.id} title={`Žádost: ${req.requestedByUserId}`}>
                        <p>Předplatné ID: {req.subscriptionId}</p>
                        <div className={styles.actions}>
                            <button className="btn btn-primary" onClick={() => handleResolve(req.id)}>Vyřešeno</button>
                        </div>
                    </Card>
                ))}
            </div>
        </AdminLayout>
    );
}
