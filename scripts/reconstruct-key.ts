
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

function cleanKey(raw: string) {
    // 1. Find start and end
    const startIdx = raw.indexOf('-----BEGIN PRIVATE KEY-----');
    const endIdx = raw.indexOf('-----END PRIVATE KEY-----');

    if (startIdx === -1 || endIdx === -1) {
        console.error("Missing headers");
        return null;
    }

    const body = raw.substring(startIdx + 27, endIdx) // 27 = len of header
        .replace(/\s/g, ''); // Remove ALL whitespace (newlines, spaces, \r)

    // Reformat to 64 chars per line
    let formattedBody = '';
    for (let i = 0; i < body.length; i += 64) {
        formattedBody += body.substring(i, i + 64) + '\n';
    }

    return `-----BEGIN PRIVATE KEY-----\n${formattedBody}-----END PRIVATE KEY-----\n`;
}

const envPath = path.resolve(process.cwd(), '.env.local');
const content = fs.readFileSync(envPath, 'utf-8');
const match = content.match(/FIREBASE_PRIVATE_KEY=(.*)/);
let rawKey = match ? match[1] : '';

// Unquote
if (rawKey.startsWith('"')) rawKey = rawKey.slice(1);
if (rawKey.endsWith('"')) rawKey = rawKey.slice(0, -1);

// Replace literals just in case
rawKey = rawKey.replace(/\\n/g, ''); // Remove literals completely, we will reformat body

const clean = cleanKey(rawKey);

if (clean) {
    console.log("Reconstructed Key Length:", clean.length);
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: clean
            })
        });
        console.log("SUCCESS! The key was repaired.");
    } catch (e) {
        console.error("FAILED with reconstructed key:", e.message);
    }
} else {
    console.log("Could not find key parts.");
}
