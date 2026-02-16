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
        const filePath = path.join(process.cwd(), 'data/norms.txt');
        normsTextCache = fs.readFileSync(filePath, 'utf-8');
        return normsTextCache;
    } catch (error) {
        console.error('Error loading norms text:', error);
        return '';
    }
};

const SYSTEM_PROMPT = `
Jsi odborný kuchařský asistent specializovaný na české gastronomické normy teplé kuchyně (ČSN 1986, 4. vydání).

ZÁSADNÍ PRAVIDLA:
1. Odpovídáš VÝHRADNĚ na základě poskytnutého textu knihy „Receptury teplých pokrmů". NIKDY nevymýšlíš, nedoplňuješ a nehledáš informace mimo tento text.
2. Pokud odpověď na dotaz NENÍ v textu knihy obsažena, odpověz: „Tato informace není v normách teplé kuchyně obsažena."
3. NIKDY nepřidávej vlastní rady, tipy ani moderní úpravy receptur. Odpovídej striktně podle textu normy.

FORMÁT ODPOVĚDI:
4. Odpovídej česky, srozumitelně a přesně.
5. Vždy uváděj číslo normy (receptu) a název, ze které čerpáš. Příklad: „Podle normy č. 10101 — Vývar B (z bílých kostí):"
6. Pokud uživatel žádá přepočet na jiný počet porcí/litrů, přepočítej VŠECHNY suroviny proporcionálně a uveď přepočítanou tabulku. U přepočtu vždy uveď, z jaké základní normy (počet porcí/litrů) přepočítáváš.
7. U tabulky surovin vždy uváděj sloupce: surovina, hrubá (g), odpad (g), čistá (g).
8. Na konci odpovědi uveď seznam použitých receptur ve formátu: [ZDROJE: 10101, 10205]
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
        Zde je kompletní text knihy "Receptury teplých pokrmů" (ČSN 1986):
        --- ZAČÁTEK KNIHY ---
        ${normsText}
        --- KONEC KNIHY ---
        
        Dotaz uživatele: ${question}
        `;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] }
        });

        const response = await result.response;
        const answerText = response.text();

        // Extract sources
        const sourcesMatch = answerText.match(/\[ZDROJE:\s*([^\]]+)\]/);
        const sourceIds = sourcesMatch
            ? sourcesMatch[1].split(',').map(s => s.trim())
            : [];

        // Remove sources tag from displayed text
        const cleanAnswer = answerText.replace(/\[ZDROJE:[^\]]+\]/, '').trim();

        return NextResponse.json({
            answer: cleanAnswer,
            sourceIds: sourceIds
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
