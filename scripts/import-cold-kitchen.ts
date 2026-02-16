
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as dotenv from 'dotenv';

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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const PDF_PATH = path.join(process.cwd(), '../Receptury studených pokrmů.pdf');

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

async function uploadPdf() {
    try {
        console.log(`Uploading PDF: ${PDF_PATH}...`);
        if (!fs.existsSync(PDF_PATH)) {
            throw new Error(`File not found: ${PDF_PATH}`);
        }

        const uploadResult = await fileManager.uploadFile(PDF_PATH, {
            mimeType: "application/pdf",
            displayName: "Receptury studených pokrmů",
        });

        console.log(`Uploaded file: ${uploadResult.file.name} (${uploadResult.file.uri})`);

        // Wait for processing
        let file = await fileManager.getFile(uploadResult.file.name);
        while (file.state === "PROCESSING") {
            console.log("Processing PDF...");
            await new Promise(r => setTimeout(r, 5000));
            file = await fileManager.getFile(uploadResult.file.name);
        }

        if (file.state === "FAILED") {
            throw new Error("File processing failed.");
        }

        console.log(`File ready: ${file.uri}`);
        return file;

    } catch (error) {
        console.error("Upload error:", error);
        throw error;
    }
}

async function extractRecipes(file: any) {
    const TOTAL_PAGES = 516;
    const BATCH_SIZE = 10; // Smaller batch size

    let totalImported = 0;

    for (let startPage = 1; startPage <= TOTAL_PAGES; startPage += BATCH_SIZE) {
        const endPage = Math.min(startPage + BATCH_SIZE - 1, TOTAL_PAGES);
        console.log(`\nProcessing pages ${startPage}-${endPage}...`);

        let retries = 3;
        let success = false;

        while (retries > 0 && !success) {
            try {
                const prompt = `
                Analyzuj stránky ${startPage} až ${endPage} z tohoto PDF souboru "Receptury studených pokrmů".
                Hledej VŠECHNY receptury v tomto rozsahu. Pokud stránka neobsahuje recepturu, přeskoč ji.

                Pro každou nalezenou recepturu extrahuj data do JSON objektu:
                {
                    "id": "5místné číslo (řada 5xxxx)",
                    "title": "název receptury",
                    "description": "popis (senzorické vlastnosti)",
                    "procedure": "výrobní postup",
                    "ingredients": [
                        { "name": "surovina", "gross": číslo|null, "waste": číslo|null, "net": číslo|null, "note": "poznámka"|null }
                    ],
                    "yield": "výtěžnost (např. '10 kg')",
                    "portionInfo": "info o porci"|null,
                    "totalGross": číslo|null,
                    "totalNet": číslo|null,
                    "losses": číslo|null,
                    "finishedAmount": číslo|null,
                    "references": ["čísla odkazovaných receptur"],
                    "pageNumber": číslo_stránky_v_pdf,
                    "categoryName": "název kategorie/kapitoly (pokud je uveden)"
                }

                Odpověz POUZE validním JSON polem obsahujícím nalezené receptury. Žádný další text.
                Pokud v rozsahu nic není, vrať [].
                `;

                const result = await model.generateContent([
                    {
                        fileData: {
                            mimeType: file.mimeType,
                            fileUri: file.uri
                        }
                    },
                    { text: prompt }
                ]);

                const responseText = result.response.text();

                // Clean JSON
                let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const firstBrace = jsonStr.indexOf('[');
                const lastBrace = jsonStr.lastIndexOf(']');

                let recipes: any[] = [];
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                    try {
                        recipes = JSON.parse(jsonStr);
                    } catch (e) {
                        console.error(`JSON Parse Error:`, e);
                        // If JSON is malformed, we might just skip this batch or simplify prompt?
                        // Usually Gemini 2.0 Flash is good at JSON.
                        // We will count this as a failure/retry if it seems transient? 
                        // Actually parsing error might be due to content filter or bad output.
                        throw new Error("JSON Parse Error");
                    }
                } else {
                    console.log("No JSON found in response.");
                    // Might be empty list or refusal.
                    if (responseText.includes("[]")) recipes = [];
                }

                console.log(`Found ${recipes.length} recipes in pages ${startPage}-${endPage}.`);

                const batch = db.batch();
                let batchCount = 0;

                for (const r of recipes) {
                    if (!r.id || !r.title) continue;

                    let categoryId = "500";
                    let categoryName = r.categoryName || "Ostatní";

                    const pageNum = r.pageNumber || startPage;
                    const range = CATEGORY_RANGES.find(c => pageNum >= c.start && pageNum <= c.end);
                    if (range) {
                        categoryId = range.id;
                        if (!r.categoryName) categoryName = range.name;
                    }

                    const catRef = db.collection('normCategories').doc(categoryId);
                    batch.set(catRef, {
                        id: categoryId,
                        name: categoryName,
                        parentGroup: "Studená kuchyně",
                        source: "cold",
                        order: parseInt(categoryId),
                    }, { merge: true });

                    const recipeRef = db.collection('normRecipes').doc(r.id);
                    const recipeData = {
                        ...r,
                        categoryId,
                        categoryName,
                        parentGroup: "Studená kuchyně",
                        source: "cold",
                        isMinutka: false,
                        searchText: [r.title, r.id, r.description, categoryName, (r.ingredients || []).map((i: any) => i.name).join(' ')].join(' ').toLowerCase(),
                        createdAt: Date.now(),
                        importedAt: Date.now()
                    };

                    batch.set(recipeRef, recipeData);
                    batchCount++;
                    totalImported++;
                }

                if (batchCount > 0) {
                    await batch.commit();
                    console.log(`Saved batch of ${batchCount} recipes.`);
                }

                success = true;

            } catch (err: any) {
                console.error(`Error processing pages ${startPage}-${endPage}:`, err.message);

                // Retry if 429 or 503
                if (err.message.includes('429') || err.message.includes('503') || err.message.includes('quota')) {
                    const delay = 5000 + (3 - retries) * 5000; // 5s, 10s, 15s...
                    console.log(`Rate limit/Error. Retrying in ${delay / 1000}s...`);
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                } else {
                    // Fatal error for this batch
                    console.log("Fatal error or parse error, skipping batch.");
                    retries = 0;
                }
            }
        }
    }

    console.log(`Import finished. Total imported: ${totalImported}`);
}

async function main() {
    try {
        const file = await uploadPdf();
        await extractRecipes(file);
    } catch (error) {
        console.error("Main error:", error);
    }
}

main();
