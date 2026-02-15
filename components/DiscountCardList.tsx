'use client';

import { useState } from 'react';
import { DiscountCard } from '@/types';
import { CreditCard, X } from 'lucide-react';
import Card from './Card'; // Assuming reusing Card or creating a new simpler one

interface Props {
    cards: DiscountCard[];
}

import styles from './DiscountCardList.module.css';

export default function DiscountCardList({ cards }: Props) {
    const [selectedCard, setSelectedCard] = useState<DiscountCard | null>(null);

    return (
        <>
            <div className={styles.grid}>
                {cards.map(card => (
                    <div
                        key={card.id}
                        className={styles.cardItem}
                        style={{ backgroundColor: card.color || '#333' }}
                        onClick={() => setSelectedCard(card)}
                    >
                        {card.logoUrl ? (
                            <img src={card.logoUrl} alt={card.name} className={styles.cardLogo} />
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

                            <div className={styles.codeContainer}>
                                {/* For MVP, displaying text code large. Later can implement barcode generator like 'bwip-js' */}
                                <div className={styles.codeValue}>{selectedCard.code}</div>
                                <div className={styles.codeLabel}>Kód karty</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
