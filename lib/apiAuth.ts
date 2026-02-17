import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from './firebaseAdmin';

interface AuthResult {
    uid: string;
    role: string;
}

/**
 * Verifies Firebase ID token from Authorization header and returns user info.
 * Returns null if authentication fails.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthResult | null> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
        return null;
    }

    try {
        const decoded = await adminAuth.verifyIdToken(token);
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        const role = userDoc.exists ? userDoc.data()?.role || 'user' : 'user';

        return { uid: decoded.uid, role };
    } catch (err: any) {
        console.error('verifyAuth Error:', err.code || err.message || err);
        return null;
    }
}

/**
 * Verifies authentication and returns 401 if not authenticated.
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult | NextResponse> {
    const auth = await verifyAuth(req);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return auth;
}

/**
 * Verifies authentication + admin role. Returns 403 if not admin.
 */
export async function requireAdmin(req: NextRequest): Promise<AuthResult | NextResponse> {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return auth;
}
