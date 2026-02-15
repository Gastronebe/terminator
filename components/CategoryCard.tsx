'use client';

import { LucideIcon } from 'lucide-react';
import styles from './CategoryCard.module.css';

interface Props {
    title: string;
    description: string;
    icon: LucideIcon;
    color: string;
    count?: number; // Total items
    warningCount?: number; // Expired or warning items
    href?: string;
}

export default function CategoryCard({ title, description, icon: Icon, color, count, warningCount }: Props) {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.iconWrapper} style={{ backgroundColor: `${color}20`, color: color }}>
                    <Icon size={24} />
                </div>
                {count !== undefined && (
                    <div className={styles.badge}>{count}</div>
                )}
            </div>

            <div className={styles.content}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>
            </div>

            {warningCount && warningCount > 0 ? (
                <div className={styles.warningIndicator} style={{ backgroundColor: 'var(--status-expired)' }}>
                    {warningCount} !
                </div>
            ) : null}
        </div>
    );
}
