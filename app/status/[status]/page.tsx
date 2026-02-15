'use client';

import { useAssetItems, useDocuments, useAssets, useSubscriptions } from "@/hooks/useData";
import { calculateStatus, formatDate } from "@/utils/status";
import { useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import styles from "../../page.module.css"; // Reuse main page styles for consistency

export default function StatusPage() {
    const params = useParams();
    const statusFilter = params?.status as string;

    const { data: assetItems } = useAssetItems();
    const { data: documents } = useDocuments();
    const { data: assets } = useAssets();
    const { data: subscriptions } = useSubscriptions();

    // Helper to get asset name for an item
    const getAssetName = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        return asset ? asset.name : 'Neznámé';
    };

    // Helper to get link to detail
    const getLink = (item: any, type: string) => {
        if (type === 'assetItem') {
            const asset = assets.find(a => a.id === item.assetId);
            if (!asset) return '#';
            const folder = asset.type === 'car' ? 'cars' : 'properties';
            return `/assets/${folder}/${asset.id}`;
        }
        if (type === 'document') return '/documents'; // Or detail if exists
        if (type === 'subscription') return '/subscriptions'; // Or detail if exists
        return '#';
    };

    // Collect all items with their status
    const allItems = [
        ...assetItems.map(i => ({ ...i, type: 'assetItem', label: i.name, subLabel: getAssetName(i.assetId) })),
        ...documents.map(d => ({ ...d, type: 'document', label: d.name, subLabel: 'Doklad' })),
        ...subscriptions
            .filter(s => s.trackStatus !== false)
            .map(s => ({
                ...s,
                type: 'subscription',
                label: s.name,
                subLabel: 'Předplatné',
                // Map subscription fields to common interface
                validUntil: s.nextPaymentDate,
                notifyBeforeDays: 7
            }))
    ];

    const filteredItems = allItems.filter(item => {
        const status = calculateStatus(item.validUntil, item.notifyBeforeDays || 30);
        return status === statusFilter;
    });

    const getTitle = () => {
        switch (statusFilter) {
            case 'expired': return 'Po splatnosti / Expirované';
            case 'warning': return 'Blíží se splatnost';
            case 'active': return 'Aktivní / V pořádku';
            default: return 'Položky';
        }
    };

    return (
        <main className="container">
            <Link href="/" style={{ display: 'inline-block', marginBottom: 24, textDecoration: 'none', color: '#666' }}>← Zpět na přehled</Link>

            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>{getTitle()}</h1>

            <div style={{ display: 'grid', gap: 16 }}>
                {filteredItems.map((item, index) => (
                    <Link key={index} href={getLink(item, item.type)} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Card title={item.label} status={statusFilter as any}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#666' }}>{item.subLabel}</span>
                                <span style={{ fontWeight: 500 }}>{formatDate(item.validUntil)}</span>
                            </div>
                        </Card>
                    </Link>
                ))}

                {filteredItems.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>V této kategorii nejsou žádné položky.</p>
                )}
            </div>
        </main>
    );
}
