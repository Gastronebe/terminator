import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Protect this route, admin only
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const envStatus = {
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing',
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing',
        FIREBASE_PRIVATE_KEY: checkKey(process.env.FIREBASE_PRIVATE_KEY),
        GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? 'Set' : 'Missing',
        GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID ? 'Set' : 'Missing',
        GOOGLE_PRIVATE_KEY: checkKey(process.env.GOOGLE_PRIVATE_KEY),
        NODE_ENV: process.env.NODE_ENV,
    };

    return NextResponse.json(envStatus);
}

function checkKey(key: string | undefined) {
    if (!key) return 'Missing';

    const len = key.length;
    let status = `Present (${len} chars)`;

    if (key.includes('\\n')) status += ', Contains literal \\n';
    if (key.includes('\n')) status += ', Contains real newlines';
    if (key.startsWith('"') || key.startsWith("'")) status += ', Wrapped in quotes';

    // Check start and end of private key (standard PEM format)
    // We do loose check because our parser cleans it up
    if (key.includes('BEGIN PRIVATE KEY')) status += ', Has Header';
    else status += ', Missing Header';

    return status;
}
