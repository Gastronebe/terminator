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
                // Fetch all categories for hot kitchen
                const q = query(collection(db, 'normCategories'), where('source', '==', 'hot'), orderBy('order'));
                const querySnapshot = await getDocs(q);
                const cats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NormCategory));
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
