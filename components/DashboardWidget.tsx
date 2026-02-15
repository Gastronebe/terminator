'use client';

import styles from './DashboardWidget.module.css';
import { LucideIcon } from 'lucide-react';

interface Props {
    title: string;
    icon: LucideIcon;
    color: string;
    children: React.ReactNode;
    onClick?: () => void;
}

export default function DashboardWidget({ title, icon: Icon, color, children, onClick }: Props) {
    return (
        <div className={styles.card} onClick={onClick}>
            <div className={styles.header}>
                <div className={styles.iconWrapper} style={{ backgroundColor: color }}>
                    <Icon size={16} color="white" />
                </div>
                <span className={styles.title}>{title}</span>
            </div>
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}
