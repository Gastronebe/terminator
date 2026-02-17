'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';

const AppShell = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const publicPaths = ['/login', '/icon.png', '/logo.png', '/manifest.json', '/sw.js', '/workbox-'];

    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

    useEffect(() => {
        if (!loading && !user && !isPublicPath) {
            router.push('/login');
        }
    }, [user, loading, pathname, router, isPublicPath]);

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

    if (!user) {
        // Unauthenticated - only show content if public path
        if (isPublicPath) {
            return <>{children}</>;
        }
        return null; // Will redirect in useEffect
    }

    // Authenticated - show full layout
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <main style={{ flex: 1, paddingBottom: 100 }}> {/* Padding for BottomNav on mobile */}
                    {children}
                </main>
                <div className="md:hidden"> {/* Hide BottomNav on desktop */}
                    <BottomNavigation />
                </div>
            </div>
        </div>
    );
};

export default AppShell;
