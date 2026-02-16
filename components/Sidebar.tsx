'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Car, FileText, PieChart, Menu, Calendar, CreditCard, Home as HomeIcon, ChefHat, Camera, ShieldCheck, Gift } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    const pathname = usePathname();
    const { isAdmin, user } = useAuth();

    const isActive = (path: string) => pathname === path;

    const hasPermission = (itemId: string) => {
        if (itemId === 'admin') return isAdmin;
        if (!user?.allowedMenuItems) return true; // Default to all if not set yet
        return user.allowedMenuItems.includes(itemId);
    };

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
                {hasPermission('cars') && (
                    <Link href="/assets/cars" className={`${styles.navItem} ${isActive('/assets/cars') ? styles.active : ''}`}>
                        <Car size={20} />
                        <span>Auta</span>
                    </Link>
                )}
                {hasPermission('cards') && (
                    <Link href="/cards" className={`${styles.navItem} ${isActive('/cards') ? styles.active : ''}`}>
                        <CreditCard size={20} />
                        <span>Karty</span>
                    </Link>
                )}
                {hasPermission('properties') && (
                    <Link href="/assets/properties" className={`${styles.navItem} ${isActive('/assets/properties') ? styles.active : ''}`}>
                        <HomeIcon size={20} />
                        <span>Nemovitosti</span>
                    </Link>
                )}
                {hasPermission('documents') && (
                    <Link href="/documents" className={`${styles.navItem} ${isActive('/documents') ? styles.active : ''}`}>
                        <FileText size={20} />
                        <span>Doklady</span>
                    </Link>
                )}
                {hasPermission('events') && (
                    <Link href="/events" className={`${styles.navItem} ${isActive('/events') ? styles.active : ''}`}>
                        <Calendar size={20} />
                        <span>Události</span>
                    </Link>
                )}
                {hasPermission('birthdays') && (
                    <Link href="/birthdays" className={`${styles.navItem} ${isActive('/birthdays') ? styles.active : ''}`}>
                        <Gift size={20} />
                        <span>Narozeniny</span>
                    </Link>
                )}
                {hasPermission('subscriptions') && (
                    <Link href="/subscriptions" className={`${styles.navItem} ${isActive('/subscriptions') ? styles.active : ''}`}>
                        <CreditCard size={20} />
                        <span>Předplatné</span>
                    </Link>
                )}
                {hasPermission('norms') && (
                    <Link href="/norms" className={`${styles.navItem} ${isActive('/norms') ? styles.active : ''}`}>
                        <ChefHat size={20} />
                        <span>Normy</span>
                    </Link>
                )}
                {hasPermission('finance') && (
                    <Link href="/finance" className={`${styles.navItem} ${isActive('/finance') ? styles.active : ''}`}>
                        <PieChart size={20} />
                        <span>Statistiky</span>
                    </Link>
                )}
                {hasPermission('camera') && (
                    <Link href="/camera" className={`${styles.navItem} ${isActive('/camera') ? styles.active : ''}`}>
                        <Camera size={20} />
                        <span>Kamera</span>
                    </Link>
                )}

                {hasPermission('admin') && (
                    <Link href="/admin" className={`${styles.navItem} ${isActive('/admin') ? styles.active : ''}`}>
                        <ShieldCheck size={20} />
                        <span>Administrace</span>
                    </Link>
                )}
            </nav>
        </aside>
    );
}
