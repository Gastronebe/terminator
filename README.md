# 🏠 Home App (Terminator 3000)

Komplexní aplikace pro správu domácnosti, financí, majetku a kulinářských norem.

## 🌟 Klíčové Funkce

### 📊 Dashboard & Statistiky
- **Přehledový Dashboard:** Okamžitý přehled o stavu domácnosti (semafory).
- **Statistiky:** Grafy a přehledy financí a majetku.
- **Widgety:** Nadcházející události, narozeniny, náhodné recepty.

### 🚗 Správa Majetku (Assets)
- **Auta:** Sledování STK, dálničních známek, pojištění, stavu tachometru a servisních záznamů.
- **Nemovitosti:** Evidence dokumentů, revizí a důležitých termínů.
- **Obecný majetek:** Evidence cenností a vybavení.
- **Dokumenty:** Ukládání a sledování platnosti osobních dokladů (občanky, pasy).

### 🍳 Normy & Receptury (Normy)
- **Teplá i Studená Kuchyně:** Kompletní databáze receptur dle ČSN norem.
- **AI Chef Svatopluk:** Chatbot (poháněný Gemini AI) pro kulinářské rady, vyhledávání v normách a generování tipů.
- **Hlasové Ovládání:** Podpora pro převod řeči na text a čtení receptů.
- **Kategorizace:** Detailní členění dle druhu masa a pokrmu (Polévky, Hovězí, Ryby, atd.).

### 📅 Kalendář & Události
- **Google Calendar Integrace:** Automatická synchronizace s rodinným kalendářem.
- **Narozeniny a Svátky:** Automatické zobrazení a upozornění na blížící se výročí.
- **Rodinné Události:** Plánování a přehled společných akcí.

### 💳 Slevové Karty
- **Sdílená Peněženka:** Digitální úložiště věrnostních karet pro celou rodinu.
- **Offline Podpora:** Karty jsou dostupné i bez připojení k internetu.

### 👥 Administrace
- **Správa Uživatelů:** Řízení přístupů a oprávnění.
- **Žádosti o Přístup:** Schvalování nových členů domácnosti.
- **Editace Dat:** Pokročilá správa všech entit v systému.

## 🛠️ Technologie

- **Frontend:** [Next.js 14](https://nextjs.org/) (App Router), React, Tailwind CSS
- **Backend / Databáze:** [Firebase](https://firebase.google.com/) (Firestore, Auth, Storage)
- **AI:** Google Gemini (Generative AI)
- **Integrace:** Google Calendar API, Google Cloud Platform
- **Design:** Vlastní Design System (Poppins/Montserrat typografie, moderní UI)

## 🚀 Instalace a Spuštění

1.  **Klonování repozitáře:**
    ```bash
    git clone https://github.com/Gastronebe/terminator.git
    cd terminator
    ```

2.  **Instalace závislostí:**
    ```bash
    npm install
    ```

3.  **Konfigurace prostředí:**
    Vytvořte soubor `.env.local` a vyplňte potřebné klíče (Firebase config, Gemini API Key, Google Service Account).

4.  **Spuštění vývojového serveru:**
    ```bash
    npm run dev
    ```
    Otevřete [http://localhost:3000](http://localhost:3000) v prohlížeči.

## 📂 Struktura Projektu

- `/app` - Hlavní zdrojový kód aplikace (stránky, API routes).
- `/components` - Znovupoužitelné UI komponenty.
- `/hooks` - Vlastní React hooky pro načítání dat.
- `/lib` - Pomocné knihovny (Firebase init, Google API klienti).
- `/scripts` - Pomocné skripty pro údržbu dat (importy, opravy).
- `/types` - TypeScript definice typů.
