import * as admin from 'firebase-admin';

const formatPrivateKey = (key: string | undefined) => {
    if (!key) return undefined;

    // 1. Basic trim
    let privateKey = key.trim();

    // 2. Remove potential trailing comma from JSON copy-paste
    if (privateKey.endsWith(',')) {
        privateKey = privateKey.slice(0, -1).trim();
    }

    // 3. Remove surrounding quotes
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }

    // 4. Handle escaped newlines
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // 5. Remove carriage returns
    privateKey = privateKey.replace(/\r/g, '');

    // 6. Strict PEM reconstruction if needed
    const HEADER = "-----BEGIN PRIVATE KEY-----";
    const FOOTER = "-----END PRIVATE KEY-----";

    let body = privateKey;
    if (body.includes(HEADER)) body = body.replace(HEADER, '');
    if (body.includes(FOOTER)) body = body.replace(FOOTER, '');

    body = body.trim();
    return `${HEADER}\n${body}\n${FOOTER}\n`;
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
    });
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb };
