import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/apiAuth';

// Helper to get sanitized API key
const getSanitizedKey = () => {
    return (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '').replace(/\s/g, '');
};

// INITIALIZATION: We will initialize inside the handler to ensure sanitized key is used
// but we can keep the constants for model name
const MODEL_NAME = "gemini-flash-latest";

interface RecipeEntry {
    id: string;
    title: string;
    content: string;
    searchableTitle: string;
    searchableContent: string;
}

let recipeIndex: RecipeEntry[] = [];

const deMangle = (text: string) => {
    // Join spaced out letters: S V Í Č K O V Á -> SVÍČKOVÁ
    let result = text.replace(/([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])\s(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/gi, '$1');
    // Join spaced out digits: 1 1 1 0 1 -> 11101
    result = result.replace(/(\d)\s(?=\d)/g, '$1');
    return result;
};

const superNormalize = (t: string) => {
    return t.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .toLowerCase();
};

const loadAndIndexNorms = () => {
    if (recipeIndex.length > 0) return recipeIndex;

    try {
        const hotPath = path.join(process.cwd(), 'data/norms.txt');
        const coldPath = path.join(process.cwd(), 'data/norms-cold.txt');
        let fullText = '';

        if (fs.existsSync(hotPath)) fullText += fs.readFileSync(hotPath, 'utf-8') + '\n\n';
        if (fs.existsSync(coldPath)) fullText += fs.readFileSync(coldPath, 'utf-8');

        const cleaned = deMangle(fullText);

        // Split by 5-digit ID (optionally followed by /A, /B etc)
        // We use \n\s* to ensure it's likely a start of a line/section
        const chunks = cleaned.split(/\n\s*(?=\d{5})/);

        recipeIndex = chunks.map(chunk => {
            const match = chunk.match(/^\s*(\d{5}[^\s]*)\s+([-—–]?)\s*([^\n]+)/);
            if (match) {
                const title = match[3].trim();
                return {
                    id: match[1],
                    title: title,
                    content: chunk.trim(),
                    searchableTitle: superNormalize(title),
                    searchableContent: superNormalize(chunk)
                };
            }
            return null;
        }).filter((r): r is RecipeEntry => r !== null);

        console.log(`Indexed ${recipeIndex.length} recipes for RAG search.`);
        return recipeIndex;
    } catch (error) {
        console.error('Error indexing norms:', error);
        return [];
    }
};

const searchRecipes = (query: string, limit = 15) => {
    const recipes = loadAndIndexNorms();
    if (!recipes.length) return [];

    // Simple keyword extraction from query
    const normalizedQuery = superNormalize(query);
    // Also try to get individual meaningful words
    const queryWords = query.toLowerCase()
        .replace(/[^\w\sáčďéěíňóřšťúůýž]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2)
        .map(t => superNormalize(t));

    const scored = recipes.map(recipe => {
        let score = 0;

        // Match full normalized query in title (e.g. "videnskaro")
        if (recipe.searchableTitle.includes(normalizedQuery)) score += 100;

        // Match individual words
        queryWords.forEach(word => {
            if (recipe.searchableTitle.includes(word)) score += 20;
            if (recipe.searchableContent.includes(word)) score += 2;
        });

        // Exact ID match
        if (query.includes(recipe.id)) score += 500;

        return { recipe, score };
    });

    const results = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.recipe);

    console.log(`Search for "${query}" found ${results.length} matches. Top result: ${results[0]?.title}`);
    return results;
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
- Vycházíš POUZE z poskytnutých textů normy. Tyto texty jsou ti předány v každé zprávě podle tvé potřeby.

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
   - POUŽÍVEJ PŘESNĚ TENTO FORMÁT ZÁVOREK A VELKÁ PÍSMENA PRO PARZOVÁNÍ.
`;

export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const key = getSanitizedKey();
    if (!key) {
        return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    }

    try {
        const { question, history, userName } = await req.json();

        if (!question || typeof question !== 'string') {
            return NextResponse.json({ error: 'Missing question' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(key);

        console.log('Chat API Request (RAG):', { question, userName });

        // RAG: Search for relevant recipes
        const relevantRecipes = searchRecipes(question);
        const contextText = relevantRecipes.length > 0
            ? relevantRecipes.map(r => `--- RECEPT ${r.id}: ${r.title} ---\n${r.content}`).join('\n\n')
            : "Žádné konkrétní normy pro tento dotaz nebyly nalezeny. Odpověz na základě svých obecných znalostí kuchaře z Grandu, ale upozorni, že to není přímo z této normy.";

        const personalizedSystemPrompt = `${SYSTEM_PROMPT}\nUživatel, se kterým mluvíš, se jmenuje: **${userName || 'kolega'}**. V hovoru ho příležitostně oslovuj jeho jménem.`;

        const prompt = `
        Zde jsou relevantní výňatky z norem pro tvou odpověď:
        ${contextText}

        Uživatel se ptá: "${question}"

        Odpověz jako poctivý kuchař Svatopluk Kuřátko. Pokud je recept v kontextu, použij ho. Pokud ne, omluv se, že tuhle normu zrovna nemáš u sebe.
        `;

        // Map history safely
        const chatHistory = (history || []).map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const personalizedModel = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: personalizedSystemPrompt
        });

        const chat = personalizedModel.startChat({
            history: chatHistory,
        });

        const result = await chat.sendMessage(prompt);
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

        const uniqueSourceIds = [...new Set(sourceIds)];

        return NextResponse.json({
            answer: answerText,
            sourceIds: uniqueSourceIds
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({
            error: 'Failed to generate response'
        }, { status: 500 });
    }
}
