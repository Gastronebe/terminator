'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, orderBy, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Ensure this path is correct
import { Asset, AssetItem, PersonalDocument, Subscription, User, AccessRequest, Birthday } from '@/types';

// Generic hook helper
function useCollection<T>(collectionName: string, queryConstraints: any[] = []) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, collectionName), ...queryConstraints);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: T[] = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as unknown as T);
            });
            setData(items);
            setLoading(false);
        }, (error) => {
            console.error(`Error fetching collection ${collectionName}:`, error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionName]); // queryConstraints causing loop if not stable? For simple MVP OK.

    return { data, loading };
}

export function useAssets() {
    return useCollection<Asset>('assets');
}

export function useAssetItems() {
    return useCollection<AssetItem>('assetItems');
}

export function useSubscriptions() {
    return useCollection<Subscription>('subscriptions');
}

export function useDocuments() {
    return useCollection<PersonalDocument>('personalDocuments');
}

export function useUsers() {
    return useCollection<User>('users');
}

export function useAccessRequests() {
    return useCollection<AccessRequest>('accessRequests');
}

export function useBirthdays() {
    return useCollection<Birthday>('birthdays');
}
