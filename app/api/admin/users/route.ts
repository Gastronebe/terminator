import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const { email, password, name, role, allowedMenuItems } = await req.json();

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
            return NextResponse.json({ error: 'Invalid field types' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const validRoles = ['admin', 'user'];
        const safeRole = validRoles.includes(role) ? role : 'user';

        const safeAllowedMenuItems = Array.isArray(allowedMenuItems)
            ? allowedMenuItems.filter((item: unknown) => typeof item === 'string')
            : [];

        // 1. Create user in Firebase Auth
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
        });

        // 2. Create user profile in Firestore
        await adminDb.collection('users').doc(userRecord.uid).set({
            name,
            email,
            role: safeRole,
            allowedMenuItems: safeAllowedMenuItems,
            createdAt: Date.now(),
        });

        return NextResponse.json({ uid: userRecord.uid, message: 'User created' });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
