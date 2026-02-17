
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

function getKey() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/GEMINI_API_KEY=(.*)/);
    if (match) {
        let key = match[1].trim();
        if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
        return key;
    }
    return null;
}

async function run() {
    const key = getKey();
    if (!key) {
        console.error("No API Key found");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(key);
        // There isn't a direct listModels method on the SDK instance easily accessible in all versions,
        // but we can try a basic generation with fallback models to see what works.

        const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];

        console.log("Testing available models...");

        for (const m of models) {
            process.stdout.write(`Testing ${m}... `);
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Test.");
                await result.response;
                console.log("OK ✅");
            } catch (e) {
                if (e.message.includes('404')) console.log("NOT FOUND ❌");
                else if (e.message.includes('429')) console.log("RATE LIMITED ⚠️ (but exists)");
                else console.log(`ERROR: ${e.message}`);
            }
        }

    } catch (error) {
        console.error("Fatal Error:", error);
    }
}

run();
