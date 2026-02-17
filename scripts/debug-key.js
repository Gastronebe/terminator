
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading .env.local from:', envPath);
if (fs.existsSync(envPath)) {
    console.log('File exists.');
} else {
    console.log('File DOES NOT exist.');
}

dotenv.config({ path: '.env.local' });

console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY.length);
    console.log('GEMINI_API_KEY starts with:', process.env.GEMINI_API_KEY.substring(0, 4));
}
