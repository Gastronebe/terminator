import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
    try {
        const userId = req.nextUrl.searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const q = query(
            collection(db, 'chatSessions'),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc')
        );

        const snap = await getDocs(q);
        const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        return NextResponse.json(sessions);
    } catch (error: any) {
        console.error('History GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { sessionId, userId, title, lastMessage, messages } = await req.json();

        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        if (sessionId) {
            // Update existing
            const docRef = doc(db, 'chatSessions', sessionId);
            await updateDoc(docRef, {
                title: title || 'Nová konverzace',
                lastMessage: lastMessage || '',
                messages: messages || [],
                updatedAt: Date.now()
            });
            return NextResponse.json({ success: true, id: sessionId });
        } else {
            // Create new
            const docRef = await addDoc(collection(db, 'chatSessions'), {
                userId,
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        // Just a placeholder for now, implement if needed
        return NextResponse.json({ message: 'Not implemented' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
