'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import styles from './AddButton.module.css';

interface AddButtonProps {
    href: string;
    label?: string;
}

export default function AddButton({ href, label = 'Přidat' }: AddButtonProps) {
    return (
        <Link href={href} className={styles.addButton} title={label}>
            <Plus size={24} strokeWidth={2.5} />
            <span className={styles.label}>{label}</span>
        </Link>
    );
}
