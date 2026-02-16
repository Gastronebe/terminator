'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, writeBatch, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NormRecipe, NormCategory } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Search, Filter, CheckSquare, Square, FolderInput, RefreshCw, Edit2 } from 'lucide-react';
import styles from './page.module.css';

export default function RecipesAdminPage() {
    const [recipes, setRecipes] = useState<NormRecipe[]>([]);
    const [categories, setCategories] = useState<NormCategory[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modal
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [targetCategory, setTargetCategory] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Categories
            const catSnap = await getDocs(query(collection(db, 'normCategories'), orderBy('order')));
            const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as NormCategory));
            setCategories(cats);

            // Fetch Recipes (limit 1500 or filter logic needs to be smarter for large datasets)
            // For now, fetch all IDs and basic info is okay if under 2000 items. 
            // Better: fetch only needed fields if possible, but Firestore returns full docs.
            // Given ~800 recipes, it's fine.
            const recSnap = await getDocs(query(collection(db, 'normRecipes'), orderBy('id')));
            const recs = recSnap.docs.map(d => ({ id: d.id, ...d.data() } as NormRecipe));
            setRecipes(recs);

            setSelectedIds(new Set()); // Reset selection
        } catch (error) {
            console.error('Error loading data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Logic
    const filteredRecipes = recipes.filter(r => {
        const matchesSearch =
            (r.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (r.id || '').includes(search);

        const matchesCategory =
            categoryFilter === 'all' ? true :
                categoryFilter === 'unknown' ? (r.categoryId === 'unknown' || !r.categoryId) :
                    r.categoryId === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    // Selection Logic
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredRecipes.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRecipes.map(r => r.id)));
        }
    };

    // Move Logic
    const handleBulkMove = async () => {
        if (!targetCategory) return alert('Vyberte cílovou kategorii');
        if (selectedIds.size === 0) return;

        const targetCatObj = categories.find(c => c.id === targetCategory);
        if (!targetCatObj) return;

        try {
            setLoading(true);
            const batch = writeBatch(db);

            selectedIds.forEach(id => {
                const docRef = doc(db, 'normRecipes', id);
                batch.update(docRef, {
                    categoryId: targetCatObj.id,
                    categoryName: targetCatObj.name,
                    parentGroup: targetCatObj.parentGroup,
                    updatedAt: Date.now()
                });
            });

            await batch.commit();

            alert(`Přesunuto ${selectedIds.size} receptur do "${targetCatObj.name}"`);
            setShowMoveModal(false);
            setTargetCategory('');
            fetchData(); // Refresh

        } catch (error) {
            console.error('Bulk move failed', error);
            alert('Chyba při hromadném přesunu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={`container ${styles.container}`}>
            <div className={styles.header}>
                <div className={styles.title}>
                    <Link href="/admin/norms" className={styles.backButton}>
                        <ArrowLeft size={24} />
                    </Link>
                    <h1>Správa receptur</h1>
                </div>
                <button onClick={fetchData} className="p-2 bg-gray-100 rounded hover:bg-gray-200">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Controls */}
            <div className={styles.controls}>
                <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Hledat podle ID nebo názvu..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <select
                    className={styles.filterSelect}
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                >
                    <option value="all">Všechny kategorie</option>
                    <option value="unknown">Nezařazené / Chyba (Unknown)</option>
                    <hr />
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                    ))}
                </select>
            </div>

            {/* Bulk Actions Header */}
            {selectedIds.size > 0 && (
                <div className={styles.bulkActions}>
                    <span className="font-bold">{selectedIds.size} vybráno</span>
                    <button onClick={() => setShowMoveModal(true)} className={styles.actionButton}>
                        <FolderInput size={18} />
                        Přesunout do kategorie...
                    </button>
                </div>
            )}

            {/* Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className="w-12">
                                <button onClick={toggleSelectAll}>
                                    {selectedIds.size > 0 && selectedIds.size === filteredRecipes.length
                                        ? <CheckSquare size={20} />
                                        : <Square size={20} />}
                                </button>
                            </th>
                            <th className="w-24">ID</th>
                            <th>Název receptury</th>
                            <th>Kategorie</th>
                            <th className="w-32">Stav</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecipes.map(recipe => (
                            <tr key={recipe.id} className={selectedIds.has(recipe.id) ? 'bg-blue-50' : ''}>
                                <td>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={selectedIds.has(recipe.id)}
                                        onChange={() => toggleSelect(recipe.id)}
                                    />
                                </td>
                                <td className={styles.idCell}>{recipe.id}</td>
                                <td className="font-medium">{recipe.title}</td>
                                <td className="text-gray-500 text-xs">
                                    {recipe.categoryId} <br />
                                    {recipe.categoryName}
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        {(recipe as any).parsingError ? (
                                            <span className={`${styles.statusBadge} ${styles.errorBadge}`}>Chyba</span>
                                        ) : (
                                            <span className={`${styles.statusBadge} ${styles.successBadge}`}>OK</span>
                                        )}
                                        <Link href={`/admin/norms/recipes/${recipe.id}`} className="p-1 hover:bg-gray-100 rounded text-blue-600" title="Upravit">
                                            <Edit2 size={16} />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredRecipes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">Žádné receptury nenalezeny.</div>
                )}
            </div>

            {/* Move Modal */}
            {showMoveModal && (
                <div className={styles.modalOverlay} onClick={() => setShowMoveModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Přesunout {selectedIds.size} receptur</h2>

                        <p className="mb-2 text-sm text-gray-600">Vyberte novou kategorii:</p>
                        <select
                            className={styles.selectInput}
                            value={targetCategory}
                            onChange={e => setTargetCategory(e.target.value)}
                            size={10}
                        >
                            <option value="" disabled>-- Vyberte kategorii --</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.id} - {c.name} ({c.parentGroup})
                                </option>
                            ))}
                        </select>

                        <div className={styles.modalActions}>
                            <button onClick={() => setShowMoveModal(false)} className={styles.cancelButton}>Zrušit</button>
                            <button onClick={handleBulkMove} className={styles.confirmButton}>Potvrdit přesun</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
