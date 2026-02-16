'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Poll } from '@/types';
import { ChefHat, Check } from 'lucide-react';
import styles from './PollWidget.module.css';

export default function PollWidget() {
    const [activePoll, setActivePoll] = useState<Poll | null>(null);
    const [loading, setLoading] = useState(true);
    const [votedOptionId, setVotedOptionId] = useState<string | null>(null);

    useEffect(() => {
        const fetchActivePoll = async () => {
            try {
                // Check local storage for vote status
                const storedVote = localStorage.getItem('lastPollVote');

                const q = query(collection(db, 'polls'), where('active', '==', true));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const pollData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Poll;
                    setActivePoll(pollData);

                    // Check if already voted for THIS poll
                    if (storedVote) {
                        const [pollId, optionId] = storedVote.split(':');
                        if (pollId === pollData.id) {
                            setVotedOptionId(optionId);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching poll:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivePoll();
    }, []);

    const handleVote = async (optionId: string) => {
        if (!activePoll || votedOptionId) return;

        try {
            // Optimistic Update
            setVotedOptionId(optionId);

            // Persist vote to local storage to prevent simple double voting
            localStorage.setItem('lastPollVote', `${activePoll.id}:${optionId}`);

            // Update Firestore
            const pollRef = doc(db, 'polls', activePoll.id);
            const optionIndex = activePoll.options.findIndex(o => o.id === optionId);

            if (optionIndex === -1) return;

            // Simplified update logic (same as before)
            const newOptions = [...activePoll.options];
            newOptions[optionIndex].votes = (newOptions[optionIndex].votes || 0) + 1;

            await updateDoc(pollRef, { options: newOptions });

            // Update local state visuals
            setActivePoll({ ...activePoll, options: newOptions });

        } catch (error) {
            console.error('Error voting:', error);
            alert('Chyba při hlasování');
            setVotedOptionId(null);
            localStorage.removeItem('lastPollVote');
        }
    };

    if (loading) return null;
    if (!activePoll) return null; // Don't show if no active poll

    const totalVotes = activePoll.options.reduce((acc, o) => acc + (o.votes || 0), 0);

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.iconWrapper}>
                    <ChefHat size={16} />
                </div>
                <span className={styles.title}>ANKETA</span>
            </div>

            <h3 className={styles.question}>{activePoll.question}</h3>

            <div className={styles.optionsList}>
                {activePoll.options.map(option => {
                    const percentage = totalVotes > 0 ? Math.round(((option.votes || 0) / totalVotes) * 100) : 0;
                    const isSelected = votedOptionId === option.id;

                    return (
                        <div
                            key={option.id}
                            className={`${styles.optionButton} ${isSelected ? styles.optionSelected : ''}`}
                            onClick={() => !votedOptionId && handleVote(option.id)}
                            style={{ cursor: votedOptionId ? 'default' : 'pointer' }}
                        >
                            {/* Progress Bar Background */}
                            {votedOptionId && (
                                <div
                                    className={styles.progressBar}
                                    style={{ width: `${percentage}%` }}
                                />
                            )}

                            <div className={styles.optionContent}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {!votedOptionId && <div className={styles.circle} />}
                                    {isSelected && <Check size={14} className={styles.checkIcon} />}
                                    <span className={`${styles.optionText} ${isSelected ? styles.optionTextSelected : ''}`}>
                                        {option.text}
                                    </span>
                                </div>

                                {votedOptionId && (
                                    <span className={styles.percentage}>
                                        {percentage}%
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {votedOptionId && (
                <div className={styles.voteCount}>
                    Celkem hlasů: {totalVotes}
                </div>
            )}
        </div>
    );
}
