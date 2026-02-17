import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import firebaseAdmin AFTER loading env vars
// We need to use require or dynamic import
// Since we are in module mode (tsx), dynamic import is best top-level if we can await it, but specific exports are tricky.
// Let's just do it inside the function or use createRequire if needed. Dyanmic import is async.


async function testFirebaseAdmin() {
    // Dynamic import to ensure env vars are loaded
    const { adminAuth, adminDb } = await import('../lib/firebaseAdmin');

    console.log('Testing Firebase Admin Connection...');
    console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing');
    console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing');
    const key = process.env.FIREBASE_PRIVATE_KEY || '';
    console.log('FIREBASE_PRIVATE_KEY (first 20 chars):', key.substring(0, 20).replace(/\n/g, '\\n'));

    try {
        console.log('Attempting to list users...');
        const listUsersResult = await adminAuth.listUsers(1);
        console.log('Successfully fetched users:', listUsersResult.users.length);

        console.log('Attempting to read from Firestore (users collection)...');
        const snapshot = await adminDb.collection('users').limit(1).get();
        console.log('Successfully accessed Firestore. Docs:', snapshot.size);

        process.exit(0);
    } catch (error: any) {
        console.error('FAILED to access Firebase.');
        console.error('Error message:', error.message);
        console.error('Full Error:', error);
        process.exit(1);
    }
}

testFirebaseAdmin().catch(e => {
    console.error('Unhandled script error:', e);
    process.exit(1);
});
