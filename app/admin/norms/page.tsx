'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NormCategory } from '@/types';
import Link from 'next/link';
import { Edit2, Trash2, Plus, ChefHat, ExternalLink, RefreshCw } from 'lucide-react';
import styles from './page.module.css';

export default function NormsAdminPage() {
    const [categories, setCategories] = useState<NormCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState<NormCategory | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        parentGroup: '',
        source: 'hot', // 'hot' | 'cold'
        order: 0
    });

    const fetchCategories = async () => {
        try {
            setLoading(true);

            // 1. Fetch Categories
            const qCats = query(collection(db, 'normCategories'), orderBy('order'));
            const catSnap = await getDocs(qCats);
            let cats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NormCategory));

            // 2. Fetch All Recipes (to calculate counts accurately)
            // We fetch all to be accurate. If optimizing, we could rely on a counter, but this is safer for Admin.
            const qRecipes = query(collection(db, 'normRecipes'));
            const recipeSnap = await getDocs(qRecipes);

            // 3. Count recipes per category
            const counts: Record<string, number> = {};
            recipeSnap.docs.forEach(doc => {
                const data = doc.data();
                const catId = String(data.categoryId).trim(); // Force string comparison
                if (catId) {
                    counts[catId] = (counts[catId] || 0) + 1;
                }
            });

            console.log('Calculated Counts:', counts); // Debug log

            // 4. Merge counts into categories
            cats = cats.map(c => {
                const cId = String(c.id).trim();
                const count = counts[cId] || 0;
                // console.log(`Category ${cId}: ${count}`);
                return {
                    ...c,
                    recipeCount: count
                };
            });

            setCategories(cats);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Group categories
    const groupedCategories = categories.reduce((acc, cat) => {
        const group = cat.parentGroup || 'Ostatní';
        if (!acc[group]) acc[group] = [];
        acc[group].push(cat);
        return acc;
    }, {} as Record<string, NormCategory[]>);

    const handleEdit = (cat: NormCategory) => {
        setEditingCategory(cat);
        setFormData({
            id: cat.id,
            name: cat.name,
            parentGroup: cat.parentGroup,
            source: cat.source || 'hot',
            order: cat.order
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingCategory(null);
        setFormData({
            id: '',
            name: '',
            parentGroup: 'POLÉVKY',
            source: 'hot',
            order: categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 100
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editingCategory) {
                // Update existing
                const docRef = doc(db, 'normCategories', editingCategory.id);
                await updateDoc(docRef, {
                    name: formData.name,
                    parentGroup: formData.parentGroup,
                    order: Number(formData.order) // Ensure number
                });
            } else {
                // Create new
                const newId = formData.id.trim();
                if (!newId) return alert('ID je povinné (např. 101)');

                // Check collision (optional but good UI)
                const docRef = doc(db, 'normCategories', newId);
                await setDoc(docRef, {
                    name: formData.name,
                    parentGroup: formData.parentGroup,
                    order: Number(formData.order),
                    source: 'hot', // Default
                    recipeCount: 0
                });
            }
            setShowModal(false);
            fetchCategories();
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Chyba při ukládání: ' + error);
        }
    };

    return (
        <main className={`container ${styles.container}`}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    <ChefHat size={32} className="text-orange-500" />
                    Správa kategorií norem
                </h1>
                <div className={styles.actions}>
                    <button onClick={fetchCategories} className={styles.secondaryButton} title="Obnovit">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={handleCreate} className={styles.primaryButton}>
                        <Plus size={16} /> Nová kategorie
                    </button>
                    <Link href="/admin/norms/recipes" className={styles.secondaryButton}>
                        Správa receptur <ExternalLink size={16} />
                    </Link>
                </div>
            </div>

            {loading ? (
                <div>Načítám...</div>
            ) : (
                <div>
                    {Object.keys(groupedCategories).map(group => (
                        <div key={group} className={styles.groupSection}>
                            <div className={styles.groupHeader}>
                                <h2 className={styles.groupTitle}>{group}</h2>
                                <span className="text-gray-400 text-sm">{groupedCategories[group].length} kategorií</span>
                            </div>
                            <div className={styles.grid}>
                                {groupedCategories[group].map(cat => (
                                    <div key={cat.id} className={styles.card}>
                                        <div className={styles.cardHeader}>
                                            <span className={styles.idBadge}>{cat.id}</span>
                                            <div className={styles.cardActions}>
                                                <button onClick={() => handleEdit(cat)} className={styles.iconButton}>
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className={styles.cardTitle}>{cat.name}</h3>
                                        <div className={styles.cardMeta}>
                                            <span>Pořadí: {cat.order}</span>
                                            <span>•</span>
                                            <span>{cat.recipeCount || 0} receptur</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>
                            {editingCategory ? `Upravit kategorii ${editingCategory.id}` : 'Nová kategorie'}
                        </h2>

                        {!editingCategory && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>ID Kategorie (např. 101)</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formData.id}
                                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                                    placeholder="Unikátní číslo"
                                />
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Název kategorie</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Hlavní skupina (Parent Group)</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={formData.parentGroup}
                                onChange={e => setFormData({ ...formData, parentGroup: e.target.value })}
                                list="groups-list"
                                placeholder="Vyberte nebo napište novou..."
                            />
                            <datalist id="groups-list">
                                {Object.keys(groupedCategories).map(g => (
                                    <option key={g} value={g} />
                                ))}
                            </datalist>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Sekce (Teplá / Studená)</label>
                            <select
                                className={styles.input}
                                value={formData.source}
                                onChange={e => setFormData({ ...formData, source: e.target.value as 'hot' | 'cold' })}
                            >
                                <option value="hot">Teplá kuchyně</option>
                                <option value="cold">Studená kuchyně</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Pořadí (Order)</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={formData.order}
                                onChange={e => setFormData({ ...formData, order: Number(e.target.value) })}
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} className={styles.secondaryButton}>Zrušit</button>
                            <button onClick={handleSave} className={styles.primaryButton}>
                                {editingCategory ? 'Uložit změny' : 'Vytvořit kategorii'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
