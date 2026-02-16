'use client';

import { useState } from 'react';
import { DiscountCard } from '@/types';
import { CreditCard, X, Pencil } from 'lucide-react';
import styles from './DiscountCardList.module.css';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
    cards: DiscountCard[];
}

export default function DiscountCardList({ cards }: Props) {
    const [selectedCard, setSelectedCard] = useState<DiscountCard | null>(null);
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // Prevent propagation when clicking edit button
    const handleEditClick = (e: React.MouseEvent, cardId: string) => {
        e.stopPropagation();
    };

    return (
        <>
            <div className={styles.grid}>
                {cards.map(card => (
                    <div
                        key={card.id}
                        className={styles.cardItem}
                        style={{ backgroundColor: card.color || '#333', position: 'relative' }}
                        onClick={() => setSelectedCard(card)}
                    >
                        {isAdmin && (
                            <Link
                                href={`/admin/cards/${card.id}`}
                                className={styles.editButton}
                                onClick={(e) => handleEditClick(e, card.id)}
                                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: '50%', color: 'white' }}
                            >
                                <Pencil size={16} />
                            </Link>
                        )}

                        {card.logoUrl ? (
                            <img src={card.logoUrl} alt={card.name} className={styles.cardLogo} style={{ objectFit: 'contain', background: 'white', padding: 4, borderRadius: 4 }} />
                        ) : (
                            <CreditCard size={32} color="white" />
                        )}
                        <span className={styles.cardName}>{card.name}</span>
                    </div>
                ))}
            </div>

            {selectedCard && (
                <div className={styles.modalOverlay} onClick={() => setSelectedCard(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ backgroundColor: selectedCard.color || '#333' }}>
                        <button className={styles.closeButton} onClick={() => setSelectedCard(null)}>
                            <X size={32} color="white" />
                        </button>

                        <div className={styles.modalBody}>
                            <h2 className={styles.modalTitle}>{selectedCard.name}</h2>
                            {selectedCard.note && <p className={styles.modalNote}>{selectedCard.note}</p>}

                            <div className={styles.codeContainer} style={{ background: 'white', padding: 16, borderRadius: 12, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {selectedCard.codeImageUrl ? (
                                    <img src={selectedCard.codeImageUrl} alt="Code" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                                ) : (
                                    <div className={styles.codeValue} style={{ color: 'black' }}>{selectedCard.code}</div>
                                )}
                                <div className={styles.codeLabel} style={{ color: '#666', marginTop: 8 }}>
                                    {selectedCard.codeImageUrl ? selectedCard.code : 'Kód karty'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
