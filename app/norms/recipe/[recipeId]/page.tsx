'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NormRecipe, NormCategory } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Clock, Scale, Utensils, Hash, Info, FileText } from 'lucide-react';

import styles from './page.module.css';

export default function RecipeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const recipeId = typeof params?.recipeId === 'string' ? params.recipeId : '';

    const [recipe, setRecipe] = useState<NormRecipe | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!recipeId) return;

        const fetchRecipe = async () => {
            try {
                const docRef = doc(db, 'normRecipes', recipeId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setRecipe({ id: docSnap.id, ...docSnap.data() } as NormRecipe);
                }
            } catch (error) {
                console.error('Error fetching recipe:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecipe();
    }, [recipeId]);

    if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Načítám recepturu...</div>;
    if (!recipe) return <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>Receptura nenalezena.</div>;

    return (
        <main className={`container ${styles.container}`}>
            {/* Header */}
            <div className={styles.navSection}>
                <Link
                    href={recipe.source === 'cold' ? `/norms/cold/${recipe.categoryId}` : `/norms/hot/${recipe.categoryId}`}
                    className={styles.backLink}
                >
                    <ArrowLeft size={16} />
                    <span>Zpět na {recipe.categoryName}</span>
                </Link>

                <div className={styles.metaTags}>
                    <span className={styles.idBadge}>{recipe.id}</span>
                    {recipe.isMinutka && (
                        <span className={styles.minutkaBadge}>
                            <Clock size={12} /> MINUTKA
                        </span>
                    )}
                </div>

                <h1 className={styles.mainTitle}>{recipe.title || 'Bez názvu'}</h1>

                <div className={styles.yieldTags}>
                    <div className={`${styles.tag} ${styles.yieldTag}`}>
                        <Scale size={16} />
                        {recipe.yield}
                    </div>
                    {recipe.portionInfo && (
                        <div className={`${styles.tag} ${styles.portionTag}`}>
                            <Info size={16} />
                            {recipe.portionInfo}
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <Info size={20} className={styles.sectionIcon} />
                    Popis pokrmu
                </h2>
                <div className={styles.descriptionBox}>
                    {recipe.description || 'Popis není k dispozici.'}
                </div>
            </section>

            {/* Recommended Side Dishes */}
            {recipe.sideDishes && recipe.sideDishes.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Utensils size={20} className={styles.sectionIcon} />
                        Doporučené přílohy
                    </h2>
                    <ul className={styles.sideDishesList}>
                        {recipe.sideDishes.map((sd, i) => (
                            <li key={i} className={styles.sideDishItem}>{sd}</li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Ingredients Table */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <Hash size={20} className={styles.sectionIcon} />
                    Suroviny
                </h2>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Surovina</th>
                                <th className="right">Hrubá (g)</th>
                                <th className="right">Odpad (g)</th>
                                <th className="right">Čistá (g)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recipe.ingredients.map((ing, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <div className={styles.ingName}>{ing.name}</div>
                                        {ing.note && <span className={styles.ingNote}>{ing.note}</span>}
                                    </td>
                                    <td className={`right ${styles.numVal}`}>{ing.gross || '—'}</td>
                                    <td className={`right ${styles.numVal} ${styles.wasteVal}`}>{ing.waste || '—'}</td>
                                    <td className={`right ${styles.numVal} ${styles.netVal}`}>{ing.net || '—'}</td>
                                </tr>
                            ))}
                            {/* Totals Row */}
                            <tr className={styles.totalRow}>
                                <td>Hmotnost celkem</td>
                                <td className={`right ${styles.numVal}`}>{recipe.totalGross || ''}</td>
                                <td className={`right ${styles.numVal} ${styles.lossVal}`}>{recipe.losses ? `-${recipe.losses}` : ''}</td>
                                <td className={`right ${styles.numVal} ${styles.finalVal}`}>{recipe.finishedAmount || ''}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {recipe.losses && (
                    <div className={styles.lossesNote}>
                        Ztráty tepelnou úpravou: {recipe.losses} g
                    </div>
                )}
            </section>

            {/* Procedure */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <FileText size={20} className={styles.sectionIcon} />
                    Výrobní postup
                </h2>
                <div className={styles.procedureText}>
                    {recipe.procedure ? (
                        recipe.procedure.split('\n').map((para, i) => (
                            <p key={i} className={styles.procedurePara}>{para}</p>
                        ))
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Postup není k dispozici.</p>
                    )}
                </div>
            </section>

            {/* References */}
            {recipe.references && recipe.references.length > 0 && (
                <section className={styles.refSection}>
                    <h3 className={styles.refTitle}>Související receptury:</h3>
                    <div className={styles.refLinks}>
                        {recipe.references.map(refId => (
                            <Link key={refId} href={`/norms/recipe/${refId}`} className={styles.refLink}>
                                {refId}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Raw Text Toggle (Debug) */}
            <details className={styles.debugDetails}>
                <summary className={styles.debugSummary}>Zobrazit původní text (Debug)</summary>
                <pre className={styles.debugPre}>
                    {recipe.rawText}
                </pre>
            </details>
        </main>
    );
}
