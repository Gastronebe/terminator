
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY
        })
    });
}

const db = admin.firestore();

async function run() {
    console.log("Categories:");
    const catsSnap = await db.collection('normCategories').orderBy('id').get();
    catsSnap.forEach(doc => {
        console.log(`${doc.id}: ${doc.data().name} (${doc.data().recipeCount || 0} recipes)`);
    });

    console.log("\nSample Recipes:");
    const recsSnap = await db.collection('normRecipes').limit(20).get();
    recsSnap.forEach(doc => {
        const d = doc.data();
        console.log(`${doc.id}: ${d.name} -> Cat: ${d.categoryId}`);
    });
}

run();
