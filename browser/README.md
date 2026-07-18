# Browseport

Een decentraal domeinsysteem naast het gewone DNS, gebouwd op Supabase.
Gebruikers registreren een custom domeinnaam, laten die doorverwijzen naar
een URL óf hosten er zelf bestanden op, en navigeren ernaartoe via de
website zelf, of — na installatie als PWA — direct vanuit de browser-
adresbalk met het keyword `browseport`.

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

## Snel testen

Open `dashboard.html`, maak een account aan met een van de twee
admin-e-mailadressen, registreer een domein als "gehoste site", zet in de
bestandsbeheerder een `index.html` neer, en open daarna
`go.html?domain=jouwdomein.tld`.
