'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Poll, PollOption } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Trash2, Plus, PlayCircle, StopCircle, RefreshCw } from 'lucide-react';
import styles from './page.module.css';

export default function PollsAdminPage() {
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Create Form State
    const [newQuestion, setNewQuestion] = useState('');
    const [newOptions, setNewOptions] = useState<string[]>(['', '']);

    const fetchPolls = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll));
            setPolls(data);
        } catch (error) {
            console.error('Error fetching polls:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolls();
    }, []);

    const handleCreate = async () => {
        if (!newQuestion.trim()) return alert('Otázka je povinná');
        const validOptions = newOptions.filter(o => o.trim());
        if (validOptions.length < 2) return alert('Zadejte alespoň 2 možnosti');

        try {
            const pollData: Omit<Poll, 'id'> = {
                question: newQuestion,
                options: validOptions.map((text, idx) => ({
                    id: `opt-${Date.now()}-${idx}`,
                    text: text.trim(),
                    votes: 0
                })),
                active: false,
                createdAt: Date.now(),
                totalVotes: 0
            };

            await addDoc(collection(db, 'polls'), pollData);

            // Reset form
            setNewQuestion('');
            setNewOptions(['', '']);
            setShowCreate(false);
            fetchPolls();
        } catch (error) {
            console.error('Error creating poll:', error);
            alert('Chyba při vytváření');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Opravdu smazat tuto anketu?')) return;
        try {
            await deleteDoc(doc(db, 'polls', id));
            setPolls(polls.filter(p => p.id !== id));
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání');
        }
    };

    const toggleActive = async (poll: Poll) => {
        try {
            const batch = writeBatch(db);

            // If activating, deactivate all others first
            if (!poll.active) {
                polls.forEach(p => {
                    if (p.active) {
                        batch.update(doc(db, 'polls', p.id), { active: false });
                    }
                });
            }

            // Toggle current
            const newState = !poll.active;
            batch.update(doc(db, 'polls', poll.id), { active: newState });

            await batch.commit();
            fetchPolls();
        } catch (error) {
            console.error(error);
            alert('Chyba při změně stavu');
        }
    };

    const updateOptionText = (index: number, val: string) => {
        const updated = [...newOptions];
        updated[index] = val;
        setNewOptions(updated);
    };

    const addOptionField = () => {
        setNewOptions([...newOptions, '']);
    };

    return (
        <main className={`container ${styles.container}`}>
            <div className={styles.header}>
                <div className={styles.title}>
                    <Link href="/admin" className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1>Správa Anket</h1>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-orange-600 transition-colors"
                >
                    <Plus size={18} /> Nová anketa
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className={styles.createForm}>
                    <h2 className="text-lg font-bold mb-4">Vytvořit novou anketu</h2>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Otázka</label>
                        <input
                            className={styles.input}
                            value={newQuestion}
                            onChange={e => setNewQuestion(e.target.value)}
                            placeholder="Např. Co budeme vařit v sobotu?"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Možnosti</label>
                        {newOptions.map((opt, idx) => (
                            <div key={idx} className="mb-2 flex gap-2">
                                <input
                                    className={styles.input}
                                    value={opt}
                                    onChange={e => updateOptionText(idx, e.target.value)}
                                    placeholder={`Možnost ${idx + 1}`}
                                />
                            </div>
                        ))}
                        <button onClick={addOptionField} className="text-sm text-blue-600 font-medium hover:underline mt-1">
                            + Přidat další možnost
                        </button>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">
                            Zrušit
                        </button>
                        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">
                            Vytvořit
                        </button>
                    </div>
                </div>
            )}

            {/* Polls List */}
            {loading ? (
                <div>Načítám...</div>
            ) : (
                <div className={styles.grid}>
                    {polls.length === 0 && (
                        <div className="text-center text-gray-500 py-8">Žádné ankety. Vytvořte první!</div>
                    )}

                    {polls.map(poll => (
                        <div key={poll.id} className={`${styles.card} ${poll.active ? 'border-green-500 ring-1 ring-green-100' : ''}`}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <h3 className={styles.question}>{poll.question}</h3>
                                    <div className={styles.meta}>
                                        Vytvořeno: {new Date(poll.createdAt).toLocaleDateString("cs-CZ")}
                                    </div>
                                </div>
                                <span className={`${styles.statusBadge} ${poll.active ? styles.activeBadge : styles.inactiveBadge}`}>
                                    {poll.active ? 'Aktivní' : 'Neaktivní'}
                                </span>
                            </div>

                            <div className={styles.optionsList}>
                                {poll.options.map(opt => (
                                    <div key={opt.id} className={styles.optionItem}>
                                        <span className={styles.optionText}>{opt.text}</span>
                                        <span className={styles.voteCount}>{opt.votes} hlasů</span>
                                    </div>
                                ))}
                                <div className="text-xs text-gray-400 mt-1 pl-1">
                                    Celkem hlasů: {poll.options.reduce((acc, o) => acc + (o.votes || 0), 0)}
                                </div>
                            </div>

                            <div className={styles.actions}>
                                <button onClick={() => handleDelete(poll.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>
                                    <Trash2 size={16} /> Smazat
                                </button>
                                <button onClick={() => toggleActive(poll)} className={`${styles.actionButton} ${styles.activateButton}`}>
                                    {poll.active ? (
                                        <>
                                            <StopCircle size={16} /> Deaktivovat
                                        </>
                                    ) : (
                                        <>
                                            <PlayCircle size={16} /> Aktivovat
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
