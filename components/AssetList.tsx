'use client';

import { useAssets, useAssetItems } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth
import Card from '@/components/Card';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { calculateStatus } from '@/utils/status';
import styles from './AssetList.module.css';

export default function AssetList() {
    const pathname = usePathname();
    const isCar = pathname?.includes('cars');
    const type = isCar ? 'car' : 'property';
    const title = isCar ? 'Auta' : 'Nemovitosti';

    const { data: allAssets } = useAssets();
    const { data: allItems } = useAssetItems();
    const { isAdmin } = useAuth(); // Added useAuth

    const assets = allAssets.filter(a => a.type === type);

    return (
        <main className="container">
            <Link href="/" className={styles.backLink}>← Zpět</Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 className={styles.title} style={{ marginBottom: 0 }}>{title}</h1>
                {isAdmin && (
                    <Link href={`/admin/assets/new?type=${type}`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                        + Přidat
                    </Link>
                )}
            </div>
            <div className={styles.grid}>
                {assets.map(asset => {
                    // Find most urgent item status for the card summary
                    const items = allItems.filter(i => i.assetId === asset.id);
                    const urgentItem = items.sort((a, b) => a.validUntil - b.validUntil)[0];
                    const status = urgentItem ? calculateStatus(urgentItem.validUntil) : 'active';

                    // Determine correct folder name (cars vs properties)
                    const folder = type === 'car' ? 'cars' : 'properties';

                    return (
                        <div key={asset.id} style={{ position: 'relative' }}>
                            <Link href={`/assets/${folder}/${asset.id}`} className={styles.link}>
                                <Card title={asset.name} status={status} key={asset.id}>
                                    {asset.metadata.imageUrl && (
                                        <div style={{ marginBottom: 12, height: 160, overflow: 'hidden', borderRadius: 8 }}>
                                            <img
                                                src={asset.metadata.imageUrl}
                                                alt={asset.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    )}
                                    <p className={styles.meta}>
                                        {isCar ? asset.metadata.spz : asset.metadata.note}
                                    </p>
                                </Card>
                            </Link>
                            {/* Edit Link/Button directly on the card */}
                            {isAdmin && (
                                <Link
                                    href={`/assets/${folder}/${asset.id}?edit=true`}
                                    className={styles.editIcon}
                                    style={{
                                        position: 'absolute',
                                        top: 12,
                                        right: 12,
                                        background: 'rgba(255,255,255,0.9)',
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--accent-blue)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        zIndex: 10
                                    }}
                                >
                                    ✎
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>


            {assets.length === 0 && (
                <p className={styles.empty}>Žádné položky</p>
            )}
        </main>
    );
}
