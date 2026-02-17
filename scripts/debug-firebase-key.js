
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: '.env.local' });

const key = process.env.FIREBASE_PRIVATE_KEY;

if (!key) {
    console.log("FIREBASE_PRIVATE_KEY is missing!");
} else {
    console.log("Key Length:", key.length);
    console.log("Starts with '-----BEGIN':", key.startsWith("-----BEGIN"));
    console.log("Ends with 'KEY-----':", key.endsWith("KEY-----"));
    console.log("Contains \\n literals:", key.includes("\\n"));
    console.log("Contains actual newlines:", key.includes("\n"));

    // Check if it looks like it was cut off
    console.log("First 20 chars:", key.substring(0, 20));
    console.log("Last 20 chars:", key.substring(key.length - 20));
}
