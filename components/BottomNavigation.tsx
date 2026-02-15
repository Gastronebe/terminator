'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Car, FileText, PieChart, Menu } from 'lucide-react';
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
            <Link href="/documents" className={`${styles.navItem} ${isActive('/documents') ? styles.active : ''}`}>
                <FileText size={24} />
                <span>Doklady</span>
            </Link>
            <Link href="/finance" className={`${styles.navItem} ${isActive('/finance') ? styles.active : ''}`}>
                <PieChart size={24} />
                <span>Statistiky</span>
            </Link>
            {/* "More" menu or generic link to settings/other for now pointing to admin/settings equivalent if exists, or just a placeholder for the menu expansion logic later */}
            <Link href="/admin" className={`${styles.navItem} ${isActive('/admin') ? styles.active : ''}`}>
                <Menu size={24} />
                <span>Více</span>
            </Link>
        </nav>
    );
}
