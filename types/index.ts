export type UserRole = 'admin' | 'user';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: number; // timestamp
}

export type AssetType = 'car' | 'property';

export interface AssetMetadata {
    spz?: string; // Car specific
    note?: string;
    imageUrl?: string; // Main asset photo
    greenCard?: {
        url: string;
        validUntil?: number;
    };
    otherDocuments?: {
        name: string;
        url: string;
        type: 'pdf' | 'image';
        uploadedAt: number;
    }[];
    odometerHistory?: {
        date: number;
        value: number;
    }[];
}

export interface Asset {
    id: string;
    type: AssetType;
    name: string;
    ownerId: string;
    metadata: AssetMetadata;
    createdAt: number;
}

export type AssetItemType = 'stk' | 'insurance' | 'vignette' | 'chimney' | 'property_tax';

export interface AssetItem {
    id: string;
    assetId: string;
    type: AssetItemType;
    name: string;
    validUntil: number; // timestamp
    notifyBeforeDays: number;
    price?: number;
    note?: string;
    fileUrl?: string;
    createdAt: number;
    payer?: string; // e.g. "Martin", "Jana"
}

export type BillingPeriod = 'monthly' | 'yearly';

export interface Subscription {
    id: string;
    name: string;
    monthlyPrice: number;
    billingPeriod: BillingPeriod;
    nextPaymentDate: number; // timestamp
    credentials?: string; // Visible only to admin
    note?: string;
    createdAt: number;
    payer?: string; // e.g. "Martin", "Jana"
    trackStatus?: boolean;
}

export type DocumentType = 'id_card' | 'passport' | 'health_card' | 'drivers_license';

export interface PersonalDocument {
    id: string;
    ownerId: string;
    type: DocumentType;
    number?: string;
    validUntil: number;
    notifyBeforeDays: number;
    fileUrl?: string;
    createdAt: number;
    name?: string; // Jméno osoby (např. Martin)
}

export type AccessRequestStatus = 'pending' | 'resolved';

export interface AccessRequest {
    id: string;
    subscriptionId: string;
    requestedByUserId: string;
    status: AccessRequestStatus;
    createdAt: number;
    resolvedAt?: number;
}

export type Status = 'active' | 'warning' | 'expired';

export interface Birthday {
    id: string;
    name: string;
    date: number; // timestamp of the birth date (year matters for age, but for sorting we use month/day)
    photoUrl?: string; // Base64 or URL
    createdAt: number;
}

export interface DiscountCard {
    id: string;
    name: string;
    code: string;
    type: 'barcode' | 'qrcode' | 'text';
    color?: string;
    note?: string;
    logoUrl?: string;
    createdAt?: number;
}
