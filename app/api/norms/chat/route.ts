import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/apiAuth';
import { adminDb } from '@/lib/firebaseAdmin';

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
let lastFirestoreFetch = 0;
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes cache for Firestore recipes

const deMangle = (text: string) => {
    // 1. Join spaced out digits: 1 1 1 0 1 -> 11101
    let result = text.replace(/(?:\d[\t ]+){2,}\d/g, (match) => match.replace(/[\t ]+/g, ''));

    // 2. Protect multi-space word boundaries
    result = result.replace(/[\t ]{2,}/g, ' ___ ');

    // 3. Join spaced letters: "H O V Ě Z Í" -> "HOVĚZÍ"
    // Only joins if there's a sequence of at least 3 letters separated by single spaces.
    result = result.replace(/(?:\p{L}[\t ]+){2,}\p{L}/gu, (match) => {
        return match.replace(/[\t ]+/g, '');
    });

    // 4. Restore boundaries
    result = result.replace(/ ___ /g, ' ');

    return result.trim();
};

const superNormalize = (t: string) => {
    return t.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
};

// Simple Czech stemmer - removes common case endings
// This is "naive" but works well for search (e.g. "polévku" -> "polevk")
const simpleCzechStem = (word: string) => {
    const w = superNormalize(word);

    // Exception for very short common words to avoid over-stemming
    if (w === 'chleb') return 'chleb';
    if (w === 'chleba') return 'chleb';

    // Possessive adjectives / Adjectives
    if (w.endsWith('ickami')) return w.slice(0, -6) + 'ick'; // chlebíčky -> chlebick
    if (w.endsWith('icky')) return w.slice(0, -4) + 'ick';
    if (w.endsWith('icku')) return w.slice(0, -4) + 'ick';
    if (w.endsWith('icek')) return w.slice(0, -4) + 'ick';

    if (w.endsWith('ou')) return w.slice(0, -2); // Dršťkovou -> Dršťkov
    if (w.endsWith('ami')) return w.slice(0, -3); // s knedlíčkami -> knedlíčk
    if (w.endsWith('ych')) return w.slice(0, -3); // sýrových -> sýrov

    // Standard singular/plural endings (simplified)
    if (w.length > 4) {
        if (w.endsWith('ho')) return w.slice(0, -2);
        if (w.endsWith('mu')) return w.slice(0, -2);
        if (w.endsWith('em')) return w.slice(0, -2);
        if (w.endsWith('es')) return w.slice(0, -2); // gulášes -> guláš
        // Single char endings
        if (['a', 'e', 'i', 'o', 'u', 'y', 'á', 'é', 'í', 'ý', 'ů'].includes(w.slice(-1))) {
            return w.slice(0, -1);
        }
    }
    return w;
};

const loadAndIndexNorms = async () => {
    const now = Date.now();
    const needsRefresh = recipeIndex.length === 0 || (now - lastFirestoreFetch > CACHE_TTL);

    if (!needsRefresh) return recipeIndex;

    try {
        console.log("Loading/Refreshing recipe index (Hybrid: JSON + Firestore)...");
        let allRecipes: RecipeEntry[] = [];

        // 1. LOAD FROM JSON (Static pre-processed norms)
        const jsonPath = path.join(process.cwd(), 'data/norms-processed.json');
        if (fs.existsSync(jsonPath)) {
            const data = fs.readFileSync(jsonPath, 'utf-8');
            const jsonRecipes = JSON.parse(data);
            allRecipes = [...jsonRecipes];
            console.log(`Loaded ${jsonRecipes.length} recipes from JSON.`);
        }

        // 2. LOAD FROM FIRESTORE (Dynamic norms / Cold kitchen)
        console.log("Fetching additional recipes from Firestore...");
        const snapshot = await adminDb.collection('normRecipes').get();
        const firestoreRecipes = snapshot.docs.map(doc => {
            const data = doc.data();
            const title = data.title || '';
            const description = data.description || '';
            const procedure = data.procedure || '';
            const yieldInfo = data.yield || '';
            const portionInfo = data.portionInfo || '';
            const categoryName = data.categoryName || '';
            const parentGroup = data.parentGroup || '';

            // Reconstruct content from fields if 'content' is missing
            let content = data.content || '';
            if (!content) {
                const ingredientsText = Array.isArray(data.ingredients)
                    ? data.ingredients.map((ing: any) =>
                        `- ${ing.name}: ${ing.gross ?? '?'}g / ${ing.net ?? '?'}g${ing.note ? ` (${ing.note})` : ''}`
                    ).join('\n')
                    : '';

                content = `${title}\n\nPOPIS:\n${description}\n\nPOSTUP:\n${procedure}\n\nSUROVINY:\n${ingredientsText}\n\nVÝTĚŽNOST: ${yieldInfo}\nPORCE: ${portionInfo}`;
            }

            return {
                id: doc.id,
                title: title,
                content: content,
                searchableTitle: superNormalize(`${title} ${categoryName} ${parentGroup}`),
                searchableContent: superNormalize(content)
            } as RecipeEntry;
        });

        // Merge and deduplicate by ID
        // Logic: Prefer the source with longer content (more detail)
        const mergedMap = new Map<string, RecipeEntry>();
        allRecipes.forEach(r => mergedMap.set(r.id, r));

        firestoreRecipes.forEach(f => {
            const existing = mergedMap.get(f.id);
            if (!existing || f.content.length > existing.content.length) {
                mergedMap.set(f.id, f);
            }
        });

        recipeIndex = Array.from(mergedMap.values());
        lastFirestoreFetch = now;

        console.log(`Hybrid index ready: ${recipeIndex.length} total unique recipes.`);
        return recipeIndex;
    } catch (error) {
        console.error('Error indexing norms:', error);
        // If it fails but we have old data, return it
        if (recipeIndex.length > 0) return recipeIndex;
        return [];
    }
};

const searchRecipes = async (query: string, limit = 20) => {
    const recipes = await loadAndIndexNorms();
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

        // Exact match (normalized)
        const pureTitle = superNormalize(recipe.title);
        if (pureTitle === normalizedQuery) score += 500;

        // Subject boosting (important culinary keywords)
        const subjects = ['vyvar', 'gulas', 'polevka', 'omacka', 'maso', 'pecene', 'smazene'];
        subjects.forEach(subject => {
            if (normalizedQuery.includes(subject) && pureTitle.includes(subject)) {
                score += 100;
            }
        });

        // Query in title
        if (pureTitle.includes(normalizedQuery)) {
            score += 200;
        }

        // Title in query (only if title is meaningful)
        if (normalizedQuery.includes(pureTitle) && pureTitle.length > 3) {
            score += 150;
        }

        // Match individual words using stemming
        queryWords.forEach(word => {
            const stem = simpleCzechStem(word);

            // Check title (higher weight)
            if (recipe.searchableTitle.includes(stem)) {
                score += 50;
                // Double boost if query starts with this title word
                if (normalizedQuery.startsWith(stem)) score += 50;
            }

            // Check content (lower weight)
            if (recipe.searchableContent.includes(stem)) score += 5;
        });

        // Length penalty/bonus (shorter title = more specific)
        score += Math.max(0, 30 - recipe.title.length);

        // Exact ID match
        if (query.includes(recipe.id)) score += 1000;

        return { recipe, score };
    });

    const results = scored
        .filter(s => s.score > 10) // Minimum threshold
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.recipe);

    console.log(`Search for "${query}" found ${results.length} matches. Top result: ${results[0]?.title} (score: ${scored.find(s => s.recipe.id === results[0]?.id)?.score})`);
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
2. **ROZLIŠUJ TYP DOTAZU**:
   - Pokud se uživatel ptá obecně nebo na radu, odpověz **konverzačně a stručně**. Neposílej celou tabulku surovin, pokud o ni není výslovně požádáno.
   - Pokud uživatel výslovně požádá o recept (např. "dej mi recept", "jak se to dělá", "pošli mi normu"), pak poskytni **úplnou strukturu receptu** (tabulka + postup).
3. Pokud dáváš recept, **VŽDY dodrž gramáže a postupy přesně podle normy**.
4. **STRUKTURA RECEPTU (jen na vyžádání)**:
   - Používej Markdown nadpisy (např. ### Název receptu).
   - **Ingredience piš do Markdown TABULKY** (Sloupce: Surovina, Množství/Hmotnost, Poznámka).
   - Postup piš jako číslovaný seznam.
5. Pokud uživatel chce přepočet: "Přepočítal jsem vám to přesně, pane šéfe."
6. Na konci odpovědi (pokud jsi čerpal z normy) uveď zdroje ve formátu: **[ZDROJ: ID Název]**
   - Příklad: [ZDROJ: 12345 Svíčková na smetaně]
   - POUŽÍVEJ PŘESNĚ TENTO FORMÁT ZÁVOREK A VELKÁ PÍSMENA PRO PARZOVÁNÍ.

7. **OSLOVUJ JMÉNEM.** Pokud znáš jméno uživatele, oslovuj ho v 5. pádě (vokativu). Pro naše stálé hosty platí tato pravidla:
   - Jana -> "Jano" (např. "Tak se na to podíváme, Jano...")
   - Luďa -> "Luďo" (např. "To je výborný nápad, Luďo...")
   - Pavla -> "Pavlo" (např. "Dobrá volba, Pavlo...")
   - Ostatní nebo neznámé jméno -> "pane šéfe" nebo "kolego".
8. **NEVYMÝŠLEJ SI.** Pokud v kontextu (výňatky z norem) daný recept není, řekni na rovinu: "Omlouvám se, kolego, ale k tomuto jídlu nemám normu." Nesnaž se vařit z hlavy, i když recept znáš odjinud. Tady jedeme podle papírů.

9. **NÁVRH NÁZVU KONVERZACE.** Na úplný konec své odpovědi, za případné zdroje, VŽDY přidej jeden řádek s krátkým a výstižným názvem celé probíhající konverzace (max 5 slov) ve formátu: **[TITLE: Tvůj návrh názvu]**.
   - Pokud se bavíte o receptu, použij název receptu (např. [TITLE: Hovězí guláš]).
   - Pokud se jen vítáte nebo řešíte drobnosti, vymysli poctivý kuchařský název (např. [TITLE: Kuchyňské uvítání], [TITLE: Debata o koření]).
   - Tento tag bude uživateli skryt, slouží pro technické účely.
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
        const relevantRecipes = await searchRecipes(question);
        const contextText = relevantRecipes.length > 0
            ? relevantRecipes.map(r => `--- RECEPT ${r.id}: ${r.title} ---\n${r.content}`).join('\n\n')
            : "";

        const personalizedSystemPrompt = `${SYSTEM_PROMPT}\nUživatel, se kterým mluvíš, se jmenuje: **${userName || 'kolega'}**. V hovoru ho příležitostně oslovuj jeho jménem.`;

        const prompt = `
        Zde jsou relevantní výňatky z norem pro tvou odpověď:
        ${contextText}

        Uživatel se ptá: "${question}"

        Odpověz jako poctivý kuchař Svatopluk Kuřátko.

        VAROVÁNÍ: Odpovídej POUZE na základě výše uvedených výňatků z norem.
        Pokud v nich odpověď nenajdeš, řekni, že normu nemáš. Nevymýšlej si vlastní recepty.
        
        VAROVÁNÍ: Odpovídej POUZE na základě výše uvedených výňatků z norem.
        Pokud v nich odpověď nenajdeš, řekni, že normu nemáš. Nevymýšlej si vlastní recepty.
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
        const answerTextRaw = response.text();
        let answerText = answerTextRaw;

        // 1. Extract suggested title from [TITLE: ...] tag
        const titleRegex = /\[TITLE:\s*([^\]]*)\]/i;
        const titleMatch = answerText.match(titleRegex);
        let aiSuggestedTitle = "";
        if (titleMatch) {
            aiSuggestedTitle = titleMatch[1].trim();
            // Remove the title tag from the content shown to user
            answerText = answerText.replace(titleRegex, "").trim();
        }

        // 2. Extract sources: Look for [ZDROJ: ID Name]
        const sourceRegex = /\[ZDROJ:\s*(\d+)[^\]]*\]/gi;
        const sourceIds: string[] = [];
        let match;

        while ((match = sourceRegex.exec(answerText)) !== null) {
            if (match[1]) {
                sourceIds.push(match[1]);
            }
        }

        const uniqueSourceIds = [...new Set(sourceIds)];
        const sourcesWithTitles = uniqueSourceIds.map(id => {
            const recipe = recipeIndex.find(r => r.id === id);
            return { id, title: recipe?.title || `Norma ${id}` };
        });

        // Determine a good chat title
        let chatTitle = "";
        let isRecipe = false;

        if (aiSuggestedTitle) {
            chatTitle = aiSuggestedTitle;
            // Best guess if it's a recipe: if we have sources
            isRecipe = sourcesWithTitles.length > 0;
        } else if (sourcesWithTitles.length > 0) {
            chatTitle = sourcesWithTitles[0].title;
            isRecipe = true;
        } else {
            // General query title generator
            const q = question.trim();
            chatTitle = q.length > 35 ? q.substring(0, 32) + "..." : q;
        }

        return NextResponse.json({
            answer: answerText,
            sourceIds: uniqueSourceIds,
            sources: sourcesWithTitles,
            suggestedTitle: chatTitle,
            isRecipe
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({
            error: 'Failed to generate response'
        }, { status: 500 });
    }
}
