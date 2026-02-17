
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
console.log(`Analyzing: ${envPath}`);

if (!fs.existsSync(envPath)) {
    console.log("File not found!");
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf-8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);

let foundCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('GEMINI_API_KEY')) {
        foundCount++;
        const parts = line.split('=');
        const keyPart = parts.length > 1 ? parts.slice(1).join('=') : ''; // Handle cases with multiple = if any

        let cleanKey = keyPart.trim();
        if (cleanKey.startsWith('"')) cleanKey = cleanKey.slice(1);
        if (cleanKey.endsWith('"')) cleanKey = cleanKey.slice(0, -1);

        console.log(`[Line ${i + 1}] Found key!`);
        console.log(`   Raw: ${line.substring(0, 25)}...`);
        console.log(`   Prefix: ${cleanKey.substring(0, 5)}`);
        console.log(`   Length: ${cleanKey.length}`);
    }
}

if (foundCount === 0) {
    console.log("No GEMINI_API_KEY found in file.");
} else if (foundCount > 1) {
    console.log("WARNING: Multiple keys found! The last one usually wins.");
}
