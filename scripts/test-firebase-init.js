
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function test() {
    console.log("Testing Firebase Init...");
    let key = process.env.FIREBASE_PRIVATE_KEY;

    if (!key) {
        console.error("No key found!");
        return;
    }

    console.log(`Key loaded from env. Length: ${key.length}`);
    console.log(`Start: ${JSON.stringify(key.substring(0, 50))}`);
    console.log(`End:   ${JSON.stringify(key.substring(key.length - 50))}`);

    // Check for newlines
    const hasRealNewlines = key.includes('\n');
    const hasLiteralNewlines = key.includes('\\n');
    console.log(`Has real newlines? ${hasRealNewlines}`);
    console.log(`Has literal \\n? ${hasLiteralNewlines}`);

    // Manual Fix Attempt (mimicking what we want to do)
    let fixedKey = key;
    fixedKey = fixedKey.replace(/\\n/g, '\n');

    // Check if quotes are being included by dotenv
    if (fixedKey.startsWith('"') && fixedKey.endsWith('"')) {
        console.log("Removing wrapping quotes...");
        fixedKey = fixedKey.slice(1, -1);
    }

    // Check for trailing comma?
    if (fixedKey.trim().endsWith(',')) {
        console.log("Removing trailing comma...");
        fixedKey = fixedKey.trim().slice(0, -1);
    }

    // Check for quote again after comma removal?
    if (fixedKey.endsWith('"')) {
        console.log("Removing trailing quote after comma...");
        fixedKey = fixedKey.slice(0, -1);
    }

    console.log(`Fixed Key Start: ${JSON.stringify(fixedKey.substring(0, 50))}`);

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: fixedKey
            })
        });
        console.log("App initialized. Trying Firestore write...");

        const db = getFirestore();
        await db.collection('test_debug').doc('connection_check').set({ timestamp: Date.now() });
        console.log("✅ Firestore write successful! Key is GOOD.");
    } catch (e) {
        console.error("❌ Firebase Error:", e);
    }
}

test();
