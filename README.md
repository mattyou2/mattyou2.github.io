# MijnWinkel — Installatie & GitHub Hosting

Een volledige webshop met beheerportaal, gebouwd met pure HTML/CSS/JS en Supabase als backend.

---

## 📁 Bestandsstructuur

```
webshop/
├── index.html              ← Winkel homepage
├── css/
│   ├── style.css           ← Winkel stijlen
│   └── admin.css           ← Beheerder stijlen
├── js/
│   ├── supabase-config.js  ← ⚠️ Vul hier jouw sleutels in
│   └── shop.js             ← Winkel logica
├── admin/
│   ├── index.html          ← Dashboard
│   ├── products.html       ← Producten beheren
│   ├── orders.html         ← Bestellingen bekijken
│   ├── settings.html       ← Instellingen / wachtwoord
│   ├── login.html          ← Inlogpagina beheerder
│   └── js/
│       └── admin.js        ← Gedeelde admin functies
└── supabase-setup.sql      ← Database instellen
```

---

## 🚀 Stap 1 — Supabase instellen

### 1.1 Maak een project aan
1. Ga naar [supabase.com](https://supabase.com) en maak een gratis account
2. Maak een **New Project** aan
3. Kies een regio dicht bij je doelgroep (bijv. Frankfurt voor NL)

### 1.2 Database tabellen aanmaken
1. Ga naar **SQL Editor** in het Supabase dashboard
2. Klik **New query**
3. Plak de inhoud van `supabase-setup.sql`
4. Klik **Run** (▶)

### 1.3 Beheerder account aanmaken
1. Ga naar **Authentication** → **Users**
2. Klik **Add user** → **Create new user**
3. Vul je **e-mail** en **wachtwoord** in
4. Dit zijn de inloggegevens voor `/admin/login.html`

### 1.4 API sleutels kopiëren
1. Ga naar **Settings** → **API**
2. Kopieer de **Project URL** en de **anon/public** sleutel
3. Open `js/supabase-config.js` en vul in:

```javascript
const SUPABASE_URL = 'https://jouwprojectid.supabase.co';
const SUPABASE_ANON_KEY = 'jouw-anon-sleutel-hier';
```

> ✅ **Veilig:** De `anon` sleutel mag publiek zijn.  
> De Row Level Security (RLS) in de database bepaalt wat iedereen mag zien/doen.  
> De `service_role` sleutel gebruik je **nooit** in de frontend.

---

## 🌐 Stap 2 — Hosten op GitHub Pages

### 2.1 Repository aanmaken
1. Ga naar [github.com](https://github.com) en log in
2. Klik **New repository**
3. Geef het een naam, bijv. `mijnwinkel`
4. Zet het op **Public** (vereist voor gratis GitHub Pages)
5. Klik **Create repository**

### 2.2 Bestanden uploaden
**Optie A — Via de website (makkelijkst):**
1. Open je nieuwe repository
2. Klik **uploading an existing file**
3. Sleep alle bestanden (inclusief mappen) naar het uploadvenster
4. Klik **Commit changes**

**Optie B — Via Git (terminal):**
```bash
cd webshop
git init
git add .
git commit -m "Eerste versie webshop"
git branch -M main
git remote add origin https://github.com/JOUWGEBRUIKERSNAAM/mijnwinkel.git
git push -u origin main
```

### 2.3 GitHub Pages inschakelen
1. Ga naar je repository → **Settings** → **Pages**
2. Onder **Source**: kies `main` branch en `/ (root)` map
3. Klik **Save**
4. Na ~2 minuten is je winkel live op:  
   `https://JOUWGEBRUIKERSNAAM.github.io/mijnwinkel/`

---

## 🔐 Beveiliging — Hoe werkt het?

| Wie? | Kan producten lezen? | Kan bewerken? | Kan bestellingen zien? |
|------|---------------------|---------------|----------------------|
| Bezoeker | ✅ Alleen actieve | ❌ | ❌ |
| Beheerder (ingelogd) | ✅ Alles | ✅ | ✅ |

De beveiliging zit in **Supabase Row Level Security (RLS)** — niet in de frontend code. Zelfs als iemand de API sleutel zou kopiëren, kunnen ze niets bewerken zonder ingelogd te zijn als beheerder.

---

## ⚙️ Aanpassen

### Winkelnaam wijzigen
Zoek & vervang `MijnWinkel` in `index.html` en de admin pagina's.

### Kleuren aanpassen
Wijzig de CSS variabelen bovenaan `css/style.css`:
```css
:root {
  --accent: #c8a96e;   /* Goud/amber kleur */
  --ink: #1a1a2e;      /* Donkerblauw/zwart */
}
```

### Valuta wijzigen
Zoek `currency: 'EUR'` in `js/shop.js` en `admin/js/admin.js` en wijzig naar bijv. `'USD'`.

---

## 📞 Beheerportaal

Ga naar `/admin/login.html` om in te loggen.

- **Dashboard** — statistieken en overzicht
- **Producten** — toevoegen, bewerken, verwijderen, in/uitschakelen
- **Bestellingen** — bekijken en statusbeheer
- **Instellingen** — winkelinfo en wachtwoord wijzigen

---

Veel succes met je webshop! 🎉
