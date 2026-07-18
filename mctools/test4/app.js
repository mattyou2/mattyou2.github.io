/* =========================================================================
   RESOURCE PACK CREATOR — gedeelde app-logica
   Gebruikt door index.html (home) en datapack-maker.html (tool).
   ========================================================================= */

const APP_NAME = 'Resource Pack Creator';

/* =========================================================================
   CRASH SAFETY NET — nooit meer een stil wit scherm.
   Als er ergens een fout optreedt (nu of in de toekomst), verschijnt er een
   zichtbare rode foutbox met de exacte melding i.p.v. een leeg scherm.
   ========================================================================= */
function renderFatalError(err){
  console.error(err);
  const app=document.getElementById('app');
  if(!app) return; // zelfs #app ontbreekt — dan kunnen we niks meer tonen
  app.innerHTML = `
    <div style="max-width:720px;margin:60px auto;padding:20px;background:#2a1414;border:2px solid #e05a5a;color:#f4d7d7;font-family:monospace;border-radius:4px;">
      <h2 style="color:#ff8b8b;margin:0 0 10px;">⚠ Er ging iets mis</h2>
      <p style="margin:0 0 10px;">De pagina kon niet volledig laden. Dit is de exacte foutmelding (kopieer 'm als je hulp vraagt):</p>
      <pre style="white-space:pre-wrap;background:#1a0e0e;padding:10px;border-radius:3px;font-size:12px;">${(err && (err.stack||err.message)) || err}</pre>
      <p style="margin:14px 0 0;font-size:12px;">Meest voorkomende oorzaken: de pagina is geopend als lokaal bestand (dubbelklik) i.p.v. via een server/URL,
      een script kon niet laden (internetverbinding/adblocker), of een bestand ontbreekt/heet anders dan verwacht.</p>
    </div>`;
}
window.addEventListener('error', (e)=>{ renderFatalError(e.error || e.message); });
window.addEventListener('unhandledrejection', (e)=>{ renderFatalError(e.reason); });
function safeRender(){
  if(typeof render !== 'function') return; // pagina-script nog niet geladen
  try{ render(); }catch(e){ renderFatalError(e); }
}

/* =========================================================================
   SUPABASE — accounts & cloud packs
   ========================================================================= */
const SUPABASE_URL = 'https://gscqsdztghjvlrvfhdjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzY3FzZHp0Z2hqdmxydmZoZGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzE5NTksImV4cCI6MjA5NzYwNzk1OX0.qcltg43WR05AElvagteN6DicUuQc6rP3frX7Jv0AgBA';

let sb;
let SUPABASE_UNAVAILABLE = false;
try{
  if(!window.supabase) throw new Error('De Supabase-library (supabase-js) is niet geladen. Check je internetverbinding, of dat het <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"> tagje vóór app.js in de HTML staat.');
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}catch(e){
  SUPABASE_UNAVAILABLE = true;
  console.error('Supabase kon niet initialiseren, accounts/cloud-opslag staan uit:', e);
  // Stub zodat de rest van de app (die overal sb.auth.* en sb.from(...) aanroept) niet crasht,
  // ook al werkt inloggen/opslaan dan niet.
  const rejected = ()=>Promise.resolve({data:null,error:new Error('Supabase niet beschikbaar')});
  const chainStub = { select:()=>chainStub, eq:()=>chainStub, order:()=>chainStub, single:rejected,
    upsert:rejected, update:rejected, delete:rejected, in:()=>chainStub, then:(res)=>res({data:[],error:new Error('Supabase niet beschikbaar')}) };
  sb = { auth:{ getSession:async()=>({data:{session:null}}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
    signOut:async()=>({error:null}), signInWithPassword:rejected, signUp:rejected }, from:()=>chainStub };
}
// De echte site (GitHub Pages) — nodig zodat e-mailverificatie/reset-links je hier terugbrengen i.p.v. naar een lokaal pad.
const SITE_URL = 'https://mattyou2.github.io/mctools/index.html';

let currentUser = null;
let currentMcUsername = ''; // uit de mc_profiles-tabel (publiek zichtbare gebruikersnaam)
sb.auth.getSession().then(({data})=>{ currentUser = data.session ? data.session.user : null; loadMcUsername().then(safeRender); }).catch(e=>renderFatalError(e));
sb.auth.onAuthStateChange((_event, session)=>{ currentUser = session ? session.user : null; loadMcUsername().then(safeRender); });

async function loadMcUsername(){
  currentMcUsername='';
  if(!currentUser) return;
  try{
    const {data,error}=await sb.from('mc_profiles').select('username').eq('id',currentUser.id).single();
    if(!error && data) currentMcUsername=data.username;
  }catch(e){ /* tabel bestaat misschien nog niet — val terug op user_metadata hieronder */ }
}
function currentUsername(){
  if(!currentUser) return '';
  return currentMcUsername || (currentUser.user_metadata && currentUser.user_metadata.username) || currentUser.email || '';
}


/* =========================================================================
   DATA
   ========================================================================= */
const MC_COLORS = [
  {code:'black',hex:'#000000'},{code:'dark_blue',hex:'#0000AA'},{code:'dark_green',hex:'#00AA00'},
  {code:'dark_aqua',hex:'#00AAAA'},{code:'dark_red',hex:'#AA0000'},{code:'dark_purple',hex:'#AA00AA'},
  {code:'gold',hex:'#FFAA00'},{code:'gray',hex:'#AAAAAA'},{code:'dark_gray',hex:'#555555'},
  {code:'blue',hex:'#5555FF'},{code:'green',hex:'#55FF55'},{code:'aqua',hex:'#55FFFF'},
  {code:'red',hex:'#FF5555'},{code:'light_purple',hex:'#FF55FF'},{code:'yellow',hex:'#FFFF55'},
  {code:'white',hex:'#FFFFFF'}
];

const VANILLA_ITEMS = {
  'Zwaarden': ['wooden_sword','stone_sword','golden_sword','iron_sword','diamond_sword','netherite_sword'],
  'Gereedschap': ['wooden_pickaxe','stone_pickaxe','iron_pickaxe','golden_pickaxe','diamond_pickaxe','netherite_pickaxe',
    'wooden_axe','iron_axe','diamond_axe','wooden_shovel','iron_shovel','diamond_shovel','wooden_hoe','shears','fishing_rod','flint_and_steel','mace'],
  'Wapens op afstand': ['bow','crossbow','trident'],
  'Helm': ['leather_helmet','chainmail_helmet','iron_helmet','golden_helmet','diamond_helmet','netherite_helmet','turtle_helmet'],
  'Harnas': ['leather_chestplate','chainmail_chestplate','iron_chestplate','golden_chestplate','diamond_chestplate','netherite_chestplate'],
  'Broek': ['leather_leggings','chainmail_leggings','iron_leggings','golden_leggings','diamond_leggings','netherite_leggings'],
  'Laarzen': ['leather_boots','chainmail_boots','iron_boots','golden_boots','diamond_boots','netherite_boots'],
  'Ertsen & blokken': ['coal_ore','iron_ore','gold_ore','diamond_ore','emerald_ore','lapis_ore','redstone_ore',
    'iron_block','gold_block','diamond_block','emerald_block','netherite_block'],
  'Ingots & gems': ['coal','raw_iron','iron_ingot','raw_gold','gold_ingot','diamond','emerald','lapis_lazuli','redstone',
    'netherite_scrap','netherite_ingot'],
  'Voedsel': ['apple','golden_apple','bread','cooked_beef','golden_carrot','cookie','melon_slice'],
  'Overig': ['stick','blaze_rod','ender_pearl','ender_eye','totem_of_undying','shield','elytra','bucket','potion','nether_star']
};
const ALL_BASE_ITEMS = Object.values(VANILLA_ITEMS).flat();

const ATTRIBUTES = [
  {id:'attack_damage',label:'Aanvalsschade'},
  {id:'attack_knockback',label:'Aanval-terugstoot'},
  {id:'attack_speed',label:'Aanvalssnelheid'},
  {id:'armor',label:'Bepantsering'},
  {id:'armor_toughness',label:'Bepantsering-taaiheid'},
  {id:'max_health',label:'Max. gezondheid'},
  {id:'max_absorption',label:'Max. absorptie'},
  {id:'movement_speed',label:'Bewegingssnelheid'},
  {id:'knockback_resistance',label:'Terugstootweerstand'},
  {id:'luck',label:'Geluk'},
  {id:'block_break_speed',label:'Blok-afbraaksnelheid'},
  {id:'block_interaction_range',label:'Blok-interactiebereik'},
  {id:'entity_interaction_range',label:'Entity-interactiebereik'},
  {id:'fall_damage_multiplier',label:'Valschade-vermenigvuldiger'},
  {id:'gravity',label:'Zwaartekracht'},
  {id:'jump_strength',label:'Sprongkracht'},
  {id:'safe_fall_distance',label:'Veilige valafstand'},
  {id:'scale',label:'Schaal (grootte)'},
  {id:'step_height',label:'Staphoogte'},
  {id:'submerged_mining_speed',label:'Mijnsnelheid onder water'},
  {id:'sweeping_damage_ratio',label:'Sweep-schaderatio'},
  {id:'water_movement_efficiency',label:'Beweging in water'},
  {id:'burning_time',label:'Brandduur'},
  {id:'explosion_knockback_resistance',label:'Explosie-terugstootweerstand'},
  {id:'movement_efficiency',label:'Bewegingsefficiëntie (blokken)'},
  {id:'oxygen_bonus',label:'Zuurstofbonus'},
  {id:'tempt_range',label:'Lokafstand (mobs)'},
  {id:'follow_range',label:'Volgafstand (mobs)'},
];
const OPERATIONS = [
  {id:'add_value',label:'Optellen (vast getal)'},
  {id:'add_multiplied_base',label:'Vermenigvuldigen (basis)'},
  {id:'add_multiplied_total',label:'Vermenigvuldigen (totaal)'},
];
const SLOTS = [
  {id:'mainhand',label:'Hoofdhand'},{id:'offhand',label:'Andere hand'},{id:'head',label:'Hoofd'},
  {id:'chest',label:'Lichaam'},{id:'legs',label:'Benen'},{id:'feet',label:'Voeten'},{id:'any',label:'Overal'}
];
const ENCHANTMENTS = [
  ['sharpness',5],['smite',5],['bane_of_arthropods',5],['knockback',2],['fire_aspect',2],['looting',3],
  ['sweeping_edge',3],['efficiency',5],['silk_touch',1],['unbreaking',3],['fortune',3],['power',5],['punch',2],
  ['flame',1],['infinity',1],['protection',4],['fire_protection',4],['blast_protection',4],['projectile_protection',4],
  ['thorns',3],['respiration',3],['aqua_affinity',1],['depth_strider',3],['frost_walker',2],['feather_falling',4],
  ['mending',1],['curse_of_vanishing',1],['curse_of_binding',1],['loyalty',3],['impaling',5],['riptide',3],
  ['channeling',1],['multishot',1],['quick_charge',3],['piercing',4],['luck_of_the_sea',3],['lure',3],
  ['soul_speed',3],['swift_sneak',3],['breach',4],['density',5],['wind_burst',3]
].map(e=>({id:e[0],max:e[1]}));

const ABILITY_DEFS = {
  grappling_hook:{label:'Grappling hook',desc:'Zip naar het blok waar je naar kijkt.',trigger:'use',trigLabel:'Ingedrukt houden',
    params:[{k:'strength',label:'Trekkracht',type:'number',min:1,max:10,def:3}]},
  fireball_shoot:{label:'Vuurbal schieten',desc:'Schiet een vuurbal precies waar je kijkt.',trigger:'use',trigLabel:'Ingedrukt houden',
    params:[{k:'power',label:'Kracht',type:'number',min:1,max:5,def:2},{k:'damage',label:'Schade',type:'number',min:1,max:50,def:6}]},
  speed_boost_use:{label:'Snelheidsboost',desc:'Geef jezelf een tijdelijke snelheidsboost.',trigger:'use',trigLabel:'Ingedrukt houden',
    params:[{k:'duration',label:'Duur (sec)',type:'number',min:1,max:60,def:8},{k:'amplifier',label:'Niveau',type:'number',min:1,max:5,def:2}]},
  heal_burst:{label:'Heal burst',desc:'Een burst van genezing voor jezelf.',trigger:'use',trigLabel:'Ingedrukt houden',
    params:[{k:'amount',label:'Genezing (harten)',type:'number',min:1,max:20,def:4}]},
  melee_explosion:{label:'Explosie bij raak',desc:'Melee hits zorgen voor een explosie rond je doelwit.',trigger:'hit',trigLabel:'Bij melee-hit',
    params:[{k:'radius',label:'Straal (kracht)',type:'number',min:1,max:10,def:2},{k:'damage',label:'Extra schade',type:'number',min:1,max:50,def:4}]},
  lightning_on_hit:{label:'Bliksem bij raak',desc:'Roept een bliksem op bij een melee-hit.',trigger:'hit',trigLabel:'Bij melee-hit',
    params:[{k:'chance',label:'Kans (%)',type:'number',min:1,max:100,def:35}]},
  wolf_pack:{label:'Wolf pack',desc:'Roep loyale wolven op die voor je vechten.',trigger:'use',trigLabel:'Ingedrukt houden',
    params:[{k:'count',label:'Aantal wolven',type:'number',min:1,max:6,def:2},{k:'duration',label:'Duur (sec)',type:'number',min:5,max:120,def:30}]},
  held_aura:{label:'Held aura',desc:'Een boost die actief is zolang je het item vasthoudt.',trigger:'held',trigLabel:'Zolang vastgehouden',
    params:[{k:'amplifier',label:'Niveau',type:'number',min:1,max:5,def:1}]},
};

// data = datapack format, resource = resourcepack format. newFormat versies gebruiken min_format/max_format
// i.p.v. één pack_format-getal (sinds snapshot 25w31a). newItemModelSystem = 1.21.4+: item-definities
// (assets/<ns>/items/) i.p.v. het verouderde "overrides"-veld in het model van het basisitem.
const VERSIONS = [
  {id:'26.2',   label:'26.2 (Chaos Cubed)', data:107.1, resource:88.0, style:'component', newFormat:true,  attrPrefix:false, newItemModelSystem:true},
  {id:'26.1',   label:'26.1',               data:101.1, resource:84.0, style:'component', newFormat:true,  attrPrefix:false, newItemModelSystem:true},
  {id:'1.21.11',label:'1.21.11',            data:94.1,  resource:75.0, style:'component', newFormat:true,  attrPrefix:false, newItemModelSystem:true},
  {id:'1.21.10',label:'1.21.10',            data:88.0,  resource:69.0, style:'component', newFormat:true,  attrPrefix:false, newItemModelSystem:true},
  {id:'1.21.8', label:'1.21.8',             data:81,    resource:64,   style:'component', newFormat:false, attrPrefix:false, newItemModelSystem:true},
  {id:'1.21.6', label:'1.21.6',             data:80,    resource:63,   style:'component', newFormat:false, attrPrefix:false, newItemModelSystem:true},
  {id:'1.21.5', label:'1.21.5',             data:71,    resource:55,   style:'component', newFormat:false, attrPrefix:false, newItemModelSystem:true},
  {id:'1.21.4', label:'1.21.4',             data:61,    resource:46,   style:'component', newFormat:false, attrPrefix:false, newItemModelSystem:true},
  {id:'1.21.3', label:'1.21.3',             data:57,    resource:42,   style:'component', newFormat:false, attrPrefix:false, newItemModelSystem:false},
  {id:'1.21.1', label:'1.21.1',             data:48,    resource:34,   style:'component', newFormat:false, attrPrefix:true,  newItemModelSystem:false},
  {id:'1.20.6', label:'1.20.6',             data:41,    resource:32,   style:'component', newFormat:false, attrPrefix:true,  newItemModelSystem:false},
  {id:'1.20.4', label:'1.20.4',             data:26,    resource:22,   style:'nbt',       newFormat:false, attrPrefix:true,  newItemModelSystem:false},
  {id:'1.20.2', label:'1.20.2',             data:18,    resource:18,   style:'nbt',       newFormat:false, attrPrefix:true,  newItemModelSystem:false},
  {id:'1.20.1', label:'1.20.1',             data:15,    resource:15,   style:'nbt',       newFormat:false, attrPrefix:true,  newItemModelSystem:false},
];
const VERIFIED_VERSION = '1.21.8';

const ARMOR_SLOTS = [
  {slot:'helmet',label:'Helm',eq:'head'},{slot:'chestplate',label:'Harnas',eq:'chest'},
  {slot:'leggings',label:'Broek',eq:'legs'},{slot:'boots',label:'Laarzen',eq:'feet'}
];
function guessArmorBase(material,slot){ return material+'_'+slot; }

/* =========================================================================
   STATE
   ========================================================================= */
const state = {
  packName:'', packVersion:'1.21.8',
  items:[],
  selectedItemId:null,
  modal:null,
  authModal:null,     // {tab:'login'|'signup', error, loading}
  myPacksModal:null,  // {packs:[...], loading}
  importModal:null,   // {loading,error,parsed:{items,textures},checkedItems:Set,checkedTextures:Set,tab}
  addingNew:false,
  // Texture-bibliotheek — gedeeld tussen Datapack Maker en Texture Pack Maker via localStorage,
  // want het zijn losse pagina's met elk hun eigen JS-state.
  textureLibrary:[], // [{id,name,category,texturePath,dataUrl}]
};
let uidCounter=1;
function uid(prefix){return prefix+'_'+(uidCounter++)+'_'+Math.random().toString(36).slice(2,7);}
function slug(str){ return str.toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'item'; }

const TEXLIB_KEY='mc_texture_library_v1';
function loadTextureLibrary(){
  try{ const raw=localStorage.getItem(TEXLIB_KEY); state.textureLibrary = raw ? JSON.parse(raw) : []; }
  catch(e){ state.textureLibrary=[]; }
}
function saveTextureLibrary(){
  try{ localStorage.setItem(TEXLIB_KEY, JSON.stringify(state.textureLibrary)); }catch(e){ /* storage vol/geblokkeerd */ }
}
loadTextureLibrary();

/* =========================================================================
   HEADER + FOOTER (gedeeld door beide pagina's)
   ========================================================================= */
function renderHeader(activeNav){
  const h=document.createElement('header');
  h.className='topbar';

  const logo=document.createElement('div');
  logo.className='logo-wrap';
  logo.innerHTML=`<svg class="mark" viewBox="0 0 24 24" fill="none"><path d="M4 15l4-10 4 3 4-6 4 13" stroke="#22c55e" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><path d="M4 15h16v4H4z" fill="#22c55e"/></svg><span class="word">${APP_NAME}</span>`;
  logo.onclick=()=>{ location.href='index.html'; };
  h.appendChild(logo);

  const nav=document.createElement('nav');
  nav.className='main-nav';
  nav.innerHTML=`
    <div class="nav-link" id="navBrowse">Browse</div>
    <div class="nav-link ${activeNav==='community'?'active':''}" id="navCommunity">Community ⌄</div>
    <div class="nav-link ${activeNav==='tools'?'active':''}" id="navTools">Tools ⌄</div>
    <div class="nav-link">Guide</div>
    <div class="nav-link gold">Premium</div>
  `;
  h.appendChild(nav);
  setTimeout(()=>{
    document.getElementById('navBrowse').onclick=()=>{ location.href='browse.html'; };
    document.getElementById('navCommunity').onclick=(e)=>{ e.stopPropagation(); toggleCommunityMenu(); };
    document.getElementById('navTools').onclick=(e)=>{ e.stopPropagation(); toggleToolsMenu(); };
  },0);

  const spacer=document.createElement('div');
  spacer.className='spacer';
  h.appendChild(spacer);

  const packPill=document.createElement('button');
  packPill.className='pack-pill';
  packPill.innerHTML=`Pack <span class="count">${state.items.length}</span>`;
  packPill.onclick=()=>openMyPacksModal();
  h.appendChild(packPill);

  const bell=document.createElement('div');
  bell.className='icon-btn';
  bell.title='Meldingen';
  bell.textContent='🔔';
  h.appendChild(bell);

  if(currentUser){
    const acc=document.createElement('div');
    acc.className='account-box';
    acc.innerHTML=`<span class="account-username">Ingelogd als <b>${escapeHtml(currentUsername())}</b></span>`;
    const logoutBtn=document.createElement('button');
    logoutBtn.className='btn small ghost';
    logoutBtn.textContent='Uitloggen';
    logoutBtn.onclick=async()=>{ await sb.auth.signOut(); showToast('Uitgelogd.'); };
    acc.appendChild(logoutBtn);
    const avatar=document.createElement('div');
    avatar.className='avatar';
    avatar.textContent=currentUsername().slice(0,1).toUpperCase();
    acc.appendChild(avatar);
    h.appendChild(acc);
  } else {
    const loginBtn=document.createElement('button');
    loginBtn.className='btn small primary';
    loginBtn.textContent='Inloggen / account maken';
    loginBtn.onclick=()=>{ state.authModal={tab:'login',username:'',error:null,loading:false}; render(); };
    h.appendChild(loginBtn);
    const avatar=document.createElement('div');
    avatar.className='avatar';
    avatar.textContent='?';
    h.appendChild(avatar);
  }
  return h;
}

function toggleCommunityMenu(){
  let menu=document.getElementById('communityDropdown');
  if(menu){ menu.remove(); return; }
  const btn=document.getElementById('navCommunity');
  menu=document.createElement('div');
  menu.id='communityDropdown';
  menu.className='panel';
  menu.style.cssText='position:absolute;z-index:60;padding:6px;min-width:220px;';
  const rect=btn.getBoundingClientRect();
  menu.style.top=(rect.bottom+6)+'px'; menu.style.left=rect.left+'px';
  menu.innerHTML=`
    <div class="dropdown-item" id="commToPacks">
      <span class="di-icon">📦</span><div><b>Packs</b><div class="di-sub">Browse &amp; remix gepubliceerde packs</div></div>
    </div>
    <div class="dropdown-item" id="commToTextures">
      <span class="di-icon">🖼️</span><div><b>Textures</b><div class="di-sub">Losse textures om te mixen</div></div>
    </div>
  `;
  document.body.appendChild(menu);
  menu.querySelector('#commToPacks').onclick=()=>{ location.href='community.html?filter=packs'; };
  menu.querySelector('#commToTextures').onclick=()=>{ location.href='community.html?filter=items'; };
  setTimeout(()=>{
    document.addEventListener('click', function closeMenu(e){
      if(!menu.contains(e.target)){ menu.remove(); document.removeEventListener('click',closeMenu); }
    });
  },0);
}

function toggleToolsMenu(){
  let menu=document.getElementById('toolsDropdown');
  if(menu){ menu.remove(); return; }
  const btn=document.getElementById('navTools');
  menu=document.createElement('div');
  menu.id='toolsDropdown';
  menu.className='panel';
  menu.style.cssText='position:absolute;z-index:60;padding:6px;min-width:200px;';
  const rect=btn.getBoundingClientRect();
  menu.style.top=(rect.bottom+6)+'px'; menu.style.left=rect.left+'px';
  menu.innerHTML=`
    <div class="dropdown-item" id="toolsToDatapack">
      <span class="di-icon">📦</span><div><b>Datapack Maker</b><div class="di-sub">Custom items, sets &amp; abilities</div></div>
    </div>
    <div class="dropdown-item" id="toolsToTexture">
      <span class="di-icon">🎨</span><div><b>Texture Pack Maker</b><div class="di-sub">Reskin bestaande textures</div></div>
    </div>
  `;
  document.body.appendChild(menu);
  menu.querySelector('#toolsToDatapack').onclick=()=>{ location.href='datapack-maker.html'; };
  menu.querySelector('#toolsToTexture').onclick=()=>{ location.href='texture-pack-maker.html'; };
  setTimeout(()=>{
    document.addEventListener('click', function closeMenu(e){
      if(!menu.contains(e.target)){ menu.remove(); document.removeEventListener('click',closeMenu); }
    });
  },0);
}

function renderFooter(){
  const foot=document.createElement('footer');
  foot.className='foot';
  foot.innerHTML=`
    <div class="foot-inner">
      <div class="foot-brand">
        <div class="fb-logo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 15l4-10 4 3 4-6 4 13" stroke="#22c55e" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><path d="M4 15h16v4H4z" fill="#22c55e"/></svg>${APP_NAME}</div>
        <p>Maak, mix en converteer Minecraft texture packs rechtstreeks in je browser. Niks te installeren.</p>
      </div>
      <div class="foot-cols">
        <div class="foot-col"><h5>Create</h5>
          <a href="browse.html">Browse &amp; Edit</a><a href="#">Import</a><a href="#">Export</a><a href="#">Sounds</a>
        </div>
        <div class="foot-col"><h5>Community</h5>
          <a href="community.html?filter=packs">Packs</a><a href="community.html?filter=items">Textures</a>
        </div>
        <div class="foot-col"><h5>Tools</h5>
          <a href="datapack-maker.html">Datapack Maker</a><a href="#">Pixel Art Editor</a><a href="#">GIF Maker</a><a href="#">Menu Background</a>
        </div>
        <div class="foot-col"><h5>Site</h5>
          <a href="#">About</a><a href="#">Contact</a><a href="#">Legal</a><a href="#">Discord</a>
        </div>
      </div>
    </div>
    <div class="foot-bottom">${APP_NAME} — zelfgemaakte tools voor Minecraft datapacks &amp; resourcepacks. Niet geaffilieerd met Mojang.</div>
  `;
  return foot;
}

/* =========================================================================
   AUTH MODAL (met verplichte gebruikersnaam bij account maken)
   ========================================================================= */
function renderAuthModal(){
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.onclick=(e)=>{ if(e.target===overlay){ state.authModal=null; render(); } };
  const box=document.createElement('div');
  box.className='panel modal-box';
  const m=state.authModal;
  box.innerHTML=`
    <h2>ACCOUNT</h2>
    <div class="auth-tabs">
      <button class="btn small ${m.tab==='login'?'primary':'ghost'}" id="loginTabBtn">Inloggen</button>
      <button class="btn small ${m.tab==='signup'?'primary':'ghost'}" id="signupTabBtn">Account maken</button>
    </div>
    ${m.tab==='signup'?`<label>GEBRUIKERSNAAM</label><input type="text" id="authUsername" placeholder="hoe je genoemd wilt worden" value="${escapeHtml(m.username||'')}" maxlength="24">`:''}
    <label style="margin-top:${m.tab==='signup'?'10px':'0'};">E-MAIL</label>
    <input type="email" id="authEmail" placeholder="jij@voorbeeld.com">
    <label style="margin-top:10px;">WACHTWOORD</label>
    <input type="password" id="authPassword" placeholder="minstens 6 tekens">
    ${m.error?`<div class="error-msg">${escapeHtml(m.error)}</div>`:''}
    ${m.info?`<div class="ok-msg">${escapeHtml(m.info)}</div>`:''}
    <div class="field-row" style="margin-top:18px;justify-content:flex-end;">
      <button class="btn ghost" id="closeAuthBtn">Sluiten</button>
      <button class="btn primary" id="submitAuthBtn" ${m.loading?'disabled':''}>${m.tab==='login'?'Inloggen':'Account maken'}</button>
    </div>
    <div class="hint-box">Je packs worden opgeslagen via Supabase, gekoppeld aan je account (alleen jij kan ze zien/laden). Andere gebruikers zien straks je gebruikersnaam, niet je e-mailadres.</div>
  `;
  overlay.appendChild(box);
  setTimeout(()=>{
    box.querySelector('#loginTabBtn').onclick=()=>{ state.authModal.tab='login'; state.authModal.error=null; render(); };
    box.querySelector('#signupTabBtn').onclick=()=>{ state.authModal.tab='signup'; state.authModal.error=null; render(); };
    box.querySelector('#closeAuthBtn').onclick=()=>{ state.authModal=null; render(); };
    const unameEl=box.querySelector('#authUsername');
    if(unameEl) unameEl.addEventListener('input',e=>{ state.authModal.username=e.target.value; });
    box.querySelector('#submitAuthBtn').onclick=async()=>{
      const email=box.querySelector('#authEmail').value.trim();
      const password=box.querySelector('#authPassword').value;
      const username=(box.querySelector('#authUsername')?box.querySelector('#authUsername').value:'').trim();
      if(!email || password.length<6){ state.authModal.error='Vul een geldig e-mailadres en een wachtwoord van minstens 6 tekens in.'; render(); return; }
      if(state.authModal.tab==='signup' && !username){ state.authModal.error='Vul een gebruikersnaam in.'; render(); return; }
      state.authModal.loading=true; state.authModal.error=null; render();
      try{
        if(state.authModal.tab==='signup'){
          const {error}=await sb.auth.signUp({email,password,options:{data:{username}, emailRedirectTo: SITE_URL}});
          if(error) throw error;
          state.authModal.info='Account aangemaakt! Als e-mailbevestiging aanstaat, check je inbox — anders ben je al ingelogd als '+username+'.';
          state.authModal.loading=false; render();
        } else {
          const {error}=await sb.auth.signInWithPassword({email,password});
          if(error) throw error;
          state.authModal=null; render();
          showToast('Welkom terug, '+currentUsername()+'!');
        }
      }catch(err){
        state.authModal.loading=false; state.authModal.error=err.message||'Er ging iets mis.'; render();
      }
    };
  },0);
  return overlay;
}

/* =========================================================================
   MY PACKS MODAL (cloud save/load)
   ========================================================================= */
function openMyPacksModal(){
  if(!currentUser){ state.authModal={tab:'login',username:'',error:null,loading:false}; render(); return; }
  state.myPacksModal={packs:null,loading:true,error:null};
  render();
  loadMyPacks();
}
async function loadMyPacks(){
  try{
    const {data,error}=await sb.from('packs').select('id,name,updated_at,is_public').order('updated_at',{ascending:false});
    if(error) throw error;
    state.myPacksModal={packs:data,loading:false,error:null};
  }catch(err){
    state.myPacksModal={packs:[],loading:false,error:err.message};
  }
  render();
}
function renderMyPacksModal(){
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.onclick=(e)=>{ if(e.target===overlay){ state.myPacksModal=null; render(); } };
  const box=document.createElement('div');
  box.className='panel modal-box';
  const m=state.myPacksModal;
  let body='';
  if(m.loading) body='<div class="empty-hint">Laden…</div>';
  else if(m.error) body=`<div class="error-msg">${escapeHtml(m.error)}</div>`;
  else if(!m.packs.length) body='<div class="empty-hint">Nog geen packs opgeslagen in de cloud.</div>';
  else body=m.packs.map(p=>`
    <div class="mypacks-row">
      <div><b>${escapeHtml(p.name)}</b><div class="mp-meta">bijgewerkt: ${new Date(p.updated_at).toLocaleString('nl-NL')} · ${p.is_public?'🌍 publiek':'🔒 privé'}</div></div>
      <div class="field-row" style="margin:0;">
        <button class="btn small ${p.is_public?'ghost':'gold'}" data-pub="${p.id}" data-makepublic="${p.is_public?'0':'1'}">${p.is_public?'Privé maken':'Publiceren'}</button>
        <button class="btn small primary" data-load="${p.id}">Laden</button>
        <button class="btn small danger" data-del="${p.id}">✕</button>
      </div>
    </div>`).join('');
  box.innerHTML=`
    <h2>☁ MIJN PACKS</h2>
    <button class="btn primary" id="saveCurrentBtn" style="margin-bottom:16px;width:100%;">Huidige pack opslaan in cloud</button>
    ${body}
    <div class="field-row" style="margin-top:18px;justify-content:flex-end;">
      <button class="btn ghost" id="closeMyPacksBtn">Sluiten</button>
    </div>
  `;
  overlay.appendChild(box);
  setTimeout(()=>{
    box.querySelector('#closeMyPacksBtn').onclick=()=>{ state.myPacksModal=null; render(); };
    box.querySelector('#saveCurrentBtn').onclick=()=>saveCurrentPackToCloud();
    box.querySelectorAll('[data-load]').forEach(btn=>{ btn.onclick=()=>loadPackFromCloud(btn.dataset.load); });
    box.querySelectorAll('[data-del]').forEach(btn=>{ btn.onclick=()=>deletePackFromCloud(btn.dataset.del); });
    box.querySelectorAll('[data-pub]').forEach(btn=>{ btn.onclick=()=>togglePublishPack(btn.dataset.pub, btn.dataset.makepublic==='1'); });
  },0);
  return overlay;
}
async function saveCurrentPackToCloud(){
  if(!state.packName.trim()){ showToast('Geef je pack eerst een naam.'); return; }
  const payload={ packName:state.packName, packVersion:state.packVersion, items:state.items };
  try{
    const {error}=await sb.from('packs').upsert({
      user_id: currentUser.id, name: state.packName, data: payload
    },{ onConflict:'user_id,name' });
    if(error) throw error;
    showToast('Pack opgeslagen in de cloud!');
    loadMyPacks();
  }catch(err){ showToast('Opslaan mislukt: '+err.message); }
}
async function loadPackFromCloud(id){
  try{
    const {data,error}=await sb.from('packs').select('data').eq('id',id).single();
    if(error) throw error;
    const payload=data.data;
    state.packName=payload.packName||''; state.packVersion=payload.packVersion||state.packVersion;
    state.items=payload.items||[]; state.selectedItemId=null;
    state.myPacksModal=null;
    if(!location.pathname.endsWith('datapack-maker.html')){ location.href='datapack-maker.html'; return; }
    render();
    showToast('Pack geladen!');
  }catch(err){ showToast('Laden mislukt: '+err.message); }
}
async function deletePackFromCloud(id){
  try{
    const {error}=await sb.from('packs').delete().eq('id',id);
    if(error) throw error;
    loadMyPacks();
  }catch(err){ showToast('Verwijderen mislukt: '+err.message); }
}

/* =========================================================================
   HELPERS
   ========================================================================= */
function prettyName(id){ return id.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
function mcColorHex(code){ const c=MC_COLORS.find(x=>x.code===code); return c?c.hex:'#FFFFFF'; }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showToast(msg){
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(),3200);
}

/* =========================================================================
   EXPORT / BUILD
   ========================================================================= */
async function doExport(){
  if(!state.packName.trim()){ showToast('Geef je pack eerst een naam.'); return; }
  if(state.items.length===0){ showToast('Voeg eerst minstens 1 item toe.'); return; }
  const versionInfo=VERSIONS.find(v=>v.id===state.packVersion) || VERSIONS[0];
  const ns=slug(state.packName);
  try{
    const rpZip=await buildResourcePack(ns,versionInfo);
    const dpZip=await buildDataPack(ns,versionInfo);
    downloadBlob(await rpZip.generateAsync({type:'blob'}), ns+'_resourcepack.zip');
    downloadBlob(await dpZip.generateAsync({type:'blob'}), ns+'_datapack.zip');
    showToast('Export klaar! Beide .zip bestanden zijn gedownload.');
  }catch(err){ console.error(err); showToast('Er ging iets mis bij het exporteren — zie console.'); }
}
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function dataUrlToBlob(dataUrl){
  const arr=dataUrl.split(','); const mime=arr[0].match(/:(.*?);/)[1]; const bstr=atob(arr[1]);
  let n=bstr.length; const u8=new Uint8Array(n); while(n--) u8[n]=bstr.charCodeAt(n);
  return new Blob([u8],{type:mime});
}
async function blankTransparentPngDataUrl(){ const c=document.createElement('canvas'); c.width=16;c.height=16; return c.toDataURL('image/png'); }

/* =========================================================================
   VANILLA TEXTURE CATALOG — namen/categorieën alleen, GEEN pixel-data.
   We nemen bewust geen echte Minecraft-textures over (ook niet vanaf externe
   sites die ze hosten) — dat blijft Mojang's auteursrechtelijk beschermde werk,
   ongeacht de bron. Deze catalogus geeft alleen de juiste naam + categorie
   (nodig voor het resourcepack-pad), zodat je zelf tekent of je eigen,
   legaal verkregen bestanden importeert.
   ========================================================================= */
const TEXTURE_CATALOG = {
  'Blocks': ['stone','granite','polished_granite','diorite','polished_diorite','andesite','polished_andesite','deepslate','cobbled_deepslate','polished_deepslate','calcite','tuff','tuff_bricks','chiseled_tuff','chiseled_tuff_bricks','polished_tuff','dripstone_block','grass_block','dirt','coarse_dirt','rooted_dirt','podzol','mud','muddy_mangrove_roots','crimson_nylium','warped_nylium','cobblestone','mossy_cobblestone','oak_planks','spruce_planks','birch_planks','jungle_planks','acacia_planks','dark_oak_planks','mangrove_planks','cherry_planks','bamboo_planks','bamboo_mosaic','crimson_planks','warped_planks','pale_oak_planks','oak_log','spruce_log','birch_log','jungle_log','acacia_log','dark_oak_log','mangrove_log','cherry_log','pale_oak_log','bamboo_block','crimson_stem','warped_stem','stripped_oak_log','stripped_spruce_log','stripped_birch_log','stripped_jungle_log','stripped_acacia_log','stripped_dark_oak_log','stripped_mangrove_log','stripped_cherry_log','stripped_pale_oak_log','stripped_bamboo_block','stripped_crimson_stem','stripped_warped_stem','oak_wood','spruce_wood','birch_wood','jungle_wood','acacia_wood','dark_oak_wood','mangrove_wood','cherry_wood','pale_oak_wood','stripped_oak_wood','stripped_spruce_wood','stripped_birch_wood','stripped_jungle_wood','stripped_acacia_wood','stripped_dark_oak_wood','stripped_mangrove_wood','stripped_cherry_wood','crimson_hyphae','warped_hyphae','oak_leaves','spruce_leaves','birch_leaves','jungle_leaves','acacia_leaves','dark_oak_leaves','mangrove_leaves','cherry_leaves','pale_oak_leaves','azalea_leaves','flowering_azalea_leaves','sponge','wet_sponge','glass','tinted_glass','lapis_ore','deepslate_lapis_ore','lapis_block','dispenser_front','dispenser_front_vertical','sandstone','sandstone_top','sandstone_bottom','chiseled_sandstone','cut_sandstone','cut_sandstone_top','note_block','powered_rail','detector_rail','sticky_piston','piston_top','piston_side','piston_bottom','piston_top_sticky','white_wool','orange_wool','magenta_wool','light_blue_wool','yellow_wool','lime_wool','pink_wool','gray_wool','light_gray_wool','cyan_wool','purple_wool','blue_wool','brown_wool','green_wool','red_wool','black_wool','gold_block','iron_block','bricks','tnt','tnt_top','tnt_bottom','bookshelf','chiseled_bookshelf','mossy_cobblestone_stairs','obsidian','torch','wall_torch','fire','spawner','oak_stairs','chest_front','chest_side','chest_top','ender_chest_front','ender_chest_side','ender_chest_top','diamond_ore','deepslate_diamond_ore','diamond_block','crafting_table_top','crafting_table_front','crafting_table_side','crafting_table_side3','furnace_front','furnace_front_on','furnace_side','furnace_top','ladder','rail','cobblestone_stairs','lever','stone_pressure_plate','iron_ore','deepslate_iron_ore','coal_ore','deepslate_coal_ore','coal_block','oak_fence','spruce_fence','birch_fence','jungle_fence','acacia_fence','dark_oak_fence','mangrove_fence','cherry_fence','pale_oak_fence','bamboo_fence','crimson_fence','warped_fence','pumpkin_top','pumpkin_side','carved_pumpkin','netherrack','soul_sand','soul_soil','glowstone','jack_o_lantern','white_stained_glass','orange_stained_glass','magenta_stained_glass','light_blue_stained_glass','yellow_stained_glass','lime_stained_glass','pink_stained_glass','gray_stained_glass','light_gray_stained_glass','cyan_stained_glass','purple_stained_glass','blue_stained_glass','brown_stained_glass','green_stained_glass','red_stained_glass','black_stained_glass','cake_top','cake_side','cake_bottom','cake_inner','repeater','repeater_on','oak_door_top','oak_door_bottom','iron_door_top','iron_door_bottom','iron_bars','glass_pane','white_stained_glass_pane','melon_top','melon_side','vine','oak_fence_gate','spruce_fence_gate','birch_fence_gate','jungle_fence_gate','acacia_fence_gate','dark_oak_fence_gate','mangrove_fence_gate','cherry_fence_gate','pale_oak_fence_gate','bamboo_fence_gate','crimson_fence_gate','warped_fence_gate','brick_stairs','stone_brick_stairs','mossy_stone_bricks','cracked_stone_bricks','chiseled_stone_bricks','stone_bricks','mycelium_top','mycelium_side','lily_pad','nether_bricks','nether_brick_fence','nether_brick_stairs','enchanting_table_top','enchanting_table_side','enchanting_table_bottom','end_portal_frame_top','end_portal_frame_side','end_portal_frame_eye','end_stone','dragon_egg','redstone_lamp','redstone_lamp_on','cocoa_stage0','cocoa_stage1','cocoa_stage2','emerald_ore','deepslate_emerald_ore','ender_chest','tripwire_hook','tripwire','emerald_block','command_block_front','command_block_back','command_block_side','chain_command_block_front','repeating_command_block_front','beacon','cobblestone_wall','mossy_cobblestone_wall','stone_brick_wall','flower_pot','potted_dandelion','carrots_stage0','carrots_stage1','carrots_stage2','carrots_stage3','potatoes_stage0','potatoes_stage1','potatoes_stage2','potatoes_stage3','anvil_top','anvil','damaged_anvil_top','very_damaged_anvil_top','trapped_chest','light_weighted_pressure_plate','heavy_weighted_pressure_plate','comparator','comparator_on','daylight_detector_top','daylight_detector_side','redstone_block','nether_quartz_ore','hopper_outside','hopper_inside','hopper_top','quartz_block_top','quartz_block_side','quartz_block_bottom','chiseled_quartz_block','quartz_pillar','quartz_pillar_top','smooth_quartz_block','activator_rail','activator_rail_on','white_terracotta','orange_terracotta','magenta_terracotta','light_blue_terracotta','yellow_terracotta','lime_terracotta','pink_terracotta','gray_terracotta','light_gray_terracotta','cyan_terracotta','purple_terracotta','blue_terracotta','brown_terracotta','green_terracotta','red_terracotta','black_terracotta','terracotta','packed_ice','sunflower_top','hay_block_top','hay_block_side','white_carpet','orange_carpet','magenta_carpet','light_blue_carpet','yellow_carpet','lime_carpet','pink_carpet','gray_carpet','light_gray_carpet','cyan_carpet','purple_carpet','blue_carpet','brown_carpet','green_carpet','red_carpet','black_carpet','grass_path_top','grass_path_side','sunflower_back','sunflower_front','oak_slab','spruce_slab','birch_slab','jungle_slab','acacia_slab','dark_oak_slab','mangrove_slab','cherry_slab','pale_oak_slab','bamboo_slab','crimson_slab','warped_slab','stone_slab','smooth_stone_slab','sandstone_slab','red_sandstone','red_sandstone_top','red_sandstone_bottom','chiseled_red_sandstone','cut_red_sandstone','purpur_block','purpur_pillar','purpur_pillar_top','end_stone_bricks','magma','nether_wart_block','warped_wart_block','red_nether_bricks','bone_block_top','bone_block_side','white_glazed_terracotta','orange_glazed_terracotta','magenta_glazed_terracotta','light_blue_glazed_terracotta','yellow_glazed_terracotta','lime_glazed_terracotta','pink_glazed_terracotta','gray_glazed_terracotta','light_gray_glazed_terracotta','cyan_glazed_terracotta','purple_glazed_terracotta','blue_glazed_terracotta','brown_glazed_terracotta','green_glazed_terracotta','red_glazed_terracotta','black_glazed_terracotta','white_concrete','orange_concrete','magenta_concrete','light_blue_concrete','yellow_concrete','lime_concrete','pink_concrete','gray_concrete','light_gray_concrete','cyan_concrete','purple_concrete','blue_concrete','brown_concrete','green_concrete','red_concrete','black_concrete','white_concrete_powder','orange_concrete_powder','magenta_concrete_powder','light_blue_concrete_powder','yellow_concrete_powder','lime_concrete_powder','pink_concrete_powder','gray_concrete_powder','light_gray_concrete_powder','cyan_concrete_powder','purple_concrete_powder','blue_concrete_powder','brown_concrete_powder','green_concrete_powder','red_concrete_powder','black_concrete_powder','kelp','kelp_plant','dried_kelp_block_top','dried_kelp_block_side','dried_kelp_block_bottom','turtle_egg','turtle_egg_slightly_cracked','turtle_egg_very_cracked','dead_tube_coral_block','tube_coral_block','dead_brain_coral_block','brain_coral_block','dead_bubble_coral_block','bubble_coral_block','dead_fire_coral_block','fire_coral_block','dead_horn_coral_block','horn_coral_block','blue_ice','seagrass','tall_seagrass_top','tall_seagrass_bottom','prismarine','prismarine_bricks','dark_prismarine','sea_lantern','conduit','barrier','structure_block','structure_void','jigsaw','composter_top','composter_side','composter_bottom','composter_compost','bell_top','bell_side','bell_bottom','lantern','soul_lantern','campfire_fire','campfire_log','campfire_log_lit','soul_campfire_fire','blast_furnace_front','blast_furnace_front_on','blast_furnace_top','blast_furnace_side','smoker_front','smoker_front_on','smoker_top','smoker_side','cartography_table_top','cartography_table_side1','cartography_table_side2','fletching_table_top','fletching_table_side','fletching_table_front','smithing_table_top','smithing_table_side','smithing_table_front','stonecutter_top','stonecutter_side','stonecutter_bottom','stonecutter_saw','grindstone_side','grindstone_round','grindstone_pivot','grindstone_rail','lectern_top','lectern_front','lectern_sides','lectern_base','lectern_bottom','scaffolding_top','scaffolding_side','scaffolding_bottom','target_top','target_side','beehive_front','beehive_side','beehive_end','beehive_front_honey','honeycomb_block','honey_block_top','honey_block_side','honey_block_bottom','respawn_anchor_top','respawn_anchor_side0','respawn_anchor_side1','respawn_anchor_side2','respawn_anchor_side3','respawn_anchor_side4','respawn_anchor_bottom','crying_obsidian','blackstone','blackstone_top','polished_blackstone','polished_blackstone_bricks','gilded_blackstone','chiseled_polished_blackstone','chain','lodestone_top','lodestone_side','netherite_block','ancient_debris_top','ancient_debris_side','basalt_top','basalt_side','polished_basalt_top','polished_basalt_side','smooth_basalt','soul_torch','soul_wall_torch','soul_fire_0','shroomlight','weeping_vines','weeping_vines_plant','twisting_vines','twisting_vines_plant','crimson_fungus','warped_fungus','crimson_roots','warped_roots','nether_sprouts','cracked_deepslate_bricks','cracked_deepslate_tiles','cracked_polished_blackstone_bricks','cracked_nether_bricks','chiseled_deepslate','deepslate_bricks','deepslate_tiles','reinforced_deepslate_top','reinforced_deepslate_side','copper_block','exposed_copper','weathered_copper','oxidized_copper','cut_copper','exposed_cut_copper','weathered_cut_copper','oxidized_cut_copper','waxed_copper_block','copper_ore','deepslate_copper_ore','amethyst_block','budding_amethyst','amethyst_cluster','large_amethyst_bud','medium_amethyst_bud','small_amethyst_bud','raw_iron_block','raw_copper_block','raw_gold_block','powder_snow','sculk','sculk_vein','sculk_catalyst_top','sculk_catalyst_side','sculk_catalyst_bottom','sculk_shrieker_top','sculk_shrieker_side','sculk_shrieker_inner_top','sculk_sensor_top','sculk_sensor_side','sculk_sensor_bottom','sculk_sensor_tendril','mangrove_roots_top','mangrove_roots_side','moss_block','moss_carpet','pointed_dripstone_down_base','pointed_dripstone_down_frustum','pointed_dripstone_down_middle','pointed_dripstone_down_tip','pointed_dripstone_up_base','pointed_dripstone_up_frustum','pointed_dripstone_up_middle','pointed_dripstone_up_tip','small_dripstone_top','azalea_top','azalea_side','azalea_plant','flowering_azalea_top','flowering_azalea_side','spore_blossom','spore_blossom_base','glow_lichen','big_dripleaf_top','big_dripleaf_side','big_dripleaf_stem','small_dripleaf_top','small_dripleaf_side','cave_vines','cave_vines_lit','cave_vines_plant','cave_vines_plant_lit','pink_petals','bamboo_stalk','bamboo_singleleaf','bamboo_smallleaf','bamboo_largeleaf','suspicious_sand_0','suspicious_gravel_0','decorated_pot_side','decorated_pot_base','trial_spawner_top_active','trial_spawner_top_inactive','trial_spawner_side_active','trial_spawner_side_inactive','vault_top','vault_side','vault_front_on','vault_front_off','copper_bulb','copper_bulb_lit','copper_bulb_powered','copper_door_top','copper_door_bottom','copper_grate','copper_trapdoor','crafter_north','crafter_top','crafter_top_crafting','crafter_bottom','heavy_core','resin_block','resin_bricks','resin_clump','pale_moss_block','open_eyeblossom','closed_eyeblossom','bedrock','ice','snow','sand','red_sand','gravel','clay','farmland','farmland_moist','water_still','lava_still','cactus_top','cactus_side','cactus_bottom','debug','debug2','attached_melon_stem','melon_stem','attached_pumpkin_stem','pumpkin_stem'],
  'Items': ['wooden_sword','stone_sword','golden_sword','iron_sword','diamond_sword','netherite_sword','wooden_pickaxe','stone_pickaxe','golden_pickaxe','iron_pickaxe','diamond_pickaxe','netherite_pickaxe','wooden_axe','stone_axe','golden_axe','iron_axe','diamond_axe','netherite_axe','wooden_shovel','stone_shovel','golden_shovel','iron_shovel','diamond_shovel','netherite_shovel','wooden_hoe','stone_hoe','golden_hoe','iron_hoe','diamond_hoe','netherite_hoe','bow','crossbow','trident','shield','fishing_rod','carrot_on_a_stick','warped_fungus_on_a_stick','flint_and_steel','shears','mace','apple','golden_apple','enchanted_golden_apple','bread','cookie','melon_slice','glistering_melon_slice','beef','cooked_beef','porkchop','cooked_porkchop','chicken','cooked_chicken','mutton','cooked_mutton','rabbit','cooked_rabbit','cod','cooked_cod','salmon','cooked_salmon','tropical_fish','pufferfish','rotten_flesh','spider_eye','potato','baked_potato','poisonous_potato','carrot','golden_carrot','beetroot','beetroot_soup','mushroom_stew','rabbit_stew','suspicious_stew','pumpkin_pie','cake','honey_bottle','dried_kelp','sweet_berries','glow_berries','milk_bucket','water_bucket','lava_bucket','bucket','cod_bucket','salmon_bucket','tropical_fish_bucket','pufferfish_bucket','axolotl_bucket','powder_snow_bucket','diamond','emerald','gold_ingot','iron_ingot','netherite_ingot','netherite_scrap','coal','charcoal','redstone','lapis_lazuli','raw_iron','raw_gold','raw_copper','copper_ingot','amethyst_shard','quartz','glowstone_dust','gunpowder','sugar','string','feather','flint','leather','rabbit_hide','rabbit_foot','phantom_membrane','ender_pearl','ender_eye','blaze_rod','blaze_powder','ghast_tear','magma_cream','nether_star','nether_wart','fermented_spider_eye','prismarine_shard','prismarine_crystals','scute','turtle_helmet','nautilus_shell','heart_of_the_sea','totem_of_undying','shulker_shell','dragon_breath','elytra','firework_rocket','firework_star','book','writable_book','written_book','enchanted_book','knowledge_book','map','filled_map','compass','recovery_compass','clock','spyglass','name_tag','lead','saddle','music_disc_13','music_disc_cat','music_disc_pigstep','music_disc_5','music_disc_otherside','music_disc_relic','music_disc_creator','music_disc_creator_music_box','music_disc_precipice','music_disc_blocks','music_disc_chirp','music_disc_far','music_disc_mall','music_disc_mellohi','music_disc_stal','music_disc_strad','music_disc_ward','music_disc_11','music_disc_wait','music_disc_tears','disc_fragment_5','potion','splash_potion','lingering_potion','glass_bottle','experience_bottle','brewing_stand','cauldron','brick','clay_ball','snowball','egg','bone','bone_meal','white_dye','orange_dye','magenta_dye','light_blue_dye','yellow_dye','lime_dye','pink_dye','gray_dye','light_gray_dye','cyan_dye','purple_dye','blue_dye','brown_dye','green_dye','red_dye','black_dye','ink_sac','glow_ink_sac','wheat','wheat_seeds','beetroot_seeds','melon_seeds','pumpkin_seeds','torchflower_seeds','pitcher_pod','oak_sapling','spruce_sapling','birch_sapling','jungle_sapling','acacia_sapling','dark_oak_sapling','mangrove_propagule','cherry_sapling','pale_oak_sapling','stick','bowl','paper','iron_nugget','gold_nugget','armor_stand','item_frame','glow_item_frame','painting','minecart','chest_minecart','furnace_minecart','tnt_minecart','hopper_minecart','oak_boat','oak_chest_boat','spruce_boat','spruce_chest_boat','birch_boat','birch_chest_boat','jungle_boat','jungle_chest_boat','acacia_boat','acacia_chest_boat','dark_oak_boat','dark_oak_chest_boat','mangrove_boat','mangrove_chest_boat','cherry_boat','cherry_chest_boat','pale_oak_boat','pale_oak_chest_boat','bamboo_raft','bamboo_chest_raft','bundle','white_bundle','black_bundle','water_bottle','mundane_potion','thick_potion','awkward_potion','night_vision_potion','invisibility_potion','leaping_potion','fire_resistance_potion','swiftness_potion','slowness_potion','water_breathing_potion','healing_potion','harming_potion','poison_potion','regeneration_potion','strength_potion','weakness_potion','luck_potion','slow_falling_potion','turtle_master_potion','lodestone_compass','banner_pattern','goat_horn','echo_shard','ominous_bottle','wind_charge','breeze_rod','trial_key','ominous_trial_key','smithing_template','netherite_upgrade_smithing_template','resin_brick','coast_armor_trim_smithing_template','sentry_armor_trim_smithing_template','dune_armor_trim_smithing_template','wild_armor_trim_smithing_template','ward_armor_trim_smithing_template','eye_armor_trim_smithing_template','vex_armor_trim_smithing_template','tide_armor_trim_smithing_template','snout_armor_trim_smithing_template','rib_armor_trim_smithing_template','spire_armor_trim_smithing_template','wayfinder_armor_trim_smithing_template','shaper_armor_trim_smithing_template','silence_armor_trim_smithing_template','raiser_armor_trim_smithing_template','host_armor_trim_smithing_template','flow_armor_trim_smithing_template','bolt_armor_trim_smithing_template','white_banner','black_banner','red_banner','green_banner','blue_banner','yellow_banner','light_blue_bed','white_bed','red_bed','black_bed','skeleton_skull','wither_skeleton_skull','zombie_head','creeper_head','dragon_head','piglin_head','player_head','white_candle','orange_candle','magenta_candle','light_blue_candle','yellow_candle','lime_candle','pink_candle','gray_candle','light_gray_candle','cyan_candle','purple_candle','blue_candle','brown_candle','green_candle','red_candle','black_candle','candle','bamboo','pointed_dripstone','lava','water','debug_stick','jigsaw','command_block_minecart','end_crystal'],
  '3D Mobs': ['zombie','zombie_villager','husk','drowned','skeleton','stray','wither_skeleton','bogged','creeper','spider','cave_spider','enderman','endermite','blaze','ghast','slime','magma_cube','witch','vindicator','evoker','pillager','ravager','vex','phantom','guardian','elder_guardian','shulker','silverfish','cod','salmon','pufferfish','tropical_fish','squid','glow_squid','dolphin','turtle','axolotl','frog','tadpole','allay','warden','camel','sniffer','armadillo','breeze','cow','mooshroom','pig','sheep','chicken','rabbit','horse','donkey','mule','skeleton_horse','zombie_horse','llama','trader_llama','cat','ocelot','wolf','fox','bee','panda','polar_bear','parrot','bat','villager','wandering_trader','iron_golem','snow_golem','ender_dragon','wither','piglin','piglin_brute','zombified_piglin','hoglin','zoglin','strider','strider_saddled','goat','spider_eyes','cave_spider_eyes','enderman_eyes','spider_eight_leg','firefly','happy_ghast','fox_sleep'],
  'HUD & Menus': ['widgets','icons','hotbar','container/inventory','container/generic_54','container/generic_27','container/generic_9','container/furnace','container/blast_furnace','container/smoker','container/crafting_table','container/anvil','container/beacon','container/brewing_stand','container/enchanting_table','container/villager2','container/loom','container/stonecutter','container/cartography_table','container/grindstone','container/smithing','container/shulker_box','container/horse','container/hopper','container/dispenser','container/dropper','container/lectern','container/chiseled_bookshelf','demo_background','options_background','title/background/panorama_0','title/background/panorama_1','title/background/panorama_2','title/background/panorama_3','title/background/panorama_4','title/background/panorama_5','title/edition','accessibility','recipe_book','world_selection','server_selection','resource_packs','credits','advancements/backgrounds/adventure','advancements/backgrounds/end','advancements/backgrounds/husbandry','advancements/backgrounds/nether','advancements/backgrounds/stone','advancements/backgrounds/story','achievement/background','bars','boss_bar','sliders','numbers','unseen_notification','presets','spectator_widgets','social_interactions','toasts','light_gray_carpet','chat_tags','map_background','map_icons','map_background_checkerboard','book_landscape','book_portrait','horse_markers','pumpkinblur','underwater','vignette','nether_portal','death_screen_background'],
  'Particles': ['generic_0','generic_1','generic_2','generic_3','generic_4','generic_5','generic_6','generic_7','flame','flash','campfire_signal_smoke','campfire_cosy_smoke','totem','angry','heart','glint','effect','explosion','explosion_00','sweep_attack','heart_dark','note','bubble_pop_0','bubble_pop_1','bubble_pop_2','bubble','splash','sneeze','rain_splash','dolphin_speed','sonic_boom','glow','spore_blossom_fall_1','large_smoke','smoke','poof','lava_particle','enchant','portal','droplet','spit_1','spit_2','crimson_spore','warped_spore','ash','white_ash','egg_crack','falling_dust_1','damage_indicator','underwater','dripping_lava_particle','dripping_water_particle','dripping_honey_particle','glow_particle','vibration','wax_off','wax_on','electric_spark','scrape','squid_ink','instant_effect','scaffolding_slot','maple_leaves','gust_dust_particle','whirl','white_smoke'],
  'Paintings': ['alban','aztec','aztec2','bomb','burning_skull','kebab','courbet','fern','graham','match','pointer','pool','sea','sunset','creebet','wanderer','wither','back','skull_and_roses','wasteland','pigscene','bust','earth','fire','sky','donkey_kong','wind','pond','baroque','humble','meditative','prairie_ride','broken_egg','cavebird','changing','cotan','endboss','finding','fighters','lowmist','orb','owlemons','passage','stage','sunflowers','tides','unpacked'],
  'Armor Trims': ['coast','sentry','dune','wild','ward','eye','vex','tide','snout','rib','spire','wayfinder','shaper','silence','raiser','host','flow','bolt','quartz_trim_armor','iron_trim_armor','netherite_trim_armor','redstone_trim_armor','copper_trim_armor','gold_trim_armor','emerald_trim_armor','diamond_trim_armor','lapis_trim_armor','amethyst_trim_armor','resin_trim_armor'],
  'Mob Effects': ['speed','slowness','haste','mining_fatigue','strength','instant_health','instant_damage','jump_boost','nausea','regeneration','resistance','fire_resistance','water_breathing','invisibility','blindness','night_vision','hunger','weakness','poison','wither','health_boost','absorption','saturation','glowing','levitation','luck','unluck','slow_falling','conduit_power','dolphins_grace','bad_omen','hero_of_the_village','darkness','trial_omen','raid_omen','wind_charged','weaving','oozing','infested'],
  'Maps': ['map_background','map_background_checkerboard','map_icons','decorations/frame','decorations/frame_glow','decorations/target_point','decorations/target_x','decorations/player','decorations/player_off_map','decorations/player_off_limits','decorations/mansion','decorations/monument','decorations/red_marker','decorations/blue_marker','decorations/village_desert','decorations/village_plains','decorations/village_savanna','decorations/village_snowy','decorations/village_taiga'],
  'Environment': ['clouds','moon_phases','sun','rain','snow','end_sky','fire_layer_0','fire_layer_1','rain_dark','snow_dark','clouds_extra'],
  'Misc': ['heart','hunger','armor','xp_bar','enchanted_glint_item','enchanted_glint_entity','forcefield_solid','forcefield_light','shadow','underwater_overlay','pumpkinblur','white_pixel','banner_base','creeper_banner_pattern','skull_banner_pattern','flower_banner_pattern','mojang_banner_pattern','piglin_banner_pattern','globe_banner_pattern','flow_banner_pattern','guster_banner_pattern','field_masked','stripe_bottom','stripe_top','stripe_left','stripe_right','stripe_center','stripe_middle','stripe_downright','stripe_downleft','stripe_small','square_bottom_left','square_bottom_right','square_top_left','square_top_right','triangle_bottom','triangle_top','triangles_bottom','triangles_top','diagonal_left','diagonal_right','diagonal_up_left','diagonal_up_right','circle','rhombus','half_horizontal','half_horizontal_bottom','half_vertical','half_vertical_right','border','curly_border','gradient','gradient_up','bricks','cross','straight_cross'],
  'Fonts': ['default','ascii','accented','uniform','illageralt','nonlatin_european','enchanting_table'],
  'Colormaps': ['grass','foliage','water'],
  'Effects': ['underwater'],
};
const CATALOG_CATEGORY_MAP = {
  'Blocks': 'block',
  'Items': 'item',
  '3D Mobs': 'entity',
  'HUD & Menus': 'gui',
  'Particles': 'particle',
  'Paintings': 'painting',
  'Armor Trims': 'trims',
  'Mob Effects': 'mob_effect',
  'Maps': 'map',
  'Environment': 'environment',
  'Misc': 'misc',
  'Fonts': 'font',
  'Colormaps': 'colormap',
  'Effects': 'misc',
};
const ALL_CATALOG_ENTRIES = Object.entries(TEXTURE_CATALOG).flatMap(([cat,names])=>
  names.map(name=>({name, category: CATALOG_CATEGORY_MAP[cat], group:cat})));

/* Generieke pixel-editor voor een texture-library entry — werkt op elk object
   met .dataUrl (wordt gebruikt door zowel de Texture Pack Maker als Browse). */
function renderGenericTextureEditor(entry){
  const d=document.createElement('div');
  d.className='pixel-editor-wrap';
  const toolcol=document.createElement('div');
  toolcol.className='pixel-toolcol';
  toolcol.innerHTML=`
    <button class="pixel-tool-btn active" data-tool="pencil">✏️ Potlood</button>
    <button class="pixel-tool-btn" data-tool="bucket">🪣 Emmer (fill)</button>
    <button class="pixel-tool-btn" data-tool="eyedrop">💧 Kleurenkiezer</button>
    <button class="pixel-tool-btn" data-tool="eraser">🧽 Gum</button>
    <div class="color-picker-row">
      <div class="current-color-box" id="curColorBox" style="background:#ff5555"></div>
      <input type="color" id="colorPickerInput" value="#ff5555">
    </div>
    <input type="text" class="hex-input" id="hexInput" value="#ff5555" maxlength="7">
    <label class="upload-label" for="uploadImgInput">⬆ Afbeelding uploaden</label>
    <input type="file" id="uploadImgInput" accept="image/*" style="display:none;">
    <button class="btn small ghost" id="clearCanvasBtn">Wis alles (transparant)</button>
  `;
  const canvasWrap=document.createElement('div');
  const canvas=document.createElement('canvas');
  canvas.id='pixelCanvas';
  canvas.width=16*20; canvas.height=16*20;
  canvasWrap.appendChild(canvas);
  d.appendChild(toolcol); d.appendChild(canvasWrap);

  setTimeout(()=>{
    const ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=false;
    let buf=document.createElement('canvas'); buf.width=16; buf.height=16;
    let bctx=buf.getContext('2d');
    if(entry.dataUrl){ const img=new Image(); img.onload=()=>{ bctx.clearRect(0,0,16,16); bctx.drawImage(img,0,0,16,16); redraw(); }; img.src=entry.dataUrl; }
    function redraw(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(buf,0,0,16,16,0,0,canvas.width,canvas.height);
      ctx.strokeStyle='rgba(0,0,0,0.15)';
      for(let i=0;i<=16;i++){ ctx.beginPath();ctx.moveTo(i*20,0);ctx.lineTo(i*20,canvas.height);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,i*20);ctx.lineTo(canvas.width,i*20);ctx.stroke(); }
    }
    function saveEntry(){ entry.dataUrl=buf.toDataURL('image/png'); saveTextureLibrary(); }
    redraw();
    let tool='pencil'; let color='#ff5555';
    toolcol.querySelectorAll('.pixel-tool-btn').forEach(b=>{ b.onclick=()=>{ toolcol.querySelectorAll('.pixel-tool-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); tool=b.dataset.tool; }; });
    const colorInput=toolcol.querySelector('#colorPickerInput'); const hexInput=toolcol.querySelector('#hexInput'); const colorBox=toolcol.querySelector('#curColorBox');
    function setColor(hex){ if(!/^#[0-9a-fA-F]{6}$/.test(hex)) return; color=hex; colorInput.value=hex; hexInput.value=hex; colorBox.style.background=hex; }
    colorInput.addEventListener('input',e=>setColor(e.target.value));
    hexInput.addEventListener('change',e=>setColor(e.target.value.startsWith('#')?e.target.value:'#'+e.target.value));
    toolcol.querySelector('#uploadImgInput').addEventListener('change',e=>{
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=ev=>{ const img=new Image(); img.onload=()=>{ bctx.clearRect(0,0,16,16); bctx.drawImage(img,0,0,16,16); redraw(); saveEntry(); }; img.src=ev.target.result; };
      reader.readAsDataURL(file);
    });
    toolcol.querySelector('#clearCanvasBtn').onclick=()=>{ bctx.clearRect(0,0,16,16); redraw(); saveEntry(); };
    function px(e){ const rect=canvas.getBoundingClientRect(); const x=Math.floor((e.clientX-rect.left)/(rect.width/16)); const y=Math.floor((e.clientY-rect.top)/(rect.height/16)); return [Math.max(0,Math.min(15,x)),Math.max(0,Math.min(15,y))]; }
    function hexToRgba(hex){ const v=parseInt(hex.slice(1),16); return [(v>>16)&255,(v>>8)&255,v&255,255]; }
    function floodFill(sx,sy,fillColor){
      const data=bctx.getImageData(0,0,16,16); const idx=(x,y)=>(y*16+x)*4;
      const target=data.data.slice(idx(sx,sy),idx(sx,sy)+4); const fc=hexToRgba(fillColor);
      if(target[0]===fc[0]&&target[1]===fc[1]&&target[2]===fc[2]&&target[3]===fc[3]) return;
      const stack=[[sx,sy]];
      while(stack.length){ const [x,y]=stack.pop(); if(x<0||x>15||y<0||y>15) continue; const i=idx(x,y);
        if(data.data[i]!==target[0]||data.data[i+1]!==target[1]||data.data[i+2]!==target[2]||data.data[i+3]!==target[3]) continue;
        data.data[i]=fc[0];data.data[i+1]=fc[1];data.data[i+2]=fc[2];data.data[i+3]=fc[3]; stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]); }
      bctx.putImageData(data,0,0);
    }
    let painting=false;
    function act(e){
      const [x,y]=px(e);
      if(tool==='pencil'){ bctx.clearRect(x,y,1,1); bctx.fillStyle=color; bctx.fillRect(x,y,1,1); }
      else if(tool==='eraser'){ bctx.clearRect(x,y,1,1); }
      else if(tool==='bucket'){ floodFill(x,y,color); }
      else if(tool==='eyedrop'){ const d2=bctx.getImageData(x,y,1,1).data; if(d2[3]>0){ setColor('#'+[d2[0],d2[1],d2[2]].map(n=>n.toString(16).padStart(2,'0')).join('')); } }
      redraw(); saveEntry();
    }
    canvas.addEventListener('mousedown',e=>{ painting=true; act(e); });
    canvas.addEventListener('mousemove',e=>{ if(painting && (tool==='pencil'||tool==='eraser')) act(e); });
    window.addEventListener('mouseup',()=>{ painting=false; });
  },0);
  return d;
}

/* Zoek (of maak) de textureLibrary-entry die bij een catalogus-item hoort,
   zodat tekeningen die je hier maakt ook in de Texture Pack Maker terugkomen. */
function findOrCreateLibraryEntry(catalogEntry){
  let entry=state.textureLibrary.find(t=>t.name===catalogEntry.name && t.category===catalogEntry.category && (t.ns||'minecraft')==='minecraft');
  if(!entry){
    entry={id:uid('lib'), name:catalogEntry.name, category:catalogEntry.category, ns:'minecraft',
      texturePath:catalogEntry.category+'/'+catalogEntry.name, dataUrl:null};
    state.textureLibrary.push(entry);
    saveTextureLibrary();
  }
  return entry;
}

function packMcmeta(desc,versionInfo,which){
  const val = which==='data'? versionInfo.data : versionInfo.resource;
  if(versionInfo.newFormat) return {pack:{description:desc,min_format:val,max_format:val}};
  return {pack:{description:desc,pack_format:val}};
}

async function buildResourcePack(ns,versionInfo){
  const zip=new JSZip();
  zip.file('pack.mcmeta', JSON.stringify(packMcmeta(state.packName+' resource pack ('+APP_NAME+')',versionInfo,'resource'),null,2));

  // Elk custom item krijgt zijn EIGEN model + eigen texture-laag — dit item "overlapt zichzelf":
  // het is volledig self-contained en verwijst nooit naar een ander item's model.
  // Het model zelf staat onder assets/minecraft/models/item/<naam>.json (net als vanilla items dat
  // doen) — alleen de texture blijft in de eigen namespace, zodat er geen bestandsnaam-botsingen met
  // vanilla textures kunnen ontstaan.
  for(const item of state.items){
    const modelId=slug(item.name);
    let texDataUrl=item.texture || await blankTransparentPngDataUrl();
    zip.file(`assets/${ns}/textures/item/${modelId}.png`, dataUrlToBlob(texDataUrl));
    zip.file(`assets/minecraft/models/item/${modelId}.json`, JSON.stringify({parent:'item/generated',textures:{layer0:`${ns}:item/${modelId}`}},null,2));
  }

  // Koppeling met het basisitem (bijv. diamond_sword): dit "overlapt" het basisitem — dat hoort zo,
  // want zo weet Minecraft welke custom_model_data naar welk eigen model wijst.
  const byBase={};
  state.items.forEach((it,idx)=>{ (byBase[it.baseItem]=byBase[it.baseItem]||[]).push({item:it,cmd:1000+idx}); });
  for(const [base,list] of Object.entries(byBase)){
    const sorted=[...list].sort((a,b)=>a.cmd-b.cmd);
    if(versionInfo.newItemModelSystem){
      // 1.21.4+: nieuw item-definitiesysteem (assets/minecraft/items/<base>.json).
      // Het vanilla model van het basisitem (assets/minecraft/models/item/<base>.json) laten we
      // ONGEMOEID — die blijft de fallback voor het normale, ongewijzigde basisitem. We voegen alleen
      // een dispatcher toe die op custom_model_data naar het EIGEN model van elk custom item springt.
      zip.file(`assets/minecraft/items/${base}.json`, JSON.stringify({
        model:{
          type:'minecraft:range_dispatch',
          property:'minecraft:custom_model_data',
          fallback:{ type:'minecraft:model', model:`minecraft:item/${base}` },
          entries: sorted.map(l=>({ threshold:l.cmd, model:{ type:'minecraft:model', model:`minecraft:item/${slug(l.item.name)}` } }))
        }
      },null,2));
    } else {
      // Pre-1.21.4: het oudere override-systeem. Hier MOET het basismodel wel herschreven worden,
      // met de vanilla texture als default-look en per custom_model_data een override naar het
      // eigen model van dat item.
      zip.file(`assets/minecraft/models/item/${base}.json`, JSON.stringify({
        parent:'item/generated', textures:{layer0:`item/${base}`},
        overrides: sorted.map(l=>({predicate:{custom_model_data:l.cmd},model:`minecraft:item/${slug(l.item.name)}`}))
      },null,2));
    }
  }
  return zip;
}

function nameComponentJson(item){
  return JSON.stringify({text:item.name,color:item.color,bold:!!item.bold,italic:!!item.italic,underline:!!item.underline});
}
function randUUID(){ return [rnd(),rnd(),rnd(),rnd()]; function rnd(){ return -2147483648 + Math.floor(Math.random()*4294967295); } }
function attrId(a,versionInfo){ return versionInfo.attrPrefix ? 'generic.'+a : a; }

function buildGiveCommand(item,cmd,versionInfo){
  if(versionInfo.style==='component'){
    const parts=[`custom_name='${nameComponentJson(item)}'`,`custom_model_data=${cmd}`];
    if(item.enchants.length){
      const levels=item.enchants.map(e=>`"minecraft:${e.id}":${e.level}`).join(',');
      parts.push(`enchantments={levels:{${levels}}}`);
    }
    if(item.attributes.length){
      const mods=item.attributes.map((a,i)=>`{type:"minecraft:${attrId(a.attribute,versionInfo)}",id:"${slug(state.packName)}:mod_${i}",amount:${a.amount},operation:"${a.operation}",slot:"${a.slot}"}`).join(',');
      parts.push(`attribute_modifiers={modifiers:[${mods}],show_in_tooltip:true}`);
    }
    if(item.durability.unbreakable) parts.push(`unbreakable={}`);
    if(item.misc.glint) parts.push(`enchantment_glint_override=true`);
    if(item.misc.tooltip.trim()) parts.push(`lore=['${JSON.stringify({text:item.misc.tooltip})}']`);
    return `give @s minecraft:${item.baseItem}[${parts.join(',')}]`;
  } else {
    const nbtParts=[`display:{Name:'${nameComponentJson(item)}'}`,`CustomModelData:${cmd}`];
    if(item.enchants.length){
      const ench=item.enchants.map(e=>`{id:"minecraft:${e.id}",lvl:${e.level}}`).join(',');
      nbtParts.push(`Enchantments:[${ench}]`);
    }
    if(item.attributes.length){
      const mods=item.attributes.map((a,i)=>{
        const u=randUUID();
        const opMap={add_value:0,add_multiplied_base:1,add_multiplied_total:2};
        return `{AttributeName:"${attrId(a.attribute,versionInfo)}",Name:"mod_${i}",Amount:${a.amount},Operation:${opMap[a.operation]},Slot:"${a.slot}",UUID:[I;${u.join(',')}]}`;
      }).join(',');
      nbtParts.push(`AttributeModifiers:[${mods}]`);
    }
    if(item.durability.unbreakable) nbtParts.push(`Unbreakable:1b`);
    return `give @s minecraft:${item.baseItem}{${nbtParts.join(',')}}`;
  }
}

function buildRecipeJson(item,versionInfo){
  const r=item.recipe;
  if(!r || !r.enabled) return null;
  const grid=r.grid;
  const keyMap={}; let nextKey=65; // 'A'
  const patternRows=[];
  for(let row=0; row<3; row++){
    let rowStr='';
    for(let col=0; col<3; col++){
      const v=grid[row*3+col];
      if(!v){ rowStr+=' '; continue; }
      if(!keyMap[v]) keyMap[v]=String.fromCharCode(nextKey++);
      rowStr+=keyMap[v];
    }
    patternRows.push(rowStr);
  }
  const key={};
  Object.entries(keyMap).forEach(([v,k])=>{
    key[k] = v.startsWith('#') ? {tag:'minecraft:'+v.slice(1)} : {item:'minecraft:'+v};
  });
  let result;
  if(versionInfo.style==='component'){
    result={ id:`minecraft:${item.baseItem}`, count:r.count, components:{ custom_model_data:1000, custom_name:nameComponentJson(item) } };
  } else {
    result={ item:`minecraft:${item.baseItem}`, count:r.count };
  }
  if(r.shaped){
    return { type:'minecraft:crafting_shaped', pattern:patternRows, key, result };
  } else {
    const ingredients=Object.keys(keyMap).map(v=> v.startsWith('#') ? {tag:'minecraft:'+v.slice(1)} : {item:'minecraft:'+v});
    return { type:'minecraft:crafting_shapeless', ingredients, result };
  }
}

async function buildDataPack(ns,versionInfo){
  const zip=new JSZip();
  zip.file('pack.mcmeta', JSON.stringify(packMcmeta(state.packName+' datapack ('+APP_NAME+')',versionInfo,'data'),null,2));

  const giveLines=[]; const loadLines=[`say ${state.packName} datapack geladen — gebruik /function ${ns}:give_<item> om items te krijgen.`];

  state.items.forEach((item,idx)=>{
    const cmd=1000+idx;
    const modelId=slug(item.name);
    const giveCmd=buildGiveCommand(item,cmd,versionInfo);
    zip.file(`data/${ns}/function/give_${modelId}.mcfunction`, `# Geeft "${item.name}" aan de speler die de functie aanroept\n${giveCmd}\n`);
    giveLines.push(`/function ${ns}:give_${modelId}  -> ${item.name}`);

    const recipeJson=buildRecipeJson(item,versionInfo);
    if(recipeJson) zip.file(`data/${ns}/recipe/${modelId}.json`, JSON.stringify(recipeJson,null,2));

    const hitAbilities=item.abilities.filter(a=>ABILITY_DEFS[a.type].trigger==='hit');
    if(hitAbilities.length){
      const advId=`hit_${modelId}`;
      zip.file(`data/${ns}/advancement/${advId}.json`, JSON.stringify({
        criteria:{ req:{ trigger:'minecraft:player_hurt_entity',
          conditions:{ player:[{condition:'minecraft:entity_properties',entity:'this',predicate:{equipment:{mainhand:{items:[item.baseItem],nbt:`{CustomModelData:${cmd}}`}}}}] } } },
        rewards:{ function:`${ns}:ability/${advId}` }
      },null,2));
      let fnBody=`# Wordt uitgevoerd zodra iemand een entity raakt met "${item.name}"\n`;
      hitAbilities.forEach(ab=>{
        if(ab.type==='melee_explosion'){
          fnBody+=`execute at @s run summon minecraft:tnt ~ ~1 ~ {Fuse:0}\n`;
          fnBody+=`# radius/kracht: ${ab.params.radius}, extra schade: ${ab.params.damage}\n`;
        }
        if(ab.type==='lightning_on_hit'){
          fnBody+=`execute if predicate ${ns}:chance_${ab.params.chance} at @s run summon minecraft:lightning_bolt ~ ~ ~\n`;
        }
      });
      fnBody+=`advancement revoke @s only ${ns}:${advId}\n`;
      zip.file(`data/${ns}/function/ability/${advId}.mcfunction`, fnBody);
      hitAbilities.filter(a=>a.type==='lightning_on_hit').forEach(ab=>{
        zip.file(`data/${ns}/predicate/chance_${ab.params.chance}.json`, JSON.stringify({condition:'minecraft:random_chance',chance:ab.params.chance/100},null,2));
      });
    }

    const useAbilities=item.abilities.filter(a=>ABILITY_DEFS[a.type].trigger==='use');
    if(useAbilities.length){
      const advId=`use_${modelId}`;
      zip.file(`data/${ns}/advancement/${advId}.json`, JSON.stringify({
        criteria:{ req:{ trigger:'minecraft:using_item', conditions:{ item:{items:[item.baseItem],nbt:`{CustomModelData:${cmd}}`} } } },
        rewards:{ function:`${ns}:ability/${advId}` }
      },null,2));
      let fnBody=`# Wordt uitgevoerd bij rechtsklik (ingedrukt houden) met "${item.name}"\n`;
      fnBody+=`# Let op: vereist dat het item een "consumable" component heeft zodat rechtsklik detecteerbaar is.\n`;
      useAbilities.forEach(ab=>{
        if(ab.type==='grappling_hook'){
          fnBody+=`execute at @s run summon minecraft:fishing_bobber ~ ~ ~\n# trekkracht: ${ab.params.strength}\n`;
        }
        if(ab.type==='fireball_shoot'){
          fnBody+=`execute at @s run summon minecraft:small_fireball ~ ~1.5 ~ {power:[0.0,0.0,${ab.params.power}],ExplosionPower:1}\n`;
        }
        if(ab.type==='speed_boost_use'){
          fnBody+=`effect give @s minecraft:speed ${ab.params.duration} ${ab.params.amplifier-1} true\n`;
        }
        if(ab.type==='heal_burst'){
          fnBody+=`effect give @s minecraft:instant_health ${Math.max(1,Math.round(ab.params.amount/4))} 0 true\n`;
        }
        if(ab.type==='wolf_pack'){
          fnBody+=`execute at @s run summon minecraft:wolf ~ ~ ~ {Owner:"",Angry:0}\n# aantal: ${ab.params.count}, duur: ${ab.params.duration}s (koppel dit aan een scoreboard-timer om ze na afloop te despawnen)\n`;
        }
      });
      fnBody+=`advancement revoke @s only ${ns}:${advId}\n`;
      zip.file(`data/${ns}/function/ability/${advId}.mcfunction`, fnBody);
    }

    const heldAbilities=item.abilities.filter(a=>ABILITY_DEFS[a.type].trigger==='held');
    if(heldAbilities.length){
      let fnBody=`# Loop deze functie elke tick (via een tick.json tag) om het effect te geven zolang "${item.name}" vastgehouden wordt\n`;
      fnBody+=`execute as @a[nbt={SelectedItem:{components:{"minecraft:custom_model_data":${cmd}}}}] run effect give @s minecraft:strength 2 ${(heldAbilities[0].params.amplifier||1)-1} true\n`;
      zip.file(`data/${ns}/function/ability/held_${modelId}.mcfunction`, fnBody);
    }
  });

  zip.file(`data/${ns}/function/give_all.mcfunction`, giveLines.map(l=>'# '+l).join('\n')+'\n'+state.items.map(it=>`function ${ns}:give_${slug(it.name)}`).join('\n')+'\n');
  loadLines.push(...state.items.map(it=>`say - ${it.name}: /function ${ns}:give_${slug(it.name)}`));
  zip.file(`data/${ns}/function/load.mcfunction`, loadLines.join('\n')+'\n');
  zip.file(`data/minecraft/tags/function/load.json`, JSON.stringify({values:[`${ns}:load`]},null,2));

  const heldItems=state.items.filter(it=>it.abilities.some(a=>ABILITY_DEFS[a.type].trigger==='held'));
  if(heldItems.length){
    zip.file(`data/${ns}/function/tick.mcfunction`, heldItems.map(it=>`function ${ns}:ability/held_${slug(it.name)}`).join('\n')+'\n');
    zip.file(`data/minecraft/tags/function/tick.json`, JSON.stringify({values:[`${ns}:tick`]},null,2));
  }

  zip.file('README.txt',
`Datapack: ${state.packName}
Gemaakt met ${APP_NAME} — Datapack Maker
Doelversie: ${state.packVersion}

INSTALLATIE
1. Zet deze map (of de losse .zip) in je wereld-map onder "datapacks/".
2. Zet de resourcepack .zip in je "resourcepacks/" map en activeer hem in-game.
3. Gebruik /reload of herstart de wereld.
4. Typ /function ${ns}:give_all om al je items te ontvangen, of gebruik de losse
   give_<item>.mcfunction per item.
5. Recipes (indien aangezet) werken direct na het laden van de datapack — craft ze
   gewoon in een werktafel met de opgegeven ingrediënten.

ABILITIES — BEPERKINGEN
Vanilla datapacks kunnen geen rechtsklik direct detecteren. Deze export gebruikt
een bekende workaround (advancement "using_item" + een consumable-component op
het item). "Raak"-abilities gebruiken het volledig vanilla-ondersteunde advancement
"player_hurt_entity". "Terwijl vastgehouden"-abilities draaien via een tick-functie.

ITEM-MODELLEN — HOE DIT ZIT
Elk item dat je toevoegt krijgt zijn EIGEN model onder assets/minecraft/models/item/
(net als vanilla-items dat doen) met zijn eigen texture-laag onder
assets/${ns}/textures/item/ — dat model verwijst nooit naar een ander item, het
"overlapt zichzelf" (self-contained).
${versionInfo.newItemModelSystem
  ? `Voor 1.21.4+ wordt daarnaast per basisitem (bijv. diamond_sword) een
item-definitie aangemaakt onder assets/minecraft/items/<basisitem>.json. Die verwijst
op basis van custom_model_data door naar het model van jouw item — het vanilla model
van het basisitem zelf (assets/minecraft/models/item/<basisitem>.json) wordt NIET
aangepast en blijft gewoon de fallback-look.`
  : `Voor deze (oudere) versie wordt het vanilla model van het basisitem herschreven met
een "overrides"-lijst die op custom_model_data naar het model van jouw item verwijst.`}

VERSIE-OPMERKING
Vanaf Minecraft 1.21.9 gebruikt Mojang "min_format"/"max_format" in plaats van een
losse "pack_format" (sinds snapshot 25w31a) — dat is hier al toegepast voor 1.21.10,
1.21.11, 26.1 en 26.2. Dit systeem is relatief nieuw; controleer bij laadproblemen
de exacte syntax op de Minecraft Wiki (Pack format-pagina) voor jouw build.
`);

  return zip;
}

/* =========================================================================
   GENERIEK IMPORTEREN — upload een resourcepack- en/of datapack-.zip,
   kies specifieke items en/of textures, voeg toe aan je datapack en/of
   je texture pack (of allebei).
   ========================================================================= */
async function parseUploadedZip(file){
  const zip=await JSZip.loadAsync(file);
  const textures=[]; // {id, ns, relPath, fileName, category, dataUrl}
  const modelFiles={}; // fullPath -> parsed json
  const dispatchMap={}; // "ns:item/modelId" -> baseItemId (uit assets/minecraft/items/<base>.json)
  const giveInfo={}; // modelId -> {name,color} best-effort uit give_*.mcfunction

  const texEntries=[];
  zip.forEach((path,entry)=>{
    if(entry.dir) return;
    const texMatch=path.match(/^assets\/([^\/]+)\/textures\/(.+)\.png$/i);
    if(texMatch) texEntries.push({path,ns:texMatch[1],relPath:texMatch[2],entry});
    const modelMatch=path.match(/^assets\/([^\/]+)\/models\/item\/([^\/]+)\.json$/i);
    if(modelMatch) modelFiles[path]={ns:modelMatch[1],modelId:modelMatch[2],entry};
    const itemDefMatch=path.match(/^assets\/minecraft\/items\/([^\/]+)\.json$/i);
    if(itemDefMatch) modelFiles['ITEMDEF::'+path]={baseItem:itemDefMatch[1],entry,isItemDef:true};
    const giveMatch=path.match(/^data\/[^\/]+\/function\/give_([^\/]+)\.mcfunction$/i);
    if(giveMatch) modelFiles['GIVE::'+path]={modelId:giveMatch[1],entry,isGive:true};
  });

  // textures inlezen (als data-url)
  for(const t of texEntries){
    const dataUrl='data:image/png;base64,'+(await t.entry.async('base64'));
    const parts=t.relPath.split('/');
    const category=parts.length>1?parts[0]:'item';
    textures.push({id:uid('tex'),ns:t.ns,relPath:t.relPath,fileName:parts[parts.length-1].replace(/\.png$/i,''),category,dataUrl,fullPath:t.path});
  }
  const texByFullPath={}; textures.forEach(t=>texByFullPath[t.fullPath]=t);
  function findTextureByRef(ref, fallbackNs){
    // ref kan zijn "ns:item/naam" of "item/naam" (dan geldt fallbackNs)
    let ns=fallbackNs, rel=ref;
    if(ref.includes(':')){ const p=ref.split(':'); ns=p[0]; rel=p[1]; }
    const full=`assets/${ns}/textures/${rel}.png`;
    return texByFullPath[full] || null;
  }

  // item-definities (nieuw systeem, 1.21.4+) uitlezen voor base-item koppeling
  for(const key of Object.keys(modelFiles)){
    const f=modelFiles[key];
    if(!f.isItemDef) continue;
    try{
      const json=JSON.parse(await f.entry.async('string'));
      const collect=(node)=>{
        if(!node) return;
        if(node.entries) node.entries.forEach(en=>collect(en.model));
        if(node.cases) node.cases.forEach(c=>collect(c.model));
        if(node.model && node.type==='minecraft:model') dispatchMap[node.model]=f.baseItem;
        if(node.model && typeof node.model==='object') collect(node.model);
      };
      collect(json.model);
    }catch(e){ /* geen geldige JSON, negeren */ }
  }
  // give_*.mcfunction best-effort uitlezen voor naam/kleur
  for(const key of Object.keys(modelFiles)){
    const f=modelFiles[key];
    if(!f.isGive) continue;
    try{
      const txt=await f.entry.async('string');
      const nameMatch=txt.match(/"text":"([^"]+)"/);
      const colorMatch=txt.match(/"color":"([^"]+)"/);
      giveInfo[f.modelId]={ name:nameMatch?nameMatch[1]:null, color:colorMatch?colorMatch[1]:null };
    }catch(e){}
  }

  // items samenstellen uit model-bestanden
  const items=[];
  for(const key of Object.keys(modelFiles)){
    const f=modelFiles[key];
    if(f.isItemDef || f.isGive) continue;
    try{
      const json=JSON.parse(await f.entry.async('string'));
      if(!json.textures || !json.textures.layer0) continue;
      const tex=findTextureByRef(json.textures.layer0, f.ns);
      const baseItem=dispatchMap[`${f.ns}:item/${f.modelId}`] || dispatchMap[`minecraft:item/${f.modelId}`] || 'paper';
      const info=giveInfo[f.modelId]||{};
      items.push({
        id:uid('imp'), modelId:f.modelId, ns:f.ns, baseItem,
        name: info.name || prettyName(f.modelId),
        color: info.color || 'white',
        dataUrl: tex ? tex.dataUrl : null,
      });
    }catch(e){ /* niet-standaard model json, overslaan */ }
  }

  return {items, textures};
}

function openImportModal(){
  state.importModal={ tab:'items', loading:false, error:null, parsed:null, checkedItems:new Set(), checkedTextures:new Set() };
  render();
}
function closeImportModal(){ state.importModal=null; render(); }

function renderImportModal(){
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.onclick=(e)=>{ if(e.target===overlay) closeImportModal(); };
  const box=document.createElement('div');
  box.className='panel modal-box wide';
  const m=state.importModal;

  if(!m.parsed){
    box.innerHTML=`
      <h2>📥 Pack importeren</h2>
      <p style="color:var(--text-dim);font-size:12.5px;line-height:1.6;">
        Upload een resourcepack-.zip en/of datapack-.zip (mag ook een gecombineerde .zip zijn — alles
        wat erin staat wordt gescand). Daarna kies je precies welke items en/of textures je wilt
        overnemen.</p>
      <label class="upload-label" for="importFileInput" style="display:block;margin-top:14px;">⬆ Kies .zip bestand</label>
      <input type="file" id="importFileInput" accept=".zip" style="display:none;">
      ${m.loading?'<div class="empty-hint">Bezig met inlezen…</div>':''}
      ${m.error?`<div class="error-msg">${escapeHtml(m.error)}</div>`:''}
      <div class="field-row" style="margin-top:18px;justify-content:flex-end;">
        <button class="btn ghost" id="closeImportBtn">Sluiten</button>
      </div>
    `;
    overlay.appendChild(box);
    setTimeout(()=>{
      box.querySelector('#closeImportBtn').onclick=closeImportModal;
      box.querySelector('#importFileInput').addEventListener('change', async (e)=>{
        const file=e.target.files[0]; if(!file) return;
        m.loading=true; m.error=null; render();
        try{
          m.parsed=await parseUploadedZip(file);
          m.parsed.items.forEach(it=>m.checkedItems.add(it.id));
          m.parsed.textures.forEach(t=>m.checkedTextures.add(t.id));
          m.loading=false; render();
        }catch(err){ m.loading=false; m.error='Kon dit bestand niet lezen: '+err.message; render(); }
      });
    },0);
    return overlay;
  }

  const itemsTab=m.tab==='items';
  const itemsHtml = m.parsed.items.length ? m.parsed.items.map(it=>`
    <label style="display:flex;align-items:center;gap:9px;padding:6px 4px;">
      <input type="checkbox" class="imp-item-chk" value="${it.id}" ${m.checkedItems.has(it.id)?'checked':''}>
      <div class="thumb">${it.dataUrl?`<img src="${it.dataUrl}">`:''}</div>
      <div class="meta"><div class="nm">${escapeHtml(it.name)}</div><div class="sub">${prettyName(it.baseItem)}</div></div>
    </label>`).join('') : '<div class="empty-hint">Geen items gevonden in dit bestand.</div>';
  const texHtml = m.parsed.textures.length ? m.parsed.textures.map(t=>`
    <label style="display:flex;align-items:center;gap:9px;padding:6px 4px;">
      <input type="checkbox" class="imp-tex-chk" value="${t.id}" ${m.checkedTextures.has(t.id)?'checked':''}>
      <div class="thumb"><img src="${t.dataUrl}"></div>
      <div class="meta"><div class="nm">${escapeHtml(t.fileName)}</div><div class="sub">${escapeHtml(t.relPath)}</div></div>
    </label>`).join('') : '<div class="empty-hint">Geen losse textures gevonden.</div>';

  box.innerHTML=`
    <h2>📥 Kies wat je wilt importeren</h2>
    <div class="recipe-tabs">
      <div class="recipe-tab ${itemsTab?'on':''}" id="tabItems">Items (${m.parsed.items.length})</div>
      <div class="recipe-tab ${!itemsTab?'on':''}" id="tabTex">Textures (${m.parsed.textures.length})</div>
    </div>
    <div class="field-row" style="margin-bottom:6px;">
      <button class="btn small ghost" id="selectAllBtn">Alles selecteren</button>
      <button class="btn small ghost" id="selectNoneBtn">Niks selecteren</button>
    </div>
    <div class="checklist" style="max-height:340px;" id="importList">${itemsTab?itemsHtml:texHtml}</div>
    <div class="field-row" style="margin-top:18px;justify-content:flex-end;">
      <button class="btn ghost" id="closeImportBtn">Sluiten</button>
      <button class="btn" id="addToTexBtn">+ Aan texture pack</button>
      ${window.IS_DATAPACK_PAGE?`<button class="btn primary" id="addToBothBtn">+ Aan datapack</button>`:''}
    </div>
  `;
  overlay.appendChild(box);
  setTimeout(()=>{
    box.querySelector('#closeImportBtn').onclick=closeImportModal;
    box.querySelector('#tabItems').onclick=()=>{ m.tab='items'; render(); };
    box.querySelector('#tabTex').onclick=()=>{ m.tab='textures'; render(); };
    box.querySelector('#selectAllBtn').onclick=()=>{
      if(itemsTab) m.parsed.items.forEach(it=>m.checkedItems.add(it.id));
      else m.parsed.textures.forEach(t=>m.checkedTextures.add(t.id));
      render();
    };
    box.querySelector('#selectNoneBtn').onclick=()=>{
      if(itemsTab) m.checkedItems.clear(); else m.checkedTextures.clear();
      render();
    };
    box.querySelectorAll('.imp-item-chk').forEach(chk=>{ chk.onchange=()=>{ chk.checked?m.checkedItems.add(chk.value):m.checkedItems.delete(chk.value); }; });
    box.querySelectorAll('.imp-tex-chk').forEach(chk=>{ chk.onchange=()=>{ chk.checked?m.checkedTextures.add(chk.value):m.checkedTextures.delete(chk.value); }; });
    box.querySelector('#addToTexBtn').onclick=()=>{ importSelectedIntoTextureLibrary(); };
    const bothBtn=box.querySelector('#addToBothBtn');
    if(bothBtn) bothBtn.onclick=()=>{ importSelectedIntoDatapack(); importSelectedIntoTextureLibrary(); };
  },0);
  return overlay;
}

/* Community-pack rechtstreeks importeren (geen zip nodig — items staan al gestructureerd klaar) */
function openImportModalWithParsedItems(items){
  state.importModal={ tab:'items', loading:false, error:null,
    parsed:{ items: items.map(it=>({...it,id:uid('imp')})), textures:[] },
    checkedItems:new Set(), checkedTextures:new Set() };
  items.forEach(()=>{});
  state.importModal.parsed.items.forEach(it=>state.importModal.checkedItems.add(it.id));
  render();
}

/* Bij het laden van de Datapack Maker: kijk of er een 'pending import' klaarstaat
   (bijv. vanaf de Community-pagina) en open die dan automatisch. */
function checkPendingImport(){
  try{
    const raw=localStorage.getItem('mc_pending_import');
    if(!raw) return;
    localStorage.removeItem('mc_pending_import');
    const items=JSON.parse(raw);
    if(items && items.length) openImportModalWithParsedItems(items);
  }catch(e){}
}

function importSelectedIntoDatapack(){
  const m=state.importModal; if(!m || !m.parsed) return;
  if(typeof state.items === 'undefined' || !Array.isArray(state.items)){ showToast('Ga naar Datapack Maker om items te importeren.'); return; }
  let count=0;
  m.parsed.items.filter(it=>m.checkedItems.has(it.id)).forEach(it=>{
    state.items.push({
      id:uid('item'), setId:null, setLabel:null, baseItem:it.baseItem, armorSlot:null,
      name:it.name, color:it.color, bold:false, italic:false, underline:false,
      texture:it.dataUrl, attributes:[], enchants:[], abilities:[],
      recipe:newRecipe(), misc:newMisc(), durability:newDurability()
    });
    count++;
  });
  state.importModal=null;
  showToast(count+' item(s) geïmporteerd in je datapack.');
  render();
}
function importSelectedIntoTextureLibrary(){
  const m=state.importModal; if(!m || !m.parsed) return;
  let count=0;
  m.parsed.textures.filter(t=>m.checkedTextures.has(t.id)).forEach(t=>{
    state.textureLibrary.push({ id:uid('lib'), name:t.fileName, category:t.category, ns:t.ns, texturePath:t.relPath, dataUrl:t.dataUrl });
    count++;
  });
  saveTextureLibrary();
  if(!(m.checkedItems && m.checkedItems.size)) state.importModal=null;
  showToast(count+' texture(s) toegevoegd aan je texture pack-bibliotheek.');
  render();
}

/* =========================================================================
   PUBLICEREN & COMMUNITY
   ========================================================================= */
async function togglePublishPack(id, makePublic){
  try{
    const {error}=await sb.from('packs').update({is_public:makePublic}).eq('id',id);
    if(error) throw error;
    showToast(makePublic ? 'Pack gepubliceerd — zichtbaar op de Community-pagina!' : 'Pack weer privé gemaakt.');
    if(state.myPacksModal) loadMyPacks();
  }catch(err){ showToast('Kon publicatiestatus niet wijzigen: '+err.message); }
}

async function fetchCommunityPacks(){
  const {data,error}=await sb.from('packs').select('id,name,data,updated_at,user_id').eq('is_public',true).order('updated_at',{ascending:false});
  if(error) throw error;
  const userIds=[...new Set(data.map(p=>p.user_id))];
  let usernames={};
  if(userIds.length){
    const {data:profiles}=await sb.from('mc_profiles').select('id,username').in('id',userIds);
    (profiles||[]).forEach(p=>usernames[p.id]=p.username);
  }
  return data.map(p=>({ ...p, authorName: usernames[p.user_id] || 'onbekend' }));
}

async function fetchCommunityPackById(id){
  const {data,error}=await sb.from('packs').select('id,name,data,updated_at,user_id,is_public').eq('id',id).single();
  if(error) throw error;
  if(!data.is_public && (!currentUser || currentUser.id!==data.user_id)) throw new Error('Deze pack is niet openbaar.');
  let authorName='onbekend';
  try{
    const {data:profile}=await sb.from('mc_profiles').select('username').eq('id',data.user_id).single();
    if(profile) authorName=profile.username;
  }catch(e){}
  return { ...data, authorName };
}

async function downloadCommunityPack(pack){
  const backup={packName:state.packName,packVersion:state.packVersion,items:state.items};
  state.packName=pack.name; state.packVersion=(pack.data&&pack.data.packVersion)||'1.21.8'; state.items=(pack.data&&pack.data.items)||[];
  await doExport();
  state.packName=backup.packName; state.packVersion=backup.packVersion; state.items=backup.items;
}
