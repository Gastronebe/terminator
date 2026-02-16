'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NormRecipe, NormCategory } from '@/types';
import Link from 'next/link';
import { ArrowLeft, ChefHat, Clock, Scale, Info } from 'lucide-react';

import styles from './page.module.css';

export default function CategoryRecipesPage() {
    const params = useParams();
    const router = useRouter();
    const categoryId = typeof params?.categoryId === 'string' ? params.categoryId : '';

    const [recipes, setRecipes] = useState<NormRecipe[]>([]);
    const [category, setCategory] = useState<NormCategory | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!categoryId) return;

        const fetchData = async () => {
            try {
                // Fetch Category Info
                const catDoc = await getDoc(doc(db, 'normCategories', categoryId));
                if (catDoc.exists()) {
                    setCategory({ id: catDoc.id, ...catDoc.data() } as NormCategory);
                }

                // Fetch Recipes
                const q = query(collection(db, 'normRecipes'), where('categoryId', '==', categoryId), orderBy('id'));
                const querySnapshot = await getDocs(q);
                const fetchedRecipes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NormRecipe));
                setRecipes(fetchedRecipes);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [categoryId]);

    const filteredRecipes = recipes.filter(r =>
        (r.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.includes(searchTerm)
    );

    return (
        <main className={`container ${styles.container}`}>
            <div className={styles.header}>
                <Link href="/norms/hot" className={styles.backButton}>
                    <ArrowLeft size={24} />
                </Link>
                <div className={styles.titleWrapper}>
                    <h1 className={styles.title}>{category?.name || 'Načítám...'}</h1>
                    <p className={styles.subtitle}>Norma č. {categoryId}</p>
                </div>
            </div>

            <div className={styles.searchContainer}>
                <input
                    type="text"
                    placeholder="Hledat recepturu..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Načítám receptury...</div>
            ) : (
                <div className={styles.grid}>
                    {filteredRecipes.map(recipe => (
                        <Link key={recipe.id} href={`/norms/recipe/${recipe.id}`} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.badges}>
                                    <span className={styles.idBadge}>{recipe.id}</span>
                                    {recipe.isMinutka && (
                                        <span className={styles.minutkaBadge}>
                                            <Clock size={10} /> Minutka
                                        </span>
                                    )}
                                </div>
                                <div className={styles.yield}>
                                    <Scale size={12} />
                                    {recipe.yield}
                                </div>
                            </div>
                            <h3 className={styles.cardTitle}>{recipe.title || 'Bez názvu'}</h3>
                            {recipe.portionInfo && (
                                <span className={styles.portionInfo}>
                                    <Info size={10} />
                                    {recipe.portionInfo}
                                </span>
                            )}
                        </Link>
                    ))}

                    {filteredRecipes.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Žádné receptury nenalezeny.</div>
                    )}
                </div>
            )}
        </main>
    );
}
