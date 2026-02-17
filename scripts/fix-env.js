
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Manual parsing to handle multiline keys better than dotenv sometimes does
function loadEnvManual() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return {};

    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    const env: Record<string, string> = {};

    let currentKey = '';
    let currentValue = '';
    let isMultiLine = false;

    for (let line of lines) {
        // Simple parsing - not full spec compliant but good enough for this debug
        if (isMultiLine) {
            if (line.trim().endsWith('"') || line.trim().endsWith("'")) {
                currentValue += '\n' + line.trim().slice(0, -1);
                env[currentKey] = currentValue;
                isMultiLine = false;
            } else {
                currentValue += '\n' + line;
            }
            continue;
        }

        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();

            if (value.startsWith('"') && !value.endsWith('"')) {
                isMultiLine = true;
                currentKey = key;
                currentValue = value.slice(1);
            } else {
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                env[key] = value;
            }
        }
    }
    return env;
}


// Try standard dotenv first
dotenv.config({ path: '.env.local' });

// Overwrite with manual if needed
const manualEnv = loadEnvManual();
if (manualEnv.FIREBASE_PRIVATE_KEY) {
    // console.log("Loaded manual key length:", manualEnv.FIREBASE_PRIVATE_KEY.length);
}

function getFirebaseAdmin() {
    // Try standard process.env
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // If short or looks wrong, try manual
    if (!privateKey || privateKey.length < 100) {
        console.log("Standard dotenv failed, trying manual parse...");
        privateKey = manualEnv.FIREBASE_PRIVATE_KEY;
    }

    if (!privateKey) throw new Error('FIREBASE_PRIVATE_KEY is missing');

    // Handle newlines: 
    // If it has \n literals, replace them. 
    // If it has actual newlines, leave them.
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Ensure headers
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        console.warn("Key missing header, attempting fix...");
        if (privateKey.includes('MII')) {
            // Maybe headers were stripped?
            // Reconstruct? Too risky.
        }
    }

    try {
        if (admin.apps.length > 0) return admin.apps[0]!;

        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID || manualEnv.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL || manualEnv.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey
            })
        });
    } catch (e) {
        console.error("Initialization failed:", e.message);
        throw e;
    }
}

async function test() {
    try {
        const app = getFirebaseAdmin();
        const db = app.firestore();
        console.log("Firebase initialized successfully!");
        const col = await db.collection('normRecipes').limit(1).get();
        console.log(`Connection test: Found ${col.size} docs.`);
    } catch (e) {
        console.error("Test failed.");
    }
}

test();
