import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Copied logic from app/api/norms/chat/route.ts
const superNormalize = (t: string) => {
    return t.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
};

const simpleCzechStem = (word: string) => {
    const w = superNormalize(word);
    if (w === 'chleb') return 'chleb';
    if (w === 'chleba') return 'chleb';
    if (w.endsWith('ho')) return w.slice(0, -2);
    if (w.endsWith('mu')) return w.slice(0, -2);
    if (w.endsWith('em')) return w.slice(0, -2);
    if (['a', 'e', 'i', 'o', 'u', 'y', 'á', 'é', 'í', 'ý', 'ů'].includes(w.slice(-1))) {
        return w.slice(0, -1);
    }
    return w;
};

const searchRecipes = (query: string, recipes: any[]) => {
    const normalizedQuery = superNormalize(query);
    const queryWords = query.toLowerCase()
        .replace(/[^\w\sáčďéěíňóřšťúůýž]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2)
        .map(t => superNormalize(t));

    console.log('Query Words:', queryWords);

    const scored = recipes.map(recipe => {
        let score = 0;
        const pureTitle = superNormalize(recipe.title);

        if (pureTitle === normalizedQuery) score += 500;

        const subjects = ['vyvar', 'gulas', 'polevka', 'omacka', 'maso', 'pecene', 'smazene'];
        subjects.forEach(subject => {
            if (normalizedQuery.includes(subject) && pureTitle.includes(subject)) {
                score += 100;
            }
        });

        if (pureTitle.includes(normalizedQuery)) {
            score += 200;
        }

        if (normalizedQuery.includes(pureTitle) && pureTitle.length > 3) {
            score += 150;
        }

        queryWords.forEach(word => {
            const stem = simpleCzechStem(word);
            if (pureTitle.includes(stem)) {
                score += 50;
                if (normalizedQuery.startsWith(stem)) score += 50;
            }
            if (recipe.searchableContent.includes(stem)) score += 5;
        });

        score += Math.max(0, 30 - recipe.title.length);
        if (query.includes(recipe.id)) score += 1000;

        return { title: recipe.title, score, id: recipe.id };
    });

    return scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
};

async function test() {
    const jsonPath = path.join(process.cwd(), 'data/norms-processed.json');
    const recipes = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    // Test multiple queries
    const queries = [
        "Jaká je receptura na Hovězí vývar?",
        "recept na gulas",
        "vyvar A"
    ];

    for (const query of queries) {
        console.log(`\n--- Results for: "${query}" ---`);
        const results = searchRecipes(query, recipes);
        results.forEach((r, i) => {
            console.log(`${i + 1}. [${r.score}] ${r.title} (${r.id})`);
        });
    }
}

test();
