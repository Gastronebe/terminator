'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Car, CreditCard, Home as HomeIcon, Menu } from 'lucide-react';
import styles from './BottomNavigation.module.css';

export default function BottomNavigation() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className={styles.bottomNav}>
            <Link href="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
                <Home size={24} />
                <span>Přehled</span>
            </Link>
            <Link href="/assets/cars" className={`${styles.navItem} ${isActive('/assets/cars') ? styles.active : ''}`}>
                <Car size={24} />
                <span>Auta</span>
            </Link>

            {/* Center Highlighted Item */}
            <div className={styles.centerItemWrapper}>
                <Link href="/cards" className={`${styles.centerItem} ${isActive('/cards') ? styles.activeCenter : ''}`}>
                    <CreditCard size={28} />
                </Link>
                <span className={styles.centerLabel}>Karty</span>
            </div>

            <Link href="/assets/properties" className={`${styles.navItem} ${isActive('/assets/properties') ? styles.active : ''}`}>
                <HomeIcon size={24} />
                <span>Nemovitosti</span>
            </Link>
            <Link href="/more" className={`${styles.navItem} ${isActive('/more') ? styles.active : ''}`}>
                <Menu size={24} />
                <span>Další</span>
            </Link>
        </nav>
    );
}
