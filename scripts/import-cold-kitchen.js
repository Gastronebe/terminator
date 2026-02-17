
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
const pdf = require('pdf-parse');

// Load environment variables
dotenv.config({ path: '.env.local' });

function getPrivateKeyManual() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) return undefined;
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(/FIREBASE_PRIVATE_KEY=(.*)/);
        if (match) {
            let key = match[1].trim();
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

    // Force manual read to bypass dotenv parsing issues
    // if (!privateKey || privateKey.length < 100) {
    // console.log("Forcing manual read...");
    privateKey = getPrivateKeyManual();
    // }

    if (!privateKey) {
        console.error('FIREBASE_PRIVATE_KEY is missing');
        process.exit(1);
    }

    // Normalize newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

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
        // Debug key format
        const key = privateKey.replace(/\\n/g, '\n');
        console.error("Firebase init error:", error);
        process.exit(1);
    }
}

const db = getFirestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
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

const PROGRESS_FILE = 'import-progress.json';

function loadProgress() {
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

function saveProgress(page) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastPage: page }));
}

async function extractRecipes() {
    console.log(`Reading PDF: ${PDF_PATH}...`);
    const dataBuffer = fs.readFileSync(PDF_PATH);

    const options = {
        pagerender: function (pageData) {
            const render_options = {
                normalizeWhitespace: false,
                disableCombineTextItems: false
            }

            return pageData.getTextContent(render_options)
                .then(function (textContent) {
                    let lastY, text = '';
                    for (let item of textContent.items) {
                        if (lastY == item.transform[5] || !lastY) {
                            text += item.str;
                        }
                        else {
                            text += '\n' + item.str;
                        }
                        lastY = item.transform[5];
                    }
                    return `---PAGE ${pageData.pageIndex + 1}---\n` + text + '\n';
                });
        }
    }

    console.log("Parsing PDF text...");
    const data = await pdf(dataBuffer, options);
    const fullText = data.text;

    const pages = fullText.split(/---PAGE \d+---\n/).slice(1);
    console.log(`Extracted ${pages.length} pages of text.`);

    const TOTAL_PAGES = pages.length;
    const BATCH_SIZE = 5;

    // Resume logic
    let startPageIdx = 0;
    const lastPage = loadProgress();
    if (lastPage > 0) {
        startPageIdx = lastPage;
        console.log(`Resuming from page ${startPageIdx + 1}...`);
    }

    let totalImported = 0;

    for (let i = startPageIdx; i < TOTAL_PAGES; i += BATCH_SIZE) {
        const endPageIdx = Math.min(i + BATCH_SIZE, TOTAL_PAGES);
        // Get text for pages i to endPageIdx-1
        const batchPages = pages.slice(i, endPageIdx);
        // Map back to page numbers for the model context
        const batchText = batchPages.map((txt, idx) => `--- STRANA ${i + idx + 1} ---\n${txt}`).join('\n');

        console.log(`\nProcessing pages ${i + 1}-${endPageIdx}...`);

        let retries = 5;
        let success = false;

        while (retries > 0 && !success) {
            try {
                const prompt = `
                Jsi expert na extrakci dat z textu.
                
                ZADÁNÍ:
                Analyzuj následující text z kuchařky (strany ${i + 1} až ${endPageIdx}).
                Hledej VŠECHNY receptury na studenou kuchyni.
                Ignoruj obsah, úvod, rejstřík.
                
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
                    "pageNumber": číslo_stránky,
                    "categoryName": "název kategorie/kapitola"
                }

                Odpověz POUZE validním JSON polem. Nepřidávej žádný markdown ani text okolo.
                Pokud nic nenajdeš, vrať [].

                TEXT K ANALÝZE:
                ${batchText}
                `;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();

                let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const firstBrace = jsonStr.indexOf('[');
                const lastBrace = jsonStr.lastIndexOf(']');

                let recipes = [];
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                    recipes = JSON.parse(jsonStr);
                }

                console.log(`Found ${recipes.length} recipes.`);

                if (recipes.length > 0) {
                    const batch = db.batch();

                    for (const r of recipes) {
                        if (!r.id || !r.title) continue;

                        const recipeId = String(r.id).trim();

                        // Determine category (fallback if AI failed)
                        let categoryId = "500";
                        let categoryName = r.categoryName || "Ostatní";

                        const pageNum = r.pageNumber || (i + 1);
                        const range = CATEGORY_RANGES.find(c => pageNum >= c.start && pageNum <= c.end);
                        if (range) {
                            categoryId = range.id;
                            if (!r.categoryName) categoryName = range.name;
                        }

                        // Category Save
                        const catRef = db.collection('normCategories').doc(categoryId);
                        batch.set(catRef, {
                            id: categoryId,
                            name: categoryName,
                            parentGroup: "Studená kuchyně",
                            source: "cold",
                            order: parseInt(categoryId),
                        }, { merge: true });

                        // Recipe Save
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
                            searchText: [r.title, recipeId, r.description, categoryName, (r.ingredients || []).map(i => i.name).join(' ')].join(' ').toLowerCase(),
                            createdAt: Date.now(),
                            importedAt: Date.now()
                        }, { merge: true });

                        totalImported++;
                    }
                    await batch.commit();
                    console.log(`Saved batch.`);
                }

                saveProgress(endPageIdx); // Save 1-based index
                success = true;

                // Small delay is still good practice
                await new Promise(r => setTimeout(r, 2000));

            } catch (err) {
                console.error(`Error processing batch:`, err.message);

                if (err.message.includes('429') || err.message.includes('503') || err.message.includes('quota')) {
                    const delay = 5000 + (6 - retries) * 5000;
                    console.log(`Quota exceeded. Waiting ${delay / 1000}s...`);
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                } else {
                    console.error("Fatal error for this batch. Skipping.");
                    success = true;
                    saveProgress(endPageIdx);
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
