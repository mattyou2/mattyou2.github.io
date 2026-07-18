# Browseport

Een decentraal domeinsysteem naast het gewone DNS, gebouwd op Supabase.
Gebruikers registreren een custom domeinnaam, laten die doorverwijzen naar
een URL óf hosten er zelf bestanden op, en navigeren ernaartoe via de
website zelf, of — na installatie als PWA — direct vanuit de browser-
adresbalk met het keyword `browseport`.

## Belangrijk: als de site er "kapot" uitziet na een update

Dit was de daadwerkelijke oorzaak toen knoppen leken te verdwijnen en
styling kapot leek na de vorige update: de **service worker** (`sw.js`)
cachete de app-shell (`index.html`, `app.js`, `style.css`, …)
cache-eerst. Zodra die bestanden op de server veranderden, bleef je
browser toch de oude, gecachete versie tonen — nieuwe HTML gecombineerd
met oude CSS ziet er inderdaad kapot uit (ongestylede tekst die woord
voor woord onder elkaar valt, verdwenen knoppen, een "kapotte"
installeerknop). Dat is nu opgelost:

1. `sw.js` gebruikt nu **netwerk-eerst** in plaats van cache-eerst voor
   de app-shell — je krijgt altijd de nieuwste versie zolang je online
   bent, en pas offline valt hij terug op de laatste gecachete kopie.
2. De cache-naam is gebumpt (`browseport-shell-v2`) zodat de oude cache
   sowieso wordt opgeruimd.
3. `style.css` en `app.js` worden nu aangeroepen met `?v=2`, wat de
   service worker sowieso negeert (query-string-requests worden altijd
   direct van het netwerk gehaald) — een extra garantie tegen dit type
   bug.
4. De topbar heeft nu **altijd** een statische Inloggen/Account
   maken-fallback in de kale HTML staan (niet alleen via JavaScript),
   zodat de knoppen nooit meer kunnen "verdwijnen" door een trage of
   mislukte scriptload.

**Tip voor jezelf tijdens testen:** als je ooit weer rare, oude content
ziet na een update, open DevTools → Application → Service Workers →
"Unregister", of hard-refresh met Ctrl/Cmd+Shift+R.

## Wat er al staat (Supabase-project "Domainport")

Project-ref: `puljajfgjyzipgdrvioy` · regio eu-west-1

Tabellen (met Row Level Security aan):

- **`profiles`** — spiegel van `auth.users`, wordt automatisch gevuld bij
  registratie (trigger `on_auth_user_created`). Publiek leesbaar (nodig om
  eigenaar-e-mails te tonen aan admins), alleen de eigenaar mag zijn eigen
  rij bewerken.
- **`domains`** — `id`, `domain_name` (uniek, gevalideerd formaat),
  `target_url`, `owner_id`, `is_hosted`, `description`, `created_at`,
  `updated_at`. Iedereen mag lezen (opzoeken moet zonder account werken).
  Alleen ingelogde gebruikers mogen eigen domeinen toevoegen; alleen de
  eigenaar **of een admin** mag bewerken/verwijderen.
- **`site_files`** — `id`, `domain_id`, `file_path` (bijv. `index.html`,
  `css/style.css`, `assets/logo.svg`), `content`, `mime_type`,
  `updated_at`. Uniek per `(domain_id, file_path)`. Publiek leesbaar (de
  resolver moet ze zonder login kunnen ophalen), alleen eigenaar/admin mag
  schrijven.
- **`is_admin()`** — SQL-functie (`security definer`) die controleert of
  het e-mailadres van de ingelogde gebruiker gelijk is aan
  `treurmattheo@gmail.com` of `mattyougaming@gmail.com`. Wordt gebruikt in
  de RLS-policies van `domains` en `site_files`, en is ook aanroepbaar
  vanuit de front-end (`supabase.rpc('is_admin')`) om de adminweergave te
  tonen.

**Wil je een derde admin-account toevoegen?** Pas de e-maillijst aan in de
database:

```sql
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and lower(email) in ('treurmattheo@gmail.com', 'mattyougaming@gmail.com', 'nieuw@voorbeeld.com')
  );
$$;
```

De credentials (project-URL + anon key) staan al hardcoded in
`assets/app.js` — dat is normaal en veilig voor de Supabase *anon key*,
want alle toegangscontrole gebeurt via RLS-policies in de database, niet
via geheime sleutels in de front-end.

## Deployen — jouw situatie (mattyou2.github.io/browser/)

Deze versie is aangepast aan hoe jij de bestanden hebt neergezet: **alles
plat in dezelfde map** (geen aparte `assets/`-submap), gepubliceerd op
`https://mattyou2.github.io/browser/`. Alle interne links (stylesheet,
script-import, manifest, service worker, navigatie tussen pagina's)
gebruiken nu **relatieve paden zonder `/` vooraan** — die werken vanzelf
op elk pad waar je de map ook plaatst, mocht je later verhuizen.

Alleen `opensearch.xml` bevat noodgedwongen **absolute** URLs (dat vereist
de OpenSearch-standaard) — die staan al goed ingevuld op
`https://mattyou2.github.io/browser/...`. Verhuis je de site naar een
ander pad of domein, pas dan alleen dat ene bestand aan.

## Bestanden in deze map (plat, geen submappen)

| Bestand | Doel |
|---|---|
| `index.html` | Landingspagina / zoekmachine, met de adresbalk-demo en installatieknop |
| `dashboard.html` | Inloggen, registreren, domeinen + bestanden beheren (ook admin-weergave) |
| `go.html` | De resolver: leest `?domain=`, zoekt op, redirect of rendert de gehoste site |
| `opensearch.xml` | Maakt de site herkenbaar als adresbalk-zoekmachine |
| `manifest.json` | PWA-manifest (installeerbaar als standalone app) |
| `sw.js` | Service worker (cachet enkel de app-shell, nooit opgezochte bestemmingen) |
| `app.js` | Gedeelde Supabase-client + auth/UI-helpers |
| `style.css` | Het volledige design-systeem |
| `icon.svg` | Logo, gebruikt als favicon/app-icoon |

## Deployen — 3 stappen

1. **Host de map** ergens die statische bestanden serveert over HTTPS
   (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.). Sleep de hele
   `browseport`-map erin — geen build-stap nodig, het is pure HTML/CSS/JS.
2. **Vervang `YOUR-DOMAIN.tld` in `opensearch.xml`** door het echte domein
   waarop je hebt gedeployed (bijv. `browseport.app`). OpenSearch vereist
   absolute URLs, dus dit kan niet automatisch.
3. **(optioneel) PNG-iconen toevoegen.** `manifest.json` gebruikt nu alleen
   het SVG-icoon — dat werkt in alle moderne Chrome/Edge/Firefox-versies,
   maar sommige oudere Android-WebViews willen een PNG. Voeg dan
   `assets/icon-192.png` en `assets/icon-512.png` toe en breid de
   `icons`-array in `manifest.json` uit.

## Hoe de adresbalk-zoekmachine werkt

Zodra iemand `index.html` één keer bezoekt (over HTTPS), herkent Chrome/Edge
de `<link rel="search">`-tag automatisch en voegt Browseport toe aan de
lijst van zoekmachines. De gebruiker typt dan in de adresbalk:

```
browseport<Tab of spatie>mattyou.cool
```

en komt via `go.html?domain=mattyou.cool` direct op de bestemming. Firefox
toont een expliciete "voeg zoekmachine toe"-knop in de adresbalk zelf.
Sommige browsers (Safari op iOS) ondersteunen custom OpenSearch-providers
niet — daar is de geïnstalleerde PWA het alternatief.

## Beperkingen van de mini-hosting (bewust, voor een volgende versie)

- Alleen **tekstbestanden** (html/css/js/svg/json/txt) — geen binaire
  uploads zoals afbeeldingen of lettertypen. Dat kan later met een
  Supabase Storage-bucket per domein; de `site_files`-tabel is daar al op
  voorbereid (voeg dan een `storage_path`-kolom toe).
- De resolver inlinet alleen **directe** `<link href="…css">` en
  `<script src="…js"></script>` verwijzingen vanaf `index.html` — geneste
  imports (bijv. een `@import` in CSS naar een ander bestand) worden niet
  gevolgd.
- Gehoste sites draaien in een gesandboxte `<iframe srcdoc>` zonder eigen
  origin — voldoende voor demo's, landingspagina's en scripts, maar niet
  geschikt voor sites die `fetch` naar relatieve paden op "hun eigen
  domein" doen.

## Wat er nieuw is in deze versie

- **De adresbalk-demo bovenaan is nu een écht `<input>`-veld** — precies
  zoals 'm hoort te zijn. Zolang je 'm niet aanklikt speelt er een
  **grijze** ghost-typing-animatie op de achtergrond (`browseport
  mattyou.cool`) die laat zien hoe het werkt. Klik erin of begin te typen
  en de animatie stopt meteen — je ziet dan gewoon je eigen tekst in de
  normale (niet-grijze) kleur. Enter of op de groene pijl klikken stuurt
  je naar `go.html?domain=…`. Het aparte "Domein opzoeken"-zoekformulier
  daaronder is gewoon blijven staan, zoals in het origineel.
- **Publieke domein-directory** op de homepage (`#directory`) en een
  live tellertje (aantal geregistreerde / gehoste domeinen), beide direct
  uit de `domains`-tabel — geen extra Supabase-configuratie nodig, de
  bestaande publieke lees-policy is voldoende. Dit staat er extra bij,
  niet in plaats van iets.
- **Startsjabloon voor nieuwe sites.** Bij het registreren van een
  "zelf gehoste" domein staat er een aangevinkt vakje "begin met een
  kant-en-klaar sjabloon" — dat zet meteen een werkend `index.html` +
  `style.css` + `script.js` neer via `starterTemplateFiles()` in
  `app.js`. Heb je al een leeg gehost domein zonder bestanden? In de
  bestandenbeheerder staat dan een knop "Vul met sjabloon-site →" die
  hetzelfde doet. Zo hoeft niemand met een leeg scherm te beginnen.
- **Echte adminweergave-schakelaar.** Log je in met een van de twee
  admin-e-mailadressen (na Supabase e-mailverificatie, zie hieronder),
  dan zie je in het dashboard een schakelaar "Adminweergave". Zet 'm uit
  en het dashboard gedraagt zich exact als bij een normale gebruiker
  (geen ADMIN-badge, geen "alle domeinen"-weergave, geen eigenaar-kolom)
  — handig om te controleren wat gewone bezoekers zien. Zet 'm weer aan
  en je bent direct weer admin. Dit is een puur cosmetische, per-browser
  instelling (`localStorage`) — de eigenlijke rechten in de database
  (RLS via `is_admin()`) veranderen niet, dus er verandert niets aan de
  beveiliging.
- **Wachtwoord vergeten-link** op het inlogscherm, gebruikt Supabase's
  ingebouwde `resetPasswordForEmail`.
- Registreren stuurt na e-mailbevestiging automatisch terug naar
  `dashboard.html` (`emailRedirectTo`).

### Hoe e-mailverificatie voor admins precies werkt

Er is niets extra's te configureren: `is_admin()` in de database
controleert het e-mailadres van de ingelogde gebruiker. Zodra iemand
zich registreert met `treurmattheo@gmail.com` of
`mattyougaming@gmail.com` én — als jouw Supabase-project e-mailbevestiging
vereist (Authentication → Providers → Email in het dashboard) — de
bevestigingslink in hun mail aanklikt, heeft die sessie automatisch
adminrechten zodra ze inloggen. Geen aparte "maak mij admin"-stap nodig.

## Snel testen

Open `dashboard.html`, maak een account aan met een van de twee
admin-e-mailadressen, registreer een domein als "gehoste site", zet in de
bestandsbeheerder een `index.html` neer, en open daarna
`go.html?domain=jouwdomein.tld`.
