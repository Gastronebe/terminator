import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/apiAuth';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const { userId } = await params;

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Prevent admin from deleting themselves
        if (userId === auth.uid) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        // 1. Delete from Firebase Auth
        await adminAuth.deleteUser(userId);

        // 2. Delete from Firestore
        await adminDb.collection('users').doc(userId).delete();

        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const { userId } = await params;
        const { name, role, allowedMenuItems } = await req.json();

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const validRoles = ['admin', 'user'];
        const updateData: Record<string, unknown> = {};

        if (name && typeof name === 'string') updateData.name = name;
        if (role && validRoles.includes(role)) updateData.role = role;
        if (Array.isArray(allowedMenuItems)) {
            updateData.allowedMenuItems = allowedMenuItems.filter(
                (item: unknown) => typeof item === 'string'
            );
        }

        await adminDb.collection('users').doc(userId).update(updateData);

        // If name changed, update Auth displayName too
        if (name && typeof name === 'string') {
            await adminAuth.updateUser(userId, {
                displayName: name
            });
        }

        return NextResponse.json({ message: 'User updated successfully' });
    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
