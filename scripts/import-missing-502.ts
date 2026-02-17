
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

// Initialize Firebase Admin (Robust Logic)
if (!admin.apps.length) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
        console.error('FIREBASE_PRIVATE_KEY is missing');
        process.exit(1);
    }

    // SANITIZATION FIX
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

// TARGET CATEGORY 502 (Pages 131-152)
// This overlaps with files: 121-140 and 141-160
const TARGET_FILES = [
    "Receptury studených pokrmů-121-140.pdf",
    "Receptury studených pokrmů-141-160.pdf"
];

async function uploadToGemini(path: string, mimeType: string) {
    const uploadResult = await fileManager.uploadFile(path, {
        mimeType,
        displayName: "Cold Kitchen Missing Part",
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

async function extractMissing() {
    const SPLIT_DIR = path.join(process.cwd(), '../receptury-studene-kuchyne');

    for (const filename of TARGET_FILES) {
        const filePath = path.join(SPLIT_DIR, filename);
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            continue;
        }

        // Parse range from filename
        const match = filename.match(/(\d+)-(\d+)\.pdf$/);
        const fileStart = match ? parseInt(match[1]) : 0;
        const fileEnd = match ? parseInt(match[2]) : 0;

        console.log(`\nProcessing TARGET file: ${filename} (Global ${fileStart}-${fileEnd})`);

        let fileUpload;
        try {
            fileUpload = await uploadToGemini(filePath, "application/pdf");
            await waitForActive(fileUpload);
        } catch (e) {
            console.error(`Failed to upload ${filename}:`, e);
            continue;
        }

        const BATCH_SIZE = 5;
        const totalLocalPages = fileEnd - fileStart + 1;

        for (let currentLocal = 1; currentLocal <= totalLocalPages; currentLocal += BATCH_SIZE) {
            const endLocal = Math.min(currentLocal + BATCH_SIZE - 1, totalLocalPages);
            const globalCurrent = fileStart + currentLocal - 1;
            const globalEnd = fileStart + endLocal - 1;

            // Simple check: Only process if range overlaps with our target 131-152
            // We want to be generous to catch edge cases
            if (globalEnd < 130 || globalCurrent > 155) {
                console.log(`  > Skipping batch ${globalCurrent}-${globalEnd} (Outside target range)`);
                continue;
            }

            console.log(`  > Processing batch: Global ${globalCurrent}-${globalEnd}...`);

            try {
                const prompt = `
                Jsi expert na extrakci dat.
                Hledáme POUZE receptury z kategorie "Zdobená vejce" (ID 502xx) nebo okolní chybějící recepty.
                
                ZADÁNÍ:
                Analyzuj strany ${currentLocal}-${endLocal} tohoto souboru.
                Hledej receptury, které vypadají jako Zdobená vejce, Vejce v majonéze, Plněná vejce atd.
                
                DATA RECEPTURY (JSON):
                {
                    "id": "5místné číslo",
                    "title": "název",
                    "description": "popis",
                    "procedure": "postup",
                    "ingredients": [ { "name": "surovina", "gross": číslo, "net": číslo } ],
                    "categoryName": "Zdobená vejce"
                }
                
                Odpověz POUZE JSON polem.
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
                        const recipeId = String(r.id).trim().replace(/\//g, '-');

                        // Enforce Category 502 if it looks like an egg recipe
                        let categoryId = "502";
                        let categoryName = "Zdobená vejce";

                        // Also saving category ensures it exists
                        const catRef = db.collection('normCategories').doc(categoryId);
                        batch.set(catRef, {
                            id: categoryId,
                            name: categoryName,
                            parentGroup: "Studená kuchyně",
                            source: "cold",
                            order: 502,
                        }, { merge: true });

                        const recipeRef = db.collection('normRecipes').doc(recipeId);
                        batch.set(recipeRef, {
                            ...r,
                            id: recipeId,
                            categoryId,
                            categoryName,
                            parentGroup: "Studená kuchyně",
                            source: "cold",
                            createdAt: Date.now(),
                            importedAt: Date.now()
                        }, { merge: true });
                    }
                    await batch.commit();
                    console.log(`    Saved batch.`);
                }

                await new Promise(r => setTimeout(r, 5000)); // 5s delay

            } catch (err: any) {
                console.error("Error batch:", err.message);
                await new Promise(r => setTimeout(r, 10000));
            }
        }
    }
}

extractMissing();
