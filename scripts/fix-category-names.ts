
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase (Robust)
if (!admin.apps.length) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) { process.exit(1); }

    privateKey = privateKey.trim();
    if (privateKey.endsWith(',')) privateKey = privateKey.slice(0, -1).trim();
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
    privateKey = privateKey.replace(/\r/g, '');

    const HEADER = "-----BEGIN PRIVATE KEY-----";
    const FOOTER = "-----END PRIVATE KEY-----";
    let body = privateKey;
    if (body.includes(HEADER)) body = body.replace(HEADER, '');
    if (body.includes(FOOTER)) body = body.replace(FOOTER, '');
    body = body.trim();
    privateKey = `${HEADER}\n${body}\n${FOOTER}\n`;

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey
            })
        });
    } catch (error) {
        console.error("Firebase init error:", error);
        process.exit(1);
    }
}

const db = getFirestore();

const CORRECT_NAMES = [
    { id: "501", name: "Základní výrobky" },
    { id: "502", name: "Zdobená vejce" },
    { id: "503", name: "Výrobky v aspiku" },
    { id: "504", name: "Rybí výrobky" },
    { id: "505", name: "Obložené saláty" },
    { id: "506", name: "Sýrové výrobky" },
    { id: "507", name: "Ostatní výrobky" },
    { id: "508", name: "Obložené chlebíčky masové" },
    { id: "509", name: "Obložené chlebíčky salátové" },
    { id: "510", name: "Obložené chlebíčky sýrové" },
    { id: "511", name: "Ostatní chlebíčky" },
    { id: "512", name: "Svačinové chlebíčky" },
    { id: "513", name: "Chuťovky" },
    { id: "514", name: "Studená masa tepelně upravená" },
];

async function fixCategories() {
    console.log("Fixing category names...");
    const batch = db.batch();

    for (const cat of CORRECT_NAMES) {
        const ref = db.collection('normCategories').doc(cat.id);
        batch.set(ref, {
            name: cat.name,
            id: cat.id,
            parentGroup: "Studená kuchyně",
            source: "cold",
            order: parseInt(cat.id)
        }, { merge: true });
        console.log(`Queueing update for ${cat.id} -> ${cat.name}`);
    }

    await batch.commit();
    console.log("Categories updated.");

    // Optional: Update recipes to match?
    // This is heavier, but good for consistency.
    console.log("Updating recipes to match category names...");

    for (const cat of CORRECT_NAMES) {
        const snapshot = await db.collection('normRecipes')
            .where('categoryId', '==', cat.id)
            .get();

        if (snapshot.empty) continue;

        console.log(`Processing ${snapshot.size} recipes for ${cat.id}...`);

        // Process in chunks of 500
        const chunks = [];
        let currentChunk = db.batch();
        let count = 0;

        snapshot.docs.forEach((doc) => {
            currentChunk.update(doc.ref, { categoryName: cat.name });
            count++;
            if (count % 400 === 0) {
                chunks.push(currentChunk);
                currentChunk = db.batch();
            }
        });
        chunks.push(currentChunk);

        for (const b of chunks) {
            await b.commit();
        }
    }
    console.log("Recipes updated.");
}

fixCategories();
