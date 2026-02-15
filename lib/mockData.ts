import { User, Asset, AssetItem, Subscription, PersonalDocument } from "@/types";

export const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Admin User', email: 'admin@example.com', role: 'admin', createdAt: Date.now() },
];

export const MOCK_ASSETS: Asset[] = [
    {
        id: 'a1',
        type: 'car',
        name: 'Škoda Octavia',
        ownerId: 'u1',
        metadata: { spz: '1AB 2345', note: 'Rodinné auto' },
        createdAt: Date.now()
    },
    {
        id: 'a2',
        type: 'property',
        name: 'Byt Praha',
        ownerId: 'u1',
        metadata: { note: 'Pronájem' },
        createdAt: Date.now()
    }
];

export const MOCK_ASSET_ITEMS: AssetItem[] = [
    {
        id: 'ai1',
        assetId: 'a1',
        type: 'stk',
        name: 'STK',
        validUntil: new Date('2024-12-01').getTime(),
        notifyBeforeDays: 30,
        createdAt: Date.now()
    },
    {
        id: 'ai2',
        assetId: 'a1',
        type: 'insurance',
        name: 'Povinné ručení',
        validUntil: new Date('2024-05-15').getTime(),
        notifyBeforeDays: 30,
        createdAt: Date.now()
    }
];

export const MOCK_SUBSCRIPTIONS: Subscription[] = [
    {
        id: 's1',
        name: 'Netflix',
        monthlyPrice: 259,
        billingPeriod: 'monthly',
        nextPaymentDate: new Date('2024-03-20').getTime(),
        credentials: 'user: pass',
        createdAt: Date.now()
    }
];

export const MOCK_DOCUMENTS: PersonalDocument[] = [
    {
        id: 'd1',
        ownerId: 'u1',
        type: 'id_card',
        validUntil: new Date('2028-01-01').getTime(),
        notifyBeforeDays: 60,
        createdAt: Date.now()
    }
];
