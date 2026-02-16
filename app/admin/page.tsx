'use client';

import AdminLayout from '@/components/AdminLayout';
import CategoryCard from '@/components/CategoryCard';
import Link from 'next/link';
import { Users, Database, FileText, Gift, CreditCard, ShieldAlert } from 'lucide-react';
import styles from './page.module.css'; // We'll create a simple grid style

export default function AdminPage() {
    return (
        <AdminLayout>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Administrace</h1>

            <div className={styles.grid}>
                <Link href="/admin/users">
                    <CategoryCard
                        title="Uživatelé"
                        description="Správa uživatelů a rolí"
                        icon={Users}
                        color="#007AFF"
                    />
                </Link>
                <Link href="/admin/requests">
                    <CategoryCard
                        title="Žádosti"
                        description="Schvalování přístupů"
                        icon={ShieldAlert}
                        color="#FF9500"
                    />
                </Link>
                <Link href="/admin/data">
                    <CategoryCard
                        title="Správa dat"
                        description="Export a Import"
                        icon={Database}
                        color="#5856D6"
                    />
                </Link>
                <Link href="/admin/cards">
                    <CategoryCard
                        title="Slevové karty"
                        description="Správa karet"
                        icon={CreditCard}
                        color="#333"
                    />
                </Link>
                <Link href="/admin/polls">
                    <CategoryCard
                        title="Ankety"
                        description="Co budeme vařit?"
                        icon={Gift} // Using Gift as placeholder, ideally 'Vote' or similar if available
                        color="#ec4899" // Pink-500
                    />
                </Link>
            </div>
        </AdminLayout>
    );
}
