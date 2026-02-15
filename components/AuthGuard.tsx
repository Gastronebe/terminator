'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const publicPaths = ['/login', '/icon.png', '/logo.png', '/manifest.json'];

    useEffect(() => {
        if (!loading && !user && !publicPaths.includes(pathname)) {
            router.push('/login');
        }
    }, [user, loading, pathname, router]);

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f2f2f7',
                color: '#666'
            }}>
                <div style={{ marginBottom: 16 }}>
                    <div className="spinner"></div>
                </div>
                <div>Načítám aplikaci...</div>
                <style jsx>{`
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid #ddd;
                        border-top: 4px solid #007AFF;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!user && !publicPaths.includes(pathname)) {
        return null;
    }

    return <>{children}</>;
};

export default AuthGuard;
