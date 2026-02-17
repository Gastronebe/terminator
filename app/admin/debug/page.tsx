'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import Card from '@/components/Card';

export default function DebugPage() {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authFetch('/api/debug/env')
            .then(res => {
                if (!res.ok) throw new Error(res.statusText);
                return res.json();
            })
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8">Načítám diagnostiku...</div>;

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <Card title="Diagnostika Prostředí">
                {error ? (
                    <div className="text-red-500">Chyba: {error}</div>
                ) : (
                    <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                )}
            </Card>
        </div>
    );
}
