import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Initializing Gemini outside handler to reuse connection
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Load norms text once (cache in memory)
let normsTextCache = '';

const loadNormsText = () => {
    if (normsTextCache) return normsTextCache;
    try {
        const hotPath = path.join(process.cwd(), 'data/norms.txt');
        const coldPath = path.join(process.cwd(), 'data/norms-cold.txt');

        let text = '';
        if (fs.existsSync(hotPath)) text += fs.readFileSync(hotPath, 'utf-8') + '\n\n';
        if (fs.existsSync(coldPath)) text += fs.readFileSync(coldPath, 'utf-8');

        normsTextCache = text;
        return normsTextCache;
    } catch (error) {
        console.error('Error loading norms text:', error);
        return '';
    }
};

const SYSTEM_PROMPT = `
Jsi zkušený, trochu drzý šéfkuchař z devadesátek, který vařil v době, kdy norma byla zákon.
Bavíš se s UŽIVATELEM jako se SOBĚ ROVNÝM KOLEGOU v kuchyni. Žádné poučování "mladých", ale rýpavá debata dvou profíků.

TVŮJ STYL (PERSONA):
- Jsi **ironický, přímý, chlapácký**.
- **Tykáš** uživateli (oslovuješ ho "kolego", "šéfe", "mistře", "kamaráde"). NIKDY neříkej "mladej".
- Používáš hlášky z branže: "tohle jsme vařili pro papaláše", "jestli tam dáš něco jinýho, tak mi nechoď na oči", "poctivá práce, žádný prášky".
- Když něčemu nerozumíš: "Kolego, co to zkoušíš?", "To jsi vyčetl v Bravíčku?", "Jasně a stručně, nemám čas."
- Máš **absolutní respekt k normám (ČSN)**.

ZDROJE DAT:
- Vycházíš POUZE z poskytnutých textů: **Receptury teplých pokrmů (ČSN 1986)** a **Receptury studených pokrmů**.
- Pokud to v normách není: "Hele, tohle v normách není. To si musíme poradit sami, nebo se na to vykašlat."

PRAVIDLA PRO ODPOVĚĎ:
1. Odpovídej jako kuchař kuchaři. Stručně, jasně, k věci.
2. Pokud dáváš recept, **VŽDY dodrž gramáže a postupy přesně podle normy**. "Tady to máš černý na bílým."
3. Pokud uživatel chce přepočet: "Přepočítal jsem ti to, aby ses s tím nemusel trápit."
4. Formát receptu zachovej přehledný.
5. Na konci odpovědi (pokud jsi čerpal z normy) uveď zdroje ve formátu: **[ZDROJ: ID Název]**
   - Příklad: [ZDROJ: 12345 Svíčková na smetaně]
   - Pokud je jich víc, dej je pod sebe nebo za sebou.
   - POUŽÍVEJ PŘESNĚ TENTO FORMÁT ZÁVOREK A VELKÁ PÍSMENA, ABY TO SYSTÉM ROZPOZNAL A UDĚLAL ODKAZ.
`;

export async function POST(req: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    }

    try {
        const { question } = await req.json();

        if (!question || typeof question !== 'string') {
            return NextResponse.json({ error: 'Invalid question' }, { status: 400 });
        }

        const normsText = loadNormsText();
        if (!normsText) {
            return NextResponse.json({ error: 'Norms data not available' }, { status: 500 });
        }

        const prompt = `
        Zde jsou kompletní texty norem (Teplá a Studená kuchyně):
        --- ZAČÁTEK DAT ---
        ${normsText}
        --- KONEC DAT ---
        
        Uživatel se ptá: "${question}"
        
        Odpověz jako ten drzý devadesátkový kuchař.
        `;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] }
        });

        const response = await result.response;
        const answerText = response.text();

        // Extract sources: Look for [ZDROJ: ID Name]
        const sourceRegex = /\[ZDROJ:\s*(\d+)[^\]]*\]/gi;
        const sourceIds: string[] = [];
        let match;

        while ((match = sourceRegex.exec(answerText)) !== null) {
            if (match[1]) {
                sourceIds.push(match[1]);
            }
        }

        // Unique IDs only
        const uniqueSourceIds = [...new Set(sourceIds)];

        return NextResponse.json({
            answer: answerText,
            sourceIds: uniqueSourceIds
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
