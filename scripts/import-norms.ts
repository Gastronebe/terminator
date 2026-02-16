
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
    // Check if private key is present
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
        console.error('FIREBASE_PRIVATE_KEY is missing in .env.local');
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

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const INPUT_FILE = path.join(process.cwd(), '../Receptury-teplých-pokrmů-ČSN-1986.txt');

interface NormCategory {
    id: string;
    name: string;
    parentGroup: string;
    source: 'hot';
    order: number;
    recipeCount: number;
}

// Regex for Categories: "101        Bílé p o l é v k y :"
const CATEGORY_REGEX = /^(\d{3})\s+(.+):$/;

// Regex for Main Groups (e.g. "POLÉVKY")
const GROUP_REGEX = /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ ]+$/;

async function parseAndImport() {
    console.log('Starting import...');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`Input file not found: ${INPUT_FILE}`);
        return;
    }

    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentGroup = '';
    let currentCategory: NormCategory | null = null;
    let recipeBuffer: string[] = [];
    let isCollectingRecipe = false;
    let batchCount = 0;

    // Batch writes
    let batch = db.batch();

    for await (const line of rl) {
        const trimmed = line.trim();

        // Detect Main Group (simplified heuristic: All caps, not a recipe, not a page number)
        if (GROUP_REGEX.test(trimmed) && !trimmed.match(/^\d/) && trimmed.length > 3 && !trimmed.includes('STRANA') && !trimmed.includes('SEZNAM') && !trimmed.includes('OBSAH')) {
            currentGroup = trimmed;
            console.log(`Found Group: ${currentGroup}`);
            continue;
        }

        // Detect Category
        const catMatch = trimmed.match(CATEGORY_REGEX);
        if (catMatch && !trimmed.includes('.....')) {
            const [_, id, name] = catMatch;
            currentCategory = {
                id,
                name: name.trim(),
                parentGroup: currentGroup,
                source: 'hot',
                order: parseInt(id),
                recipeCount: 0 // Will update later
            };

            // Save Category to Firestore immediately
            const catRef = db.collection('normCategories').doc(id);
            await catRef.set(currentCategory);
            console.log(`Found Category: ${id} - ${name}`);
            continue;
        }

        // Detect Recipe Start (5 digit number) e.g. "10101"
        if (trimmed.match(/^\d{5}.*$/)) {
            // If we were collecting a recipe, process it now
            if (isCollectingRecipe && recipeBuffer.length > 0) {
                await processRecipe(recipeBuffer.join('\n'), currentCategory?.id, currentGroup, currentCategory?.name);
                recipeBuffer = [];
            }
            isCollectingRecipe = true;
            recipeBuffer.push(line);
        } else if (isCollectingRecipe) {
            // Stop collecting if we hit a page break or end of section (heuristic)
            if (trimmed.includes('STRANA') || trimmed.match(/^\d{3}\s/)) {
                // Might be end of recipe - but usually we can just keep adding lines slightly longer to context
            }
            recipeBuffer.push(line);
        }

        if (batchCount >= 400) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    }

    // Process last recipe
    if (recipeBuffer.length > 0) {
        await processRecipe(recipeBuffer.join('\n'), currentCategory?.id, currentGroup, currentCategory?.name);
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    console.log('Import finished.');
}

async function processRecipe(rawText: string, categoryId?: string, parentGroup?: string, categoryName?: string) {
    // Basic extraction to get ID for logging
    const idMatch = rawText.match(/^(\d{5})/);
    const id = idMatch ? idMatch[1] : 'unknown';

    const docRef = db.collection('normRecipes').doc(id);
    const docSnap = await docRef.get();

    // 1. If recipe exists and is valid, only update metadata (category, etc.)
    if (docSnap.exists) {
        const data = docSnap.data();
        if (!data?.parsingError) {
            // Update metadata if changed (e.g. if we fixed category parsing)
            if (data?.categoryId !== categoryId || data?.parentGroup !== parentGroup) {
                await docRef.update({
                    categoryId: categoryId || 'unknown',
                    categoryName: categoryName || 'unknown',
                    parentGroup: parentGroup || 'unknown',
                    updatedAt: Date.now()
                });
                // console.log(`Updated metadata for ${id}`);
            }
            return;
        }
        console.log(`Retrying failed recipe ${id}...`);
    } else {
        console.log(`Processing new recipe ${id}...`);
    }

    if (!process.env.GEMINI_API_KEY) {
        console.warn('Skipping AI parsing (No API Key)');
        return;
    }

    const prompt = `
    Extrahuj z tohoto textu českou gastronomickou recepturu do JSON.
    Text pochází z OCR a může obsahovat chyby.
    
    INPUT TEXT:
    ${rawText}

    Pro recepturu vrať JSON:
    {
      "id": "číslo (5místné)",
      "title": "název",
      "description": "popis",
      "procedure": "postup (pouze text)",
      "ingredients": [
        { "name": "surovina", "gross": číslo|null, "waste": číslo|null, "net": číslo|null, "note": "poznámka"|null }
      ],
      "yield": "výtěžnost",
      "portionInfo": "info o porci"|null,
      "isMinutka": true/false,
      "totalGross": číslo|null,
      "totalNet": číslo|null,
      "losses": číslo|null,
      "finishedAmount": číslo|null,
      "references": ["čísla odkazovaných receptur"]
    }
    Odpověz POUZE JSON.
    `;

    try {
        // Sleep to avoid rate limits (simple backoff)
        await new Promise(r => setTimeout(r, 2000));

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }

        const data = JSON.parse(jsonStr);

        const fullData = {
            ...data,
            categoryId: categoryId || 'unknown',
            categoryName: categoryName || 'unknown',
            parentGroup: parentGroup || 'unknown',
            source: 'hot',
            rawText: rawText,
            searchText: [data.title, data.id, data.description, categoryName].join(' ').toLowerCase(),
            createdAt: Date.now(),
            parsingError: false // Clear error flag
        };

        await db.collection('normRecipes').doc(data.id).set(fullData);
        console.log(`Saved recipe ${data.id}`);

    } catch (e) {
        console.error(`Failed to parse recipe ${id}:`, e); // Log minimal error
        // Fallback: Save minimal data if not exists, or update error flag
        await db.collection('normRecipes').doc(id).set({
            id,
            rawText,
            parsingError: true,
            createdAt: Date.now(),
            categoryId: categoryId || 'unknown',
            categoryName: categoryName || 'unknown'
        }, { merge: true });
    }
}

parseAndImport().catch(console.error);
