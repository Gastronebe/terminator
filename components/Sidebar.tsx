'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Car, FileText, PieChart, Menu, Calendar, CreditCard } from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoArea}>
                <img src="/logo.png" alt="Terminátor3000" style={{ width: 'auto', height: 40, maxHeight: 60 }} />
            </div>

            <nav className={styles.nav}>
                <Link href="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
                    <Home size={20} />
                    <span>Přehled</span>
                </Link>
                <Link href="/assets/cars" className={`${styles.navItem} ${isActive('/assets/cars') ? styles.active : ''}`}>
                    <Car size={20} />
                    <span>Auta</span>
                </Link>
                <Link href="/cards" className={`${styles.navItem} ${isActive('/cards') ? styles.active : ''}`}>
                    <CreditCard size={20} />
                    <span>Karty</span>
                </Link>
                <Link href="/documents" className={`${styles.navItem} ${isActive('/documents') ? styles.active : ''}`}>
                    <FileText size={20} />
                    <span>Doklady</span>
                </Link>
                <Link href="/events" className={`${styles.navItem} ${isActive('/events') ? styles.active : ''}`}>
                    <Calendar size={20} />
                    <span>Události</span>
                </Link>
                <Link href="/finance" className={`${styles.navItem} ${isActive('/finance') ? styles.active : ''}`}>
                    <PieChart size={20} />
                    <span>Statistiky</span>
                </Link>

                <div className={styles.separator}></div>

                <Link href="/admin" className={`${styles.navItem} ${isActive('/admin') ? styles.active : ''}`}>
                    <Menu size={20} />
                    <span>Administrace</span>
                </Link>
            </nav>
        </aside>
    );
}
