'use client';

import Card from '@/components/Card';
import Link from 'next/link';
import { useSubscriptions, useAssetItems, useAssets } from '@/hooks/useData';
import styles from './page.module.css';
import { BarChart3, ChevronLeft, PieChart } from 'lucide-react';

export default function StatisticsPage() {
    const { data: subscriptions } = useSubscriptions();
    const { data: assetItems } = useAssetItems();
    const { data: assets } = useAssets();

    // 1. Calculate Costs by Category
    let costs = {
        subscriptions: 0,
        cars: 0,
        properties: 0,
        total: 0
    };

    // Payer Stats
    let payerStats: { [key: string]: number } = {};

    const addPayerCost = (payer: string | undefined, amount: number) => {
        const p = payer ? payer.trim() : 'Ostatní';
        if (!payerStats[p]) payerStats[p] = 0;
        payerStats[p] += amount;
    };

    // Asset Items (annualized)
    assetItems.forEach(item => {
        if (!item.price) return;

        // Find parent asset type
        const parentAsset = assets.find(a => a.id === item.assetId);
        if (parentAsset?.type === 'car') {
            costs.cars += item.price;
        } else if (parentAsset?.type === 'property') {
            costs.properties += item.price;
        }

        addPayerCost(item.payer, item.price);
    });

    costs.total = costs.cars + costs.properties;

    // 2. Prepare Chart Data (Category)
    // Use CSS variable colors
    const data = [
        { label: 'Auta', value: costs.cars, color: 'var(--color-cars)' },
        { label: 'Nemovitosti', value: costs.properties, color: 'var(--color-properties)' },
    ].filter(d => d.value > 0);

    // Calculate chart segments
    let cumulativePercent = 0;
    const chartSegments = data.map(d => {
        const start = cumulativePercent;
        const percent = d.value / costs.total;
        cumulativePercent += percent;
        return { ...d, start, percent };
    });

    function getCoordinatesForPercent(percent: number) {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    }

    return (
        <main className="container">
            <Link href="/" className={styles.backLink}>
                <ChevronLeft size={20} /> Zpět
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ padding: 8, background: 'var(--color-finance)', borderRadius: 12, color: 'white' }}>
                    <BarChart3 size={24} />
                </div>
                <h1 className={styles.title} style={{ marginBottom: 0 }}>Statistiky</h1>
            </div>

            <div className={styles.grid}>
                <Card className={styles.mainCard}>
                    <div className={styles.chartContainer}>
                        {/* Donut Chart SVG */}
                        <svg viewBox="-1 -1 2 2" className={styles.donut}>
                            {chartSegments.map((segment, i) => {
                                const [startX, startY] = getCoordinatesForPercent(segment.start);
                                const [endX, endY] = getCoordinatesForPercent(segment.start + segment.percent);
                                const largeArcFlag = segment.percent > 0.5 ? 1 : 0;

                                // Fix for 100% circle
                                const pathData = segment.percent === 1
                                    ? "M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0"
                                    : `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;

                                return (
                                    <path d={pathData} fill={segment.color} key={i} stroke="var(--surface)" strokeWidth="0.02" />
                                );
                            })}
                            {/* Inner Circle for Donut Effect */}
                            <circle cx="0" cy="0" r="0.7" fill="var(--surface)" />
                        </svg>

                        <div className={styles.centerText}>
                            <div className={styles.centerValue}>{Math.round(costs.total).toLocaleString()}</div>
                            <div className={styles.centerLabel}>Kč / rok</div>
                        </div>
                    </div>

                    <div className={styles.legend}>
                        {data.map((d, i) => (
                            <div key={i} className={styles.legendItem}>
                                <span className={styles.legendColor} style={{ background: d.color }}></span>
                                <span className={styles.legendLabel}>{d.label}</span>
                                <span className={styles.legendValue}>{Math.round(d.value).toLocaleString()} Kč</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Podle plátce">
                    <div className={styles.payerList}>
                        {Object.entries(payerStats).sort((a, b) => b[1] - a[1]).map(([name, amount]) => (
                            <div key={name} className={styles.payerItem}>
                                <span className={styles.payerName}>{name}</span>
                                <span className={styles.payerAmount}>{Math.round(amount).toLocaleString()} Kč</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Měsíční průměr">
                    <div className={styles.statBig}>{Math.round(costs.total / 12).toLocaleString()} Kč</div>
                    <p className={styles.note}>Průměrná zátěž rodinného rozpočtu (bez předplatných)</p>
                </Card>
            </div>
        </main>
    );
}
