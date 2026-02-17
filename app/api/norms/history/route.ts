import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        // Global history: Fetch last 20 sessions for ALL users
        const snap = await adminDb.collection('chatSessions')
            .orderBy('updatedAt', 'desc')
            .limit(20)
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
        const { sessionId, title, lastMessage, messages, userName, isRecipe } = await req.json();

        if (sessionId) {
            // Verify the session belongs to the authenticated user for editing
            // BUT for global chat, maybe we want to allow viewing but only owner editing?
            // For now, let's keep strict ownership for UPDATES/DELETES to prevent vandalism
            const docRef = adminDb.collection('chatSessions').doc(sessionId);
            const existingDoc = await docRef.get();

            if (!existingDoc.exists) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }

            if (existingDoc.data()?.userId !== auth.uid) {
                return NextResponse.json({ error: 'Unauthorized to edit this session' }, { status: 403 });
            }

            await docRef.update({
                title: title || 'Nová konverzace',
                lastMessage: lastMessage || '',
                messages: messages || [],
                updatedAt: Date.now(),
                isRecipe: isRecipe ?? existingDoc.data()?.isRecipe ?? false,
                // Update userName if provided (e.g. user changed name)
                ...(userName && { userName })
            });
            return NextResponse.json({ success: true, id: sessionId });
        } else {
            // Create new session - use authenticated user's UID
            const docRef = await adminDb.collection('chatSessions').add({
                userId: auth.uid,
                userName: userName || 'Neznámý kuchař',
                title: title || 'Nová konverzace',
                lastMessage: lastMessage || '',
                messages: messages || [],
                isRecipe: isRecipe ?? false,
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
