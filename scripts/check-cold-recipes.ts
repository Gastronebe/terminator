
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

function getFirebaseAdmin() {
    if (admin.apps.length > 0) return admin.apps[0]!;

    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) throw new Error('FIREBASE_PRIVATE_KEY is missing');

    // Robust key normalization (same as import script)
    privateKey = privateKey.trim();
    if (privateKey.endsWith(',')) {
        privateKey = privateKey.slice(0, -1).trim();
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\r/g, '');

    const HEADER = "-----BEGIN PRIVATE KEY-----";
    const FOOTER = "-----END PRIVATE KEY-----";

    let body = privateKey;
    if (body.includes(HEADER)) body = body.replace(HEADER, '');
    if (body.includes(FOOTER)) body = body.replace(FOOTER, '');

    body = body.trim();
    privateKey = `${HEADER}\n${body}\n${FOOTER}\n`;

    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
        })
    });
}

async function checkCold() {
    const app = getFirebaseAdmin();
    const db = app.firestore();

    console.log("Fetching cold recipes (5xxxx)...");
    const snapshot = await db.collection('normRecipes')
        .where(admin.firestore.FieldPath.documentId(), '>=', '50000')
        .where(admin.firestore.FieldPath.documentId(), '<=', '59999')
        .get();

    console.log(`Total cold recipes found: ${snapshot.size}`);

    const categories: Record<string, number> = {};
    const prefixes: Record<string, number> = {};

    snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        let cat = data.categoryName || 'unknown';

        // Normalize: Capitalize first letter, rest lowercase
        cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();

        const prefix = doc.id.substring(0, 3);

        categories[cat] = (categories[cat] || 0) + 1;
        prefixes[prefix] = (prefixes[prefix] || 0) + 1;

        // Print 1st recipe as sample
        if (index === 0) {
            console.log("\n--- SAMPLE RECIPE (Text Format Check) ---");
            console.log(`ID: ${doc.id}`);
            console.log(`Title: ${data.title}`);
            console.log(`Ingredients:`, JSON.stringify(data.ingredients, null, 2));
            console.log(`Procedure: ${data.procedure?.substring(0, 100)}...`);
            console.log("-----------------------------------------\n");
        }
    });

    console.log("\nCounts by Category ID:");
    console.log(categories);

    console.log("\nCounts by ID Prefix (5xx):");
    console.log(prefixes);

    // List gaps?
    // It's hard to know gaps without knowing the source.
}

checkCold().catch(console.error);
