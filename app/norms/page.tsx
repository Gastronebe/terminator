'use client';

import Link from 'next/link';
import { ChefHat, MessageSquare, Snowflake } from 'lucide-react';
import styles from './page.module.css';

export default function NormsPage() {
    return (
        <main className={`container ${styles.container}`}>
            <h1 className={styles.heading}>Gastronomické normy</h1>

            <div className={styles.grid}>
                {/* Hot Kitchen */}
                <Link href="/norms/hot" className={styles.card}>
                    <div className={`${styles.iconWrapper} ${styles.hotWrapper}`}>
                        <ChefHat size={32} />
                    </div>
                    <h2 className={styles.cardTitle}>Teplá kuchyně</h2>
                    <p className={styles.cardDescription}>
                        Kompletní databáze receptur teplých pokrmů (ČSN 1986).
                        Polévky, masa, přílohy a další.
                    </p>
                </Link>

                {/* Cold Kitchen */}
                <Link href="/norms/cold" className={styles.card}>
                    <div className={`${styles.iconWrapper} ${styles.coldWrapper}`}>
                        <Snowflake size={32} />
                    </div>
                    <h2 className={styles.cardTitle}>Studená kuchyně</h2>
                    <p className={styles.cardDescription}>
                        Normy studené kuchyně pro přípravu salátů, pomazánek a studených mís.
                    </p>
                </Link>

                {/* Chat */}
                <Link href="/norms/chat" className={`${styles.card} ${styles.chatCard}`}>
                    <div className={`${styles.iconWrapper} ${styles.chatWrapper}`}>
                        <MessageSquare size={32} />
                    </div>
                    <h2 className={`${styles.cardTitle} ${styles.chatTitle}`}>Zeptat se Svatopluka</h2>
                    <p className={`${styles.cardDescription} ${styles.chatDesc}`}>
                        Inteligentní asistent, který zná celou knihu norem.
                        Umí vyhledávat i přepočítávat porce.
                    </p>
                </Link>
            </div>
        </main>
    );
}
