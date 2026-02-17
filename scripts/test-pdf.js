
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const PDF_PATH = path.join(process.cwd(), '../Receptury studených pokrmů.pdf');

async function test() {
    console.log(`Testing PDF read from: ${PDF_PATH}`);
    if (!fs.existsSync(PDF_PATH)) {
        console.error("File does not exist!");
        return;
    }

    try {
        const dataBuffer = fs.readFileSync(PDF_PATH);
        console.log(`File size: ${dataBuffer.length} bytes`);

        console.log("Parsing...");
        const data = await pdf(dataBuffer);
        console.log("Success!");
        console.log(`Pages: ${data.numpages}`);
        console.log(`Info:`, data.info);
        console.log(`Text length: ${data.text.length}`);
        const debugText = data.text.substring(0, 500);
        console.log("--------------------------------------------------");
        console.log(debugText);
        console.log("--------------------------------------------------");
        fs.writeFileSync('test_text.txt', debugText, 'utf8');
    } catch (e) {
        console.error("PDF Parse Error to log...");
        fs.writeFileSync('error.log', e.stack || e.toString());
    }
}

test();
