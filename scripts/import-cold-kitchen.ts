
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load environment variables
dotenv.config({ path: '.env.local' });

function getPrivateKeyManual(): string | undefined {
    // ... preserved but unlikely used ... 
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) return undefined;
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(/FIREBASE_PRIVATE_KEY=(.*)/);
        if (match) {
            let key = match[1].trim();
            if (key.endsWith(',')) {
                key = key.slice(0, -1).trim();
            }
            if (key.startsWith('"') && key.endsWith('"')) {
                key = key.slice(1, -1);
            }
            return key;
        }
    } catch (e) { console.error("Manual env read failed", e); }
    return undefined;
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Force manual read if missing or short
    if (!privateKey || privateKey.length < 100) {
        console.log("Forcing manual read...");
        privateKey = getPrivateKeyManual();
    }

    if (!privateKey) {
        console.error('FIREBASE_PRIVATE_KEY is missing');
        process.exit(1);
    }

    // SANITIZATION FIX: Remove trailing comma from JSON copy-paste
    privateKey = privateKey.trim();
    if (privateKey.endsWith(',')) {
        privateKey = privateKey.slice(0, -1).trim();
    }

    // Robust key normalization
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
    }

    // Remove carriage returns just in case
    privateKey = privateKey.replace(/\r/g, '');

    // Strict PEM reconstruction
    const HEADER = "-----BEGIN PRIVATE KEY-----";
    const FOOTER = "-----END PRIVATE KEY-----";

    let body = privateKey;
    if (body.includes(HEADER)) body = body.replace(HEADER, '');
    if (body.includes(FOOTER)) body = body.replace(FOOTER, '');

    body = body.trim();

    // Ensure properly formatted PEM
    privateKey = `${HEADER}\n${body}\n${FOOTER}\n`;

    // Debug key after sanitization
    console.log(`Debug Key: Length=${privateKey.length}`);
    console.log(`Start: ${JSON.stringify(privateKey.substring(0, 50))}`);
    console.log(`End: ${JSON.stringify(privateKey.substring(privateKey.length - 50))}`);

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey
            })
        });
        console.log("Firebase initialized.");
    } catch (error) {
        console.error("Firebase init error:", error);
        // console.error("Key start:", privateKey ? privateKey.substring(0, 30) : 'N/A');
        process.exit(1);
    }
}

const db = getFirestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Categories mapping
const CATEGORY_RANGES = [
    { start: 35, end: 130, id: "501", name: "Základní výrobky" },
    { start: 131, end: 152, id: "502", name: "Zdobená vejce" },
    { start: 153, end: 190, id: "503", name: "Výrobky v aspiku" },
    { start: 191, end: 284, id: "504", name: "Rybí výrobky" },
    { start: 285, end: 308, id: "505", name: "Obložené saláty" },
    { start: 309, end: 334, id: "506", name: "Sýrové výrobky" },
    { start: 335, end: 386, id: "507", name: "Ostatní výrobky" },
    { start: 387, end: 422, id: "508", name: "Obložené chlebíčky masové" },
    { start: 423, end: 444, id: "509", name: "Obložené chlebíčky salátové" },
    { start: 445, end: 454, id: "510", name: "Obložené chlebíčky sýrové" },
    { start: 455, end: 480, id: "511", name: "Ostatní chlebíčky" },
    { start: 481, end: 502, id: "512", name: "Svačinové chlebíčky" },
    { start: 503, end: 520, id: "513", name: "Chuťovky" },
    { start: 521, end: 558, id: "514", name: "Studená masa tepelně upravená" },
];

const PROGRESS_FILE = 'import-progress.json';

function loadProgress(): number {
    if (fs.existsSync(PROGRESS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
            return data.lastPage || 0;
        } catch (e) {
            console.error("Error reading progress file:", e);
        }
    }
    return 0;
}

function saveProgress(page: number) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastPage: page }));
}

async function uploadToGemini(path: string, mimeType: string) {
    const uploadResult = await fileManager.uploadFile(path, {
        mimeType,
        displayName: "Cold Kitchen Part",
    });
    const file = uploadResult.file;
    console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
    return file;
}

async function waitForActive(file: any) {
    console.log("Waiting for file processing...");
    let name = file.name;
    while (true) {
        const fileStat = await fileManager.getFile(name);
        if (fileStat.state === "ACTIVE") {
            console.log("File is active and ready.");
            return fileStat;
        }
        if (fileStat.state === "FAILED") {
            throw new Error("File processing failed.");
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        process.stdout.write(".");
    }
}

async function extractRecipes() {
    const SPLIT_DIR = path.join(process.cwd(), '../receptury-studene-kuchyne');
    if (!fs.existsSync(SPLIT_DIR)) {
        console.error(`Split directory not found: ${SPLIT_DIR}`);
        process.exit(1);
    }

    // Read and sort files numerically
    const files = fs.readdirSync(SPLIT_DIR)
        .filter((f: string) => f.endsWith('.pdf'))
        .map((f: string) => {
            const match = f.match(/(\d+)-(\d+)\.pdf$/);
            return {
                name: f,
                path: path.join(SPLIT_DIR, f),
                start: match ? parseInt(match[1]) : 0,
                end: match ? parseInt(match[2]) : 0
            };
        })
        .filter((f: any) => f.start > 0) // Filter out parsable
        .sort((a: any, b: any) => a.start - b.start);

    console.log(`Found ${files.length} split files.`);

    const lastGlobalPage = loadProgress();

    let startingFileIdx = 0;
    if (lastGlobalPage > 0) {
        startingFileIdx = files.findIndex((f: any) => f.end > lastGlobalPage);
    }

    if (startingFileIdx === -1 && lastGlobalPage > 0) {
        console.log("All pages seem to be processed based on progress file.");
        return;
    }

    if (startingFileIdx === -1) startingFileIdx = 0;

    console.log(`Resuming from file index ${startingFileIdx}: ${files[startingFileIdx].name} (Global page target > ${lastGlobalPage})`);

    let totalImported = 0;

    for (let fIdx = startingFileIdx; fIdx < files.length; fIdx++) {
        const fileObj = files[fIdx];
        console.log(`\n==========================================`);
        console.log(`Processing file: ${fileObj.name} (Global ${fileObj.start}-${fileObj.end})`);
        console.log(`==========================================`);

        console.log(`Uploading...`);
        let fileUpload;
        try {
            fileUpload = await uploadToGemini(fileObj.path, "application/pdf");
            await waitForActive(fileUpload);
        } catch (e) {
            console.error(`Failed to upload ${fileObj.name}:`, e);
            continue;
        }

        const BATCH_SIZE = 5;
        const totalLocalPages = fileObj.end - fileObj.start + 1;

        // Calculate where to start within this file
        let localStartPage = 1;
        if (lastGlobalPage >= fileObj.start) {
            localStartPage = lastGlobalPage - fileObj.start + 2;
        }

        localStartPage = Math.max(1, localStartPage);

        if (localStartPage > totalLocalPages) {
            console.log("File already processed completely.");
            continue;
        }

        for (let currentLocal = localStartPage; currentLocal <= totalLocalPages; currentLocal += BATCH_SIZE) {
            const endLocal = Math.min(currentLocal + BATCH_SIZE - 1, totalLocalPages);

            const globalCurrent = fileObj.start + currentLocal - 1;
            const globalEnd = fileObj.start + endLocal - 1;

            console.log(`  > Batch: Local ${currentLocal}-${endLocal} (Global ${globalCurrent}-${globalEnd})...`);

            let retries = 10;
            let success = false;

            while (retries > 0 && !success) {
                try {
                    const prompt = `
                    Jsi expert na extrakci dat z kuchařky.
                    
                    ZADÁNÍ:
                    Analyzuj tento dokument (což je část větší knihy, strany ${fileObj.start}-${fileObj.end}).
                    Zaměř se na strany ${currentLocal} až ${endLocal} tohoto PDF souboru.
                    Hledej VŠECHNY receptury na studenou kuchyni.
                    
                    DŮLEŽITÉ:
                    - Pokud receptura začíná na předchozí straně a zde pokračuje, ignoruj ji (byla stažena v minulé dávce).
                    - Pokud receptura začíná zde a pokračuje dál, stáhni co vidíš (název, ID).
                    
                    DATA RECEPTURY (JSON):
                    {
                        "id": "5místné číslo (řada 5xxxx)",
                        "title": "název receptury (S Velkým Písmenem)",
                        "description": "popis a charakteristika",
                        "procedure": "výrobní postup",
                        "ingredients": [
                            { "name": "surovina", "gross": číslo|null, "waste": číslo|null, "net": číslo|null, "note": "poznámka"|null }
                        ],
                        "yield": "výtěžnost",
                        "portionInfo": "info o porci",
                        "totalGross": číslo|null,
                        "totalNet": číslo|null,
                        "losses": číslo|null,
                        "finishedAmount": číslo|null,
                        "references": ["čísla odkazovaných receptur"],
                        "pageNumber": číslo_stránky_z_patičky,
                        "categoryName": "název kategorie/kapitola"
                    }

                    Odpověz POUZE validním JSON polem.
                    Pokud nic nenajdeš, vrať [].
                    `;

                    const result = await model.generateContent([
                        { fileData: { mimeType: fileUpload.mimeType, fileUri: fileUpload.uri } },
                        { text: prompt }
                    ]);

                    const responseText = result.response.text();
                    let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const firstBrace = jsonStr.indexOf('[');
                    const lastBrace = jsonStr.lastIndexOf(']');
                    let recipes: any[] = [];
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                        recipes = JSON.parse(jsonStr);
                    }

                    console.log(`    Found ${recipes.length} recipes.`);

                    if (recipes.length > 0) {
                        const batch = db.batch();
                        for (const r of recipes) {
                            if (!r.id || !r.title) continue;
                            const recipeId = String(r.id).trim().replace(/\//g, '-'); // Sanitize ID

                            let categoryId = "500";
                            let categoryName = r.categoryName || "Ostatní";
                            const pageNum = r.pageNumber || globalCurrent;

                            const range = CATEGORY_RANGES.find(c => pageNum >= c.start && pageNum <= c.end);
                            if (range) {
                                categoryId = range.id;
                                // FORCE correct name from range, ignore AI guess if possible collision
                                categoryName = range.name;
                            }

                            const catRef = db.collection('normCategories').doc(categoryId);
                            batch.set(catRef, {
                                id: categoryId,
                                name: categoryName,
                                parentGroup: "Studená kuchyně",
                                source: "cold",
                                order: parseInt(categoryId),
                            }, { merge: true });

                            const recipeRef = db.collection('normRecipes').doc(recipeId);
                            batch.set(recipeRef, {
                                ...r,
                                id: recipeId,
                                categoryId,
                                categoryName,
                                parentGroup: "Studená kuchyně",
                                source: "cold",
                                isMinutka: false,
                                pageNumber: pageNum,
                                searchText: [r.title, recipeId, r.description, categoryName, (r.ingredients || []).map((i: any) => i.name).join(' ')].join(' ').toLowerCase(),
                                createdAt: Date.now(),
                                importedAt: Date.now()
                            }, { merge: true });
                            totalImported++;
                        }
                        await batch.commit();
                        console.log(`    Saved batch.`);
                    }

                    saveProgress(globalEnd);
                    success = true;
                    console.log("    Waiting 10s cooldown...");
                    await new Promise(r => setTimeout(r, 10000));

                } catch (err: any) {
                    console.error(`    Error processing:`, err.message);
                    if (err.message.includes('429') || err.message.includes('503') || err.message.includes('quota')) {
                        const delay = 30000 + (10 - retries) * 10000;
                        console.log(`    Quota exceeded. Waiting ${delay / 1000}s...`);
                        await new Promise(r => setTimeout(r, delay));
                        retries--;
                    } else {
                        console.error("    Fatal error. Skipping batch.");
                        success = true;
                        saveProgress(globalEnd);
                    }
                }
            }
        }
    }

    console.log(`Import finished. Total processed: ${totalImported}`);
}

async function main() {
    try {
        await extractRecipes();
    } catch (error) {
        console.error("Main error:", error);
    }
}

main();
