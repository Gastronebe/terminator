import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
        console.error('FIREBASE_PRIVATE_KEY is missing');
        process.exit(1);
    }
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey.replace(/\\n/g, '\n')
        })
    });
}

const db = getFirestore();

async function checkData() {
    console.log('Checking Data Integrity...');
    const results: any = {
        categories: 0,
        recipes: 0,
        orphanedRecipes: 0,
        categoryCounts: {}
    };

    try {
        // 1. Get Categories
        const catSnap = await db.collection('normCategories').get();
        results.categories = catSnap.size;
        const catIds = new Set(catSnap.docs.map(d => d.id));
        console.log(`Found ${results.categories} categories.`);

        // 2. Get Recipes
        const recipeSnap = await db.collection('normRecipes').get();
        results.recipes = recipeSnap.size;
        console.log(`Found ${results.recipes} recipes.`);

        // 3. Analyze Links
        recipeSnap.docs.forEach(doc => {
            const data = doc.data();
            const catId = data.categoryId;

            if (!catId || !catIds.has(catId)) {
                results.orphanedRecipes++;
            } else {
                results.categoryCounts[catId] = (results.categoryCounts[catId] || 0) + 1;
            }
        });

        console.log('Results:', JSON.stringify(results, null, 2));

        fs.writeFileSync('data_status.json', JSON.stringify(results, null, 2));
        console.log('Written to data_status.json');
    } catch (e) {
        console.error(e);
    }
}

checkData().catch(console.error);
