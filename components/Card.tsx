import React from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    title?: string;
    status?: 'active' | 'warning' | 'expired' | string; // Relaxed type for flexibility
    icon?: React.ReactNode;
    headerAction?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', style, title, status, icon, headerAction }) => {
    return (
        <div className={`card ${className} ${styles.cardWrapper}`} style={style}>
            {(title || icon) && (
                <div className={styles.header}>
                    <div className={styles.titleRow}>
                        {icon && <span className={styles.icon}>{icon}</span>}
                        {title && <h3 className={styles.title}>{title}</h3>}
                    </div>
                    {headerAction && (
                        <div className={styles.headerAction}>
                            {headerAction}
                        </div>
                    )}
                    {status && !headerAction && (
                        <div className={styles.statusIndicator}>
                            {status === 'active' && <span style={{ color: 'var(--status-active)', fontWeight: 600 }}>Aktivní</span>}
                            {status === 'warning' && <span style={{ color: 'var(--status-warning)', fontWeight: 600 }}>Brzy vyprší</span>}
                            {status === 'expired' && <span style={{ color: 'var(--status-expired)', fontWeight: 600 }}>Po termínu</span>}
                        </div>
                    )}
                </div>
            )}
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
};

export default Card;
