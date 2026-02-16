'use client';

import Link from 'next/link';
import { Camera, ChevronLeft, WifiOff, Settings, RefreshCw, Power } from 'lucide-react';
import styles from './page.module.css';

export default function CameraPage() {
    return (
        <main className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Link href="/" className={styles.backButton}>
                    <ChevronLeft size={24} />
                </Link>
                <h1 className={styles.title}>Kamera</h1>
            </div>

            {/* Camera Feed Area */}
            <div className={styles.cameraFeed}>
                <div className={styles.liveBadge}>
                    <div className={styles.indicator} style={{ backgroundColor: '#ef4444' }}></div>
                    OFFLINE
                </div>

                <div className={styles.offlineMessage}>
                    <WifiOff size={48} className={styles.offlineIcon} />
                    <p>Signál kamery není k dispozici</p>
                </div>
            </div>

            {/* Placeholder Text */}
            <p className={styles.infoText}>
                TADY BUDE OBRAZ KAMERY, až ji někdo zapojí...
            </p>

            {/* Controls (Disabled) */}
            <div className={styles.controlsGrid}>
                <button className={styles.controlCard} disabled>
                    <Power size={24} className="text-red-500" />
                    <span className={styles.controlLabel}>Zapnout</span>
                </button>
                <button className={styles.controlCard} disabled>
                    <RefreshCw size={24} className="text-blue-500" />
                    <span className={styles.controlLabel}>Obnovit</span>
                </button>
                <button className={styles.controlCard} disabled style={{ gridColumn: 'span 2' }}>
                    <Settings size={24} className="text-gray-500" />
                    <span className={styles.controlLabel}>Nastavení kamery</span>
                </button>
            </div>
        </main>
    );
}
