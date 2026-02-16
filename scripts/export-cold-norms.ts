
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { NormRecipe } from '../types';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
        console.error('FIREBASE_PRIVATE_KEY is missing');
        process.exit(1);
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey.replace(/\\n/g, '\n')
            })
        });
        console.log("Firebase initialized.");
    } catch (error) {
        console.error("Firebase init error:", error);
        process.exit(1);
    }
}

const db = getFirestore();
const OUTPUT_FILE = path.join(process.cwd(), 'data/norms-cold.txt');

async function exportColdNorms() {
    console.log('Fetching Cold Kitchen recipes...');

    // Fetch all Cold Kitchen recipes (Sort in memory to avoid index requirement)
    const snapshot = await db.collection('normRecipes')
        .where('source', '==', 'cold')
        .get();

    if (snapshot.empty) {
        console.log('No Cold Kitchen recipes found.');
        return;
    }

    console.log(`Found ${snapshot.size} recipes. Preparing export...`);

    let outputText = "RECEPTURY STUDENÝCH POKRMŮ (ČSN)\n\n";

    // Group by Category Name to make it structured (optional but nice for context)
    // Actually, just listing them sequentially is fine for LLM context, but let's add headers.

    const recipes = snapshot.docs
        .map(doc => doc.data() as NormRecipe)
        .sort((a, b) => a.id.localeCompare(b.id));

    let currentCategory = '';

    for (const recipe of recipes) {
        if (recipe.categoryName && recipe.categoryName !== currentCategory) {
            currentCategory = recipe.categoryName;
            outputText += `\n${'='.repeat(40)}\n${currentCategory.toUpperCase()}\n${'='.repeat(40)}\n\n`;
        }

        const ingredientsText = recipe.ingredients.map(i =>
            `  ${i.name.padEnd(30)} | Hrubá: ${String(i.gross || '—').padStart(5)} | Odpad: ${String(i.waste || '—').padStart(4)} | Čistá: ${String(i.net || '—').padStart(5)}`
        ).join('\n');

        outputText += `RECEPTURA Č. ${recipe.id}: ${recipe.title}\n`;
        outputText += `Výtěžnost: ${recipe.yield || 'N/A'}\n`;
        if (recipe.portionInfo) outputText += `${recipe.portionInfo}\n`;
        outputText += `\nPOPIS:\n${recipe.description || 'Není k dispozici.'}\n`;
        outputText += `\nSUROVINY:\n${ingredientsText}\n`;
        outputText += `\nPOSTUP:\n${recipe.procedure || 'Není k dispozici.'}\n`;
        outputText += `\n${'-'.repeat(20)}\n\n`;
    }

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, outputText, 'utf-8');
    console.log(`Exported to ${OUTPUT_FILE}`);
    console.log(`Total size: ${(outputText.length / 1024).toFixed(2)} KB`);
}

exportColdNorms().catch(console.error);
