
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Reading:', envPath);

if (!fs.existsSync(envPath)) {
    console.error('File not found');
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf-8');
console.log('File size:', content.length);

// Extract key manually
const match = content.match(/FIREBASE_PRIVATE_KEY=(.*)/s); // dot matches newline with s flag? No, JS . is not newline by default
// Try split
const lines = content.split('\n');
let keyStart = -1;
let keyEnd = -1;

let fullKey = "";

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
        fullKey = line.substring('FIREBASE_PRIVATE_KEY='.length);
        // Check if it's quoted
        if (fullKey.startsWith('"')) {
            fullKey = fullKey.substring(1);
            // Look for end quote in subsequent lines
            if (!fullKey.endsWith('"')) {
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    fullKey += '\n' + nextLine; // Add actual newline
                    if (nextLine.trim().endsWith('"')) {
                        fullKey = fullKey.trim().slice(0, -1); // Remove end quote
                        break;
                    }
                }
            } else {
                fullKey = fullKey.slice(0, -1);
            }
        }
    }
}

if (!fullKey) {
    console.log("Key not found via manual parse");
} else {
    console.log("Found key via manual parse!");
    console.log("Length:", fullKey.length);
    console.log("First 20:", fullKey.substring(0, 20));
    console.log("Last 20:", fullKey.substring(fullKey.length - 20));
    console.log("Contains literals \\n:", fullKey.includes("\\n"));
}
