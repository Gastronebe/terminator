'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NormCategory } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';

import styles from './page.module.css';

export default function HotKitchenPage() {
    const [categories, setCategories] = useState<NormCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // 1. Fetch Categories
                const q = query(collection(db, 'normCategories'), where('source', '==', 'hot'), orderBy('order'));
                const querySnapshot = await getDocs(q);
                let cats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NormCategory));

                // 2. Fetch All Recipes (for accurate counts)
                // Optimization: In a huge app, we'd use aggregation queries or cloud functions.
                // For < 2000 items, client-side counting is acceptable and robust.
                const qRecipes = query(collection(db, 'normRecipes')); // We could filter by source='hot' but categoryId check is safer
                const recipeSnap = await getDocs(qRecipes);

                const counts: Record<string, number> = {};
                recipeSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const catId = String(data.categoryId).trim();
                    if (catId) {
                        counts[catId] = (counts[catId] || 0) + 1;
                    }
                });

                // 3. Merge counts
                cats = cats.map(c => ({
                    ...c,
                    recipeCount: counts[c.id] || 0
                }));

                setCategories(cats);
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    // Group categories by Parent Group
    const groupedCategories = categories.reduce((acc, cat) => {
        const group = cat.parentGroup || 'Ostatní';
        if (!acc[group]) acc[group] = [];
        acc[group].push(cat);
        return acc;
    }, {} as Record<string, NormCategory[]>);

    const filteredGroups = Object.keys(groupedCategories).reduce((acc, group) => {
        const filteredCats = groupedCategories[group].filter(cat =>
            cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filteredCats.length > 0) {
            acc[group] = filteredCats;
        }
        return acc;
    }, {} as Record<string, NormCategory[]>);

    return (
        <main className={`container ${styles.container}`}>
            <div className={styles.header}>
                <Link href="/norms" className={styles.backButton}>
                    <ArrowLeft size={24} />
                </Link>
                <h1 className={styles.title}>Teplá kuchyně</h1>
            </div>

            {/* Search */}
            <div className={styles.searchContainer}>
                <Search className={styles.searchIcon} size={20} />
                <input
                    type="text"
                    placeholder="Hledat kategorii..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Načítám kategorie...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {Object.keys(filteredGroups).map(group => (
                        <div key={group}>
                            <h2 className={styles.groupTitle}>{group}</h2>
                            <div className={styles.grid}>
                                {filteredGroups[group].map(cat => (
                                    <Link key={cat.id} href={`/norms/hot/${cat.id}`} className={styles.card}>
                                        <div className={styles.cardContent}>
                                            <div className={styles.id}>{cat.id}</div>
                                            <div className={styles.name}>{cat.name}</div>
                                        </div>
                                        <div className={styles.countBadge}>
                                            {cat.recipeCount || '?'}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}

                    {Object.keys(filteredGroups).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Žádné kategorie nenalezeny.</div>
                    )}
                </div>
            )}
        </main>
    );
}
