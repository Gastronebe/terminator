
import * as fs from 'fs';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

function getFirebaseAdmin() {
    if (admin.apps.length > 0) return admin.apps[0]!;

    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) throw new Error('FIREBASE_PRIVATE_KEY is missing');

    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey.replace(/\\n/g, '\n')
        })
    });
}

// Detailed mapping based on ČSN 1986 and ID distribution
const CATEGORY_MAP: Record<string, { name: string, parentGroup: string, range: [number, number] }> = {
    // 10 Polévky
    '101': { name: 'Bílé polévky', parentGroup: 'Polévky', range: [10100, 10199] },
    '102': { name: 'Hnědé polévky', parentGroup: 'Polévky', range: [10200, 10299] },
    '103': { name: 'Přesnídávkové polévky', parentGroup: 'Polévky', range: [10300, 10399] },
    '104': { name: 'Zdravotní polévky', parentGroup: 'Polévky', range: [10400, 10499] },

    // 11 Hovězí
    '110': { name: 'Pečené hovězí maso', parentGroup: 'Hovězí maso', range: [11000, 11099] },
    '111': { name: 'Dušené hovězí maso', parentGroup: 'Hovězí maso', range: [11100, 11199] },
    '113': { name: 'Vařené hovězí maso', parentGroup: 'Hovězí maso', range: [11300, 11399] },
    '115': { name: 'Hovězí droby', parentGroup: 'Hovězí maso', range: [11500, 11599] },
    '116': { name: 'Minutky z hovězího masa', parentGroup: 'Hovězí maso', range: [11600, 11699] },
    '117': { name: 'Zdravotní pokrmy', parentGroup: 'Hovězí maso', range: [11700, 11799] },

    // 12 Telecí
    '120': { name: 'Pečené telecí maso', parentGroup: 'Telecí maso', range: [12000, 12099] },
    '121': { name: 'Dušené telecí maso', parentGroup: 'Telecí maso', range: [12100, 12199] },
    '122': { name: 'Smažené telecí maso', parentGroup: 'Telecí maso', range: [12200, 12299] },
    '123': { name: 'Vařené telecí maso', parentGroup: 'Telecí maso', range: [12300, 12399] },
    '125': { name: 'Telecí droby', parentGroup: 'Telecí maso', range: [12500, 12599] },
    '126': { name: 'Minutky z telecího masa', parentGroup: 'Telecí maso', range: [12600, 12699] },
    '127': { name: 'Zdravotní pokrmy', parentGroup: 'Telecí maso', range: [12700, 12799] },

    // 13 Vepřové
    '130': { name: 'Pečené vepřové maso', parentGroup: 'Vepřové maso', range: [13000, 13099] },
    '131': { name: 'Dušené vepřové maso', parentGroup: 'Vepřové maso', range: [13100, 13199] },
    '132': { name: 'Smažené vepřové maso', parentGroup: 'Vepřové maso', range: [13200, 13299] },
    '133': { name: 'Vařené vepřové maso', parentGroup: 'Vepřové maso', range: [13300, 13399] },
    '134': { name: 'Uzené maso a šunky', parentGroup: 'Vepřové maso', range: [13400, 13499] },
    '135': { name: 'Vepřové droby', parentGroup: 'Vepřové maso', range: [13500, 13599] },
    '136': { name: 'Minutky z vepřového masa', parentGroup: 'Vepřové maso', range: [13600, 13699] },

    // 14 Skopové
    '140': { name: 'Skopové maso zadní', parentGroup: 'Skopové maso', range: [14000, 14099] },
    '141': { name: 'Skopové maso přední', parentGroup: 'Skopové maso', range: [14100, 14199] },
    '142': { name: 'Smažené skopové maso', parentGroup: 'Skopové maso', range: [14200, 14299] },
    '147': { name: 'Zdravotní pokrmy', parentGroup: 'Skopové maso', range: [14700, 14799] },

    // 15 Mleté
    '150': { name: 'Hovězí maso mleté', parentGroup: 'Mletá masa', range: [15000, 15099] },
    '151': { name: 'Sekaná masa', parentGroup: 'Mletá masa', range: [15100, 15199] },
    '152': { name: 'Telecí maso mleté', parentGroup: 'Mletá masa', range: [15200, 15299] },
    '153': { name: 'Vepřové maso mleté', parentGroup: 'Mletá masa', range: [15300, 15399] },
    '154': { name: 'Směsi mletého masa', parentGroup: 'Mletá masa', range: [15400, 15499] },
    '155': { name: 'Pokrmy s uzeninou', parentGroup: 'Mletá masa', range: [15500, 15599] },
    '156': { name: 'Pokrmy italské kuchyně', parentGroup: 'Mletá masa', range: [15600, 15699] },
    '157': { name: 'Zdravotní pokrmy', parentGroup: 'Mletá masa', range: [15700, 15799] },

    // 16 Zvěřina
    '160': { name: 'Srnec', parentGroup: 'Zvěřina', range: [16000, 16099] },
    '161': { name: 'Daněk a jelen', parentGroup: 'Zvěřina', range: [16100, 16199] },
    '162': { name: 'Zajíc', parentGroup: 'Zvěřina', range: [16200, 16299] },
    '164': { name: 'Divoký kanec', parentGroup: 'Zvěřina', range: [16400, 16499] },
    '166': { name: 'Bažant', parentGroup: 'Zvěřina', range: [16600, 16699] },
    '168': { name: 'Vodní drůbež divoká', parentGroup: 'Zvěřina', range: [16800, 16899] },

    // 17 Drůbež
    '170': { name: 'Kuře', parentGroup: 'Drůbež', range: [17000, 17099] },
    '171': { name: 'Slepice', parentGroup: 'Drůbež', range: [17100, 17199] },
    '172': { name: 'Husa', parentGroup: 'Drůbež', range: [17200, 17299] },
    '173': { name: 'Kachna', parentGroup: 'Drůbež', range: [17300, 17399] },
    '174': { name: 'Drůbeží droby', parentGroup: 'Drůbež', range: [17400, 17499] },
    '175': { name: 'Krocan', parentGroup: 'Drůbež', range: [17500, 17599] },
    '176': { name: 'Holub', parentGroup: 'Drůbež', range: [17600, 17699] },
    '177': { name: 'Zdravotní pokrmy', parentGroup: 'Drůbež', range: [17700, 17799] },
    '179': { name: 'Ostatní pokrmy', parentGroup: 'Drůbež', range: [17900, 17999] },

    // 18 Ryby
    '180': { name: 'Ryby sladkovodní obecné', parentGroup: 'Ryby', range: [18000, 18099] },
    '181': { name: 'Kapr', parentGroup: 'Ryby', range: [18100, 18199] },
    '182': { name: 'Pstruh', parentGroup: 'Ryby', range: [18200, 18299] },
    '183': { name: 'Štika', parentGroup: 'Ryby', range: [18300, 18399] },
    '184': { name: 'Mořské ryby', parentGroup: 'Ryby', range: [18400, 18499] },
    '187': { name: 'Candát', parentGroup: 'Ryby', range: [18700, 18799] },

    // 19 Bezmasé
    '190': { name: 'Omáčky', parentGroup: 'Bezmasé pokrmy', range: [19000, 19099] },
    '191': { name: 'Zeleninové pokrmy', parentGroup: 'Bezmasé pokrmy', range: [19100, 19199] },
    '192': { name: 'Houby', parentGroup: 'Bezmasé pokrmy', range: [19200, 19299] },
    '193': { name: 'Luštěninové pokrmy', parentGroup: 'Bezmasé pokrmy', range: [19300, 19399] },
    '194': { name: 'Ostatní bezmasé pokrmy', parentGroup: 'Bezmasé pokrmy', range: [19400, 19499] },
    '195': { name: 'Moučníky', parentGroup: 'Moučníky a přílohy', range: [19500, 19599] }, // Changed group to split logical sections
    '196': { name: 'Moučné pokrmy', parentGroup: 'Moučníky a přílohy', range: [19600, 19699] },
    '199': { name: 'Přílohy k pokrmům', parentGroup: 'Moučníky a přílohy', range: [19900, 19999] },
};

async function recategorize() {
    try {
        const app = getFirebaseAdmin();
        const db = app.firestore();

        console.log("Checking categories...");
        const existingCats = await db.collection('normCategories').get();
        const existingIds = new Set(existingCats.docs.map(d => d.id));

        // Create new subcategories
        const batchCats = db.batch();
        for (const [id, info] of Object.entries(CATEGORY_MAP)) {
            const ref = db.collection('normCategories').doc(id);
            batchCats.set(ref, {
                name: info.name,
                parentGroup: info.parentGroup,
                source: 'hot',
                recipeCount: 0,
                order: parseInt(id)
            }, { merge: true });
        }

        // Cleanup old categories (10-21)
        const oldIds = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
        for (const oldId of oldIds) {
            if (existingIds.has(oldId)) {
                batchCats.delete(db.collection('normCategories').doc(oldId));
            }
        }

        await batchCats.commit();
        console.log("Categories structure updated.");

        console.log("Fetching recipes...");
        const recipesSnap = await db.collection('normRecipes').get();
        console.log(`Processing ${recipesSnap.size} recipes...`);

        let updatedCount = 0;
        const batchSize = 400;
        let batch = db.batch();
        let countInBatch = 0;

        for (const doc of recipesSnap.docs) {
            const recipeId = doc.id;
            const idNum = parseInt(recipeId.substring(0, 5));
            if (isNaN(idNum)) continue;

            let targetCat = '';
            let targetCatName = '';

            // Find correct subcategory
            for (const [catId, info] of Object.entries(CATEGORY_MAP)) {
                if (idNum >= info.range[0] && idNum <= info.range[1]) {
                    targetCat = catId;
                    targetCatName = info.name;
                    break;
                }
            }

            if (targetCat) {
                const currentData = doc.data();
                if (String(currentData.categoryId) !== targetCat) {
                    batch.update(doc.ref, {
                        categoryId: targetCat,
                        categoryName: targetCatName // Denormalize for convenience
                    });
                    updatedCount++;
                    countInBatch++;

                    if (countInBatch >= batchSize) {
                        await batch.commit();
                        batch = db.batch();
                        countInBatch = 0;
                        console.log(`Updated ${updatedCount} recipes so far...`);
                    }
                }
            }
        }

        if (countInBatch > 0) {
            await batch.commit();
        }

        console.log(`Finished! Total updated recipes: ${updatedCount}`);

        // Update counts
        console.log("Updating category counts...");
        const allRecs = await db.collection('normRecipes').get();
        const counts: Record<string, number> = {};
        allRecs.forEach(d => {
            const cat = String(d.data().categoryId);
            if (cat && cat !== 'undefined') {
                counts[cat] = (counts[cat] || 0) + 1;
            }
        });

        // Update counts for all defined categories
        const batchCounts = db.batch();
        for (const [catId, _] of Object.entries(CATEGORY_MAP)) {
            const catRef = db.collection('normCategories').doc(catId);
            batchCounts.update(catRef, { recipeCount: counts[catId] || 0 });
        }
        await batchCounts.commit();

        console.log("Category counts updated.");
    } catch (err) {
        console.error("Recategorize failed:", err);
        process.exit(1);
    }
}

recategorize().catch(err => {
    console.error(err);
    process.exit(1);
});
