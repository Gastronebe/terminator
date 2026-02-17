import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        // Use authenticated user's UID instead of trusting query param
        const snap = await adminDb.collection('chatSessions')
            .where('userId', '==', auth.uid)
            .orderBy('updatedAt', 'desc')
            .get();

        const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return NextResponse.json(sessions);
    } catch (error: any) {
        console.error('History GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const { sessionId, title, lastMessage, messages } = await req.json();

        if (sessionId) {
            // Verify the session belongs to the authenticated user
            const docRef = adminDb.collection('chatSessions').doc(sessionId);
            const existingDoc = await docRef.get();

            if (!existingDoc.exists || existingDoc.data()?.userId !== auth.uid) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }

            await docRef.update({
                title: title || 'Nová konverzace',
                lastMessage: lastMessage || '',
                messages: messages || [],
                updatedAt: Date.now()
            });
            return NextResponse.json({ success: true, id: sessionId });
        } else {
            // Create new session - use authenticated user's UID
            const docRef = await adminDb.collection('chatSessions').add({
                userId: auth.uid,
                title: title || 'Nová konverzace',
                lastMessage: lastMessage || '',
                messages: messages || [],
                updatedAt: Date.now(),
                createdAt: Date.now()
            });
            return NextResponse.json({ success: true, id: docRef.id });
        }
    } catch (error: any) {
        console.error('History POST error:', error);
        return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const { sessionId } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
        }

        const docRef = adminDb.collection('chatSessions').doc(sessionId);
        const existingDoc = await docRef.get();

        if (!existingDoc.exists || existingDoc.data()?.userId !== auth.uid) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        await docRef.delete();
        return NextResponse.json({ message: 'Session deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
}
