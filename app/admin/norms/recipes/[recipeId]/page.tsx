'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NormRecipe, NormCategory, NormIngredient } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Plus, X, AlertTriangle } from 'lucide-react';
import styles from './page.module.css';

export default function RecipeEditPage() {
    const params = useParams();
    const router = useRouter();
    const recipeId = typeof params?.recipeId === 'string' ? params.recipeId : '';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<NormCategory[]>([]);

    // Form State
    const [recipe, setRecipe] = useState<NormRecipe | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!recipeId) return;
            try {
                // 1. Fetch Categories
                const catSnap = await getDocs(query(collection(db, 'normCategories'), orderBy('order')));
                const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as NormCategory));
                setCategories(cats);

                // 2. Fetch Recipe
                const docRef = doc(db, 'normRecipes', recipeId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setRecipe({ id: docSnap.id, ...docSnap.data() } as NormRecipe);
                } else {
                    alert('Receptura nenalezena');
                    router.push('/admin/norms/recipes');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [recipeId, router]);

    const handleSave = async () => {
        if (!recipe) return;
        setSaving(true);
        try {
            const docRef = doc(db, 'normRecipes', recipe.id);

            // Look up category name/group based on selected ID
            const selectedCat = categories.find(c => c.id === recipe.categoryId);

            await updateDoc(docRef, {
                ...recipe,
                categoryName: selectedCat ? selectedCat.name : recipe.categoryName,
                parentGroup: selectedCat ? selectedCat.parentGroup : recipe.parentGroup,
                updatedAt: Date.now(),
                parsingError: false // Clear error flag on manual save
            });

            alert('Uloženo');
            router.push('/admin/norms/recipes');
        } catch (error) {
            console.error('Save error:', error);
            alert('Chyba při ukládání');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Opravdu chcete smazat tuto recepturu?')) return;
        try {
            await deleteDoc(doc(db, 'normRecipes', recipeId));
            router.push('/admin/norms/recipes');
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání');
        }
    };

    // Helper to update top-level fields
    const updateField = (field: keyof NormRecipe, value: any) => {
        if (!recipe) return;
        setRecipe({ ...recipe, [field]: value });
    };

    // Ingredient Helpers
    const updateIngredient = (index: number, field: keyof NormIngredient, value: any) => {
        if (!recipe) return;
        const newIngredients = [...recipe.ingredients];
        newIngredients[index] = { ...newIngredients[index], [field]: value };
        setRecipe({ ...recipe, ingredients: newIngredients });
    };

    const addIngredient = () => {
        if (!recipe) return;
        setRecipe({
            ...recipe,
            ingredients: [...recipe.ingredients, { name: '', gross: 0, net: 0, waste: 0, note: '' }]
        });
    };

    const removeIngredient = (index: number) => {
        if (!recipe) return;
        const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
        setRecipe({ ...recipe, ingredients: newIngredients });
    };

    if (loading) return <div className="p-8">Načítám...</div>;
    if (!recipe) return <div className="p-8">Chyba načítání</div>;

    return (
        <main className={`container ${styles.container}`}>
            <div className={styles.header}>
                <div className={styles.title}>
                    <Link href="/admin/norms/recipes" className={styles.backButton}>
                        <ArrowLeft size={24} />
                    </Link>
                    <h1>Editace receptury {recipe.id}</h1>
                </div>
                {(recipe as any).parsingError && (
                    <div className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1 rounded">
                        <AlertTriangle size={16} />
                        <span>Chyba parsování</span>
                    </div>
                )}
            </div>

            {/* Basic Info */}
            <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Základní údaje</h2>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Název receptury</label>
                        <input
                            className={styles.input}
                            value={recipe.title || ''}
                            onChange={e => updateField('title', e.target.value)}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Kategorie</label>
                        <select
                            className={styles.select}
                            value={recipe.categoryId}
                            onChange={e => updateField('categoryId', e.target.value)}
                        >
                            <option value="unknown">Nezařazeno</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Výtěžnost (Yield)</label>
                        <input
                            className={styles.input}
                            value={recipe.yield || ''}
                            onChange={e => updateField('yield', e.target.value)}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Sekce</label>
                        <select
                            className={styles.select}
                            value={recipe.source}
                            onChange={e => updateField('source', e.target.value)}
                        >
                            <option value="hot">Teplá kuchyně</option>
                            <option value="cold">Studená kuchyně</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Procedure */}
            <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Popis a Postup</h2>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Popis (Charakteristika)</label>
                    <textarea
                        className={styles.textarea}
                        style={{ minHeight: '80px' }}
                        value={recipe.description || ''}
                        onChange={e => updateField('description', e.target.value)}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Výrobní postup</label>
                    <textarea
                        className={styles.textarea}
                        value={recipe.procedure || ''}
                        onChange={e => updateField('procedure', e.target.value)}
                    />
                </div>
            </div>

            {/* Ingredients */}
            <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Suroviny</h2>

                <div className="mb-2 grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-2 text-sm text-gray-500 font-bold">
                    <div>Název</div>
                    <div>Hrubá (g)</div>
                    <div>Čistá (g)</div>
                    <div>Odpad (%)</div>
                    <div></div>
                </div>

                {recipe.ingredients.map((ing, idx) => (
                    <div key={idx} className={styles.ingredientRow}>
                        <input
                            className={styles.input}
                            placeholder="Název suroviny"
                            value={ing.name}
                            onChange={e => updateIngredient(idx, 'name', e.target.value)}
                        />
                        <input
                            type="number"
                            className={styles.input}
                            placeholder="Hrubá"
                            value={ing.gross || ''}
                            onChange={e => updateIngredient(idx, 'gross', parseFloat(e.target.value))}
                        />
                        <input
                            type="number"
                            className={styles.input}
                            placeholder="Čistá"
                            value={ing.net || ''}
                            onChange={e => updateIngredient(idx, 'net', parseFloat(e.target.value))}
                        />
                        <input
                            type="number"
                            className={styles.input}
                            placeholder="Odpad"
                            value={ing.waste || ''}
                            onChange={e => updateIngredient(idx, 'waste', parseFloat(e.target.value))}
                        />
                        <button onClick={() => removeIngredient(idx)} className={styles.removeButton}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}

                <button onClick={addIngredient} className={styles.addButton}>
                    <Plus size={16} /> Přidat surovinu
                </button>
            </div>

            {/* Raw Text Toggle (Debug) */}
            <div className="mb-8">
                <details className="text-sm text-gray-500 cursor-pointer">
                    <summary>Zobrazit původní text (OCR)</summary>
                    <pre className="mt-2 p-4 bg-gray-100 rounded overflow-x-auto whitespace-pre-wrap">
                        {recipe.rawText}
                    </pre>
                </details>
            </div>

            {/* Actions */}
            <div className={styles.actionFooter}>
                <button onClick={handleDelete} className={styles.deleteButton}>
                    <Trash2 size={18} /> Smazat recepturu
                </button>
                <button onClick={handleSave} className={styles.saveButton} disabled={saving}>
                    <Save size={18} />
                    {saving ? 'Ukládám...' : 'Uložit změny'}
                </button>
            </div>
        </main>
    );
}
