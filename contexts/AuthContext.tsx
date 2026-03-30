'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    loading: true,
    isAdmin: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);

            if (fbUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
                    if (userDoc.exists()) {
                        setUser({ id: userDoc.id, ...userDoc.data() } as User);
                    } else {
                        // Fallback: user exists in Auth but not in Firestore
                        // Set basic user so AppShell doesn't redirect back to /login
                        console.warn('User document not found in Firestore – using fallback');
                        setUser({
                            id: fbUser.uid,
                            email: fbUser.email ?? '',
                            role: 'user' as UserRole,
                            name: fbUser.displayName ?? '',
                            createdAt: Date.now(),
                        } as User);
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    // Fallback i při chybě (např. chybějící oprávnění ve Firestore rules)
                    setUser({
                        id: fbUser.uid,
                        email: fbUser.email ?? '',
                        role: 'user' as UserRole,
                        name: fbUser.displayName ?? '',
                        createdAt: Date.now(),
                    } as User);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        user,
        firebaseUser,
        loading,
        isAdmin: user?.role === 'admin',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
