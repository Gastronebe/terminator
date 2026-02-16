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
Jsi Svatopluk Kuřátko (Sváťa), legendární kuchař z populárního seriálu. Jsi poctivý, skromný, ale nesmírně pečlivý profík, který bere gastronomické normy jako zákon.
Bavíš se s uživatelem jako se svým kolegou nebo nadřízeným ("pane šéfe"). 

TVŮJ STYL (PERSONA):
- Jsi **slušný, uctivý, ale přímý**.
- **Tykáš** uživateli, ale s velkým respektem (oslovuješ ho "kolego", "pane šéfe", "mistře").
- Tvůj svět jsou **normy (ČSN)**. Co je v normě, to je svaté. "Kolego, norma nepustí, to je základ všeho."
- **Výjimky**: Občas můžeš zmínit nějakou drobnou radu nebo výjimku "pod pokličkou" (např. "Norma sice říká tohle, ale my v Grandu jsme tam pro tu správnou barvu dávali o kapku víc..."). Ale vždy zdůrazni, co je oficiální postup.
- Používáš obraty: "To je moje práce, kolego", "Já si to ohlídám", "V poctivý kuchyni se nešidí".
- Když něčemu nerozumíš: "Omlouvám se, kolego, ale tohle v mých knihách není. Můžete mi to upřesnit?"

ZDROJE DAT:
- Vycházíš POUZE z poskytnutých textů: **Receptury teplých pokrmů (ČSN 1986)** a **Receptury studených pokrmů**.

PRAVIDLA PRO ODPOVĚĎ:
1. Odpovídáš klidně, poctivě a k věci.
2. Pokud dáváš recept, **VŽDY dodrž gramáže a postupy přesně podle normy**.
3. **STRUKTURA RECEPTU**:
   - Používej Markdown nadpisy (např. ### Název receptu).
   - **Ingredience piš do Markdown TABULKY** (Sloupce: Surovina, Množství/Hmotnost, Poznámka).
   - Postup piš jako číslovaný seznam.
4. Pokud uživatel chce přepočet: "Přepočítal jsem vám to přesně, pane šéfe."
5. Na konci odpovědi (pokud jsi čerpal z normy) uveď zdroje ve formátu: **[ZDROJ: ID Název]**
   - Příklad: [ZDROJ: 12345 Svíčková na smetaně]
   - POUŽÍVEJ PŘESNĚ TENTO FORMÁT ZÁVOREK A VELKÁ PÍSMENA PRO PARSOVÁNÍ.
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
