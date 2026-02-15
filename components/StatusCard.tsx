'use client';

import styles from './StatusCard.module.css';

interface Props {
    type: 'expired' | 'warning' | 'active';
    count: number;
    onClick?: () => void;
}

export default function StatusCard({ type, count, onClick }: Props) {
    const config = {
        expired: {
            label: 'Po termínu',
            color: 'var(--status-expired)',
        },
        warning: {
            label: 'Brzy vyprší',
            color: 'var(--status-warning)',
        },
        active: {
            label: 'V pořádku',
            color: 'var(--status-active)',
        }
    };

    const { label, color } = config[type];

    return (
        <div className={styles.card} onClick={onClick} style={{ borderColor: count > 0 && type === 'expired' ? color : 'transparent' }}>
            <div className={styles.count} style={{ color }}>{count}</div>
            <div className={styles.label}>{label}</div>
        </div>
    );
}
