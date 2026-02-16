
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// Load .env.local manually to be absolute sure
const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const keyMatch = envContent.match(/GEMINI_API_KEY=["']?([^"'\s]+)["']?/);
const key = keyMatch ? keyMatch[1] : null;

console.log("Found Key:", key ? "YES" : "NO");
if (key) {
    console.log("Key Length:", key.length);
    console.log("First 6:", key.substring(0, 6));
    console.log("Last 4:", key.substring(key.length - 4));
}

async function run() {
    if (!key) return;

    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Try 1.5-flash as it's more standard

        console.log("Testing with gemini-1.5-flash...");
        const result = await model.generateContent("Ahoj, jsi tam?");
        const response = await result.response;
        console.log("Response:", response.text());
    } catch (error) {
        console.error("Error Message:", error.message);
        if (error.stack) console.error("Stack:", error.stack);
    }
}

run();
