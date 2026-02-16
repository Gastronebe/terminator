'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Car, CreditCard, Home as HomeIcon, Menu, FileText, Calendar, Gift, PieChart, Camera, ChefHat } from 'lucide-react';
import styles from './BottomNavigation.module.css';
import { useAuth } from '@/contexts/AuthContext';

const DYNAMIC_NAV_ITEMS = [
    { id: 'cars', label: 'Auta', href: '/assets/cars', icon: Car },
    { id: 'properties', label: 'Nemovitosti', href: '/assets/properties', icon: HomeIcon },
    { id: 'documents', label: 'Doklady', href: '/documents', icon: FileText },
    { id: 'events', label: 'Události', href: '/events', icon: Calendar },
    { id: 'birthdays', label: 'Narozeniny', href: '/birthdays', icon: Gift },
    { id: 'subscriptions', label: 'Předplatné', href: '/subscriptions', icon: CreditCard },
    { id: 'finance', label: 'Statistiky', href: '/finance', icon: PieChart },
    { id: 'camera', label: 'Kamera', href: '/camera', icon: Camera },
    { id: 'norms', label: 'Normy', href: '/norms', icon: ChefHat },
];

export default function BottomNavigation() {
    const pathname = usePathname();
    const { isAdmin, user } = useAuth();

    const isActive = (path: string) => pathname === path;

    const hasPermission = (itemId: string) => {
        if (itemId === 'admin') return isAdmin;
        if (!user?.allowedMenuItems) return true;
        return user.allowedMenuItems.includes(itemId);
    };

    // Filter permitted items and take first 2
    const visibleDynamicItems = DYNAMIC_NAV_ITEMS.filter(item => hasPermission(item.id)).slice(0, 2);

    return (
        <nav className={styles.bottomNav}>
            <Link href="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
                <Home size={24} />
                <span>Přehled</span>
            </Link>

            {/* Dynamic Slot 1 */}
            {visibleDynamicItems[0] && (
                <Link href={visibleDynamicItems[0].href} className={`${styles.navItem} ${isActive(visibleDynamicItems[0].href) ? styles.active : ''}`}>
                    {(() => {
                        const Icon = visibleDynamicItems[0].icon;
                        return <Icon size={24} />;
                    })()}
                    <span>{visibleDynamicItems[0].label}</span>
                </Link>
            )}

            {/* Center Fixed Item: Cards (Always visible) */}
            <div className={styles.centerItemWrapper}>
                <Link href="/cards" className={`${styles.centerItem} ${isActive('/cards') ? styles.activeCenter : ''}`}>
                    <CreditCard size={28} />
                </Link>
                <span className={styles.centerLabel}>Karty</span>
            </div>

            {/* Dynamic Slot 2 */}
            {visibleDynamicItems[1] && (
                <Link href={visibleDynamicItems[1].href} className={`${styles.navItem} ${isActive(visibleDynamicItems[1].href) ? styles.active : ''}`}>
                    {(() => {
                        const Icon = visibleDynamicItems[1].icon;
                        return <Icon size={24} />;
                    })()}
                    <span>{visibleDynamicItems[1].label}</span>
                </Link>
            )}

            <Link href="/more" className={`${styles.navItem} ${isActive('/more') ? styles.active : ''}`}>
                <Menu size={24} />
                <span>Další</span>
            </Link>
        </nav>
    );
}
