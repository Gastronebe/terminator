import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function DELETE(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = params;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // 1. Delete from Firebase Auth
        await adminAuth.deleteUser(userId);

        // 2. Delete from Firestore
        await adminDb.collection('users').doc(userId).delete();

        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = params;
        const { name, role } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Update Firestore profile
        const updateData: any = {};
        if (name) updateData.name = name;
        if (role) updateData.role = role;

        await adminDb.collection('users').doc(userId).update(updateData);

        // If name changed, update Auth displayName too
        if (name) {
            await adminAuth.updateUser(userId, {
                displayName: name
            });
        }

        return NextResponse.json({ message: 'User updated successfully' });
    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
