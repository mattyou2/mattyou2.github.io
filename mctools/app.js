/* =========================================================================
   RESOURCE PACK CREATOR — gedeelde app-logica
   Gebruikt door index.html (home) en datapack-maker.html (tool).
   ========================================================================= */

const APP_NAME = 'Resource Pack Creator';

/* =========================================================================
   SUPABASE(public keys) — accounts & cloud packs
   ========================================================================= */
const SUPABASE_URL = 'https://gscqsdztghjvlrvfhdjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzY3FzZHp0Z2hqdmxydmZoZGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzE5NTksImV4cCI6MjA5NzYwNzk1OX0.qcltg43WR05AElvagteN6DicUuQc6rP3frX7Jv0AgBA';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
sb.auth.getSession().then(({data})=>{ currentUser = data.session ? data.session.user : null; render(); });
sb.auth.onAuthStateChange((_event, session)=>{ currentUser = session ? session.user : null; render(); });

function currentUsername(){
  if(!currentUser) return '';
  return (currentUser.user_metadata && currentUser.user_metadata.username) || currentUser.email || '';
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
  addingNew:false,
};
let uidCounter=1;
function uid(prefix){return prefix+'_'+(uidCounter++)+'_'+Math.random().toString(36).slice(2,7);}
function slug(str){ return str.toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'item'; }

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
    <div class="nav-link">Browse</div>
    <div class="nav-link">Community ⌄</div>
    <div class="nav-link ${activeNav==='tools'?'active':''}">Tools ⌄</div>
    <div class="nav-link">Guide</div>
    <div class="nav-link gold">Premium</div>
  `;
  h.appendChild(nav);

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
          <a href="#">Browse &amp; Edit</a><a href="#">Import</a><a href="#">Export</a><a href="#">Sounds</a>
        </div>
        <div class="foot-col"><h5>Community</h5>
          <a href="#">Packs</a><a href="#">Textures</a>
        </div>
        <div class="foot-col"><h5>Tools</h5>
          <a href="datapack-maker.html">Datapack Maker</a><a href="#">Pixel Art Editor</a><a href="#">GIF Maker</a><a href="#">Menu Background</a>
        </div>
        <div class="foot-col"><h5>Site</h5>
          <a href="#">About</a><a href="#">Contact</a><a href="#">Legal</a><a href="#">Discord</a>
        </div>
      </div>
    </div>
    <div class="foot-bottom">${APP_NAME} — (by Mattyou Studios™) Minecraft tools voor datapacks &amp; resourcepacks. Niet geaffilieerd met Mojang.</div>
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
          const {error}=await sb.auth.signUp({email,password,options:{data:{username}}});
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
    const {data,error}=await sb.from('packs').select('id,name,updated_at').order('updated_at',{ascending:false});
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
      <div><b>${escapeHtml(p.name)}</b><div class="mp-meta">bijgewerkt: ${new Date(p.updated_at).toLocaleString('nl-NL')}</div></div>
      <div class="field-row" style="margin:0;">
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

function packMcmeta(desc,versionInfo,which){
  const val = which==='data'? versionInfo.data : versionInfo.resource;
  if(versionInfo.newFormat) return {pack:{description:desc,min_format:val,max_format:val}};
  return {pack:{description:desc,pack_format:val}};
}

async function buildResourcePack(ns,versionInfo){
  const zip=new JSZip();
  zip.file('pack.mcmeta', JSON.stringify(packMcmeta(state.packName+' resource pack ('+APP_NAME+')',versionInfo,'resource'),null,2));

  // Elk custom item krijgt zijn EIGEN model + eigen texture-laag — dit item "overlapt zichzelf":
  // het is volledig self-contained en verwijst nooit naar een ander item se model.
  for(const item of state.items){
    const modelId=slug(item.name);
    let texDataUrl=item.texture || await blankTransparentPngDataUrl();
    zip.file(`assets/${ns}/textures/item/${modelId}.png`, dataUrlToBlob(texDataUrl));
    zip.file(`assets/${ns}/models/item/${modelId}.json`, JSON.stringify({parent:'item/generated',textures:{layer0:`${ns}:item/${modelId}`}},null,2));
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
          entries: sorted.map(l=>({ threshold:l.cmd, model:{ type:'minecraft:model', model:`${ns}:item/${slug(l.item.name)}` } }))
        }
      },null,2));
    } else {
      // Pre-1.21.4: het oudere override-systeem. Hier MOET het basismodel wel herschreven worden,
      // met de vanilla texture als default-look en per custom_model_data een override naar het
      // eigen model van dat item.
      zip.file(`assets/minecraft/models/item/${base}.json`, JSON.stringify({
        parent:'item/generated', textures:{layer0:`item/${base}`},
        overrides: sorted.map(l=>({predicate:{custom_model_data:l.cmd},model:`${ns}:item/${slug(l.item.name)}`}))
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
Elk item dat je toevoegt krijgt zijn EIGEN model + eigen texture onder
assets/${ns}/models/item/ en assets/${ns}/textures/item/ — dat model verwijst nooit
naar een ander item, het "overlapt zichzelf" (self-contained).
${versionInfo.newItemModelSystem
  ? `Voor 1.21.4+ wordt daarnaast per basisitem (bijv. diamond_sword) een
item-definitie aangemaakt onder assets/minecraft/items/<basisitem>.json. Die verwijst
op basis van custom_model_data door naar het juiste eigen model van jouw item — het
vanilla model van het basisitem zelf (assets/minecraft/models/item/<basisitem>.json)
wordt NIET aangepast en blijft gewoon de fallback-look.`
  : `Voor deze (oudere) versie wordt het vanilla model van het basisitem herschreven met
een "overrides"-lijst die op custom_model_data naar het juiste eigen model van jouw
item verwijst.`}

VERSIE-OPMERKING
Vanaf Minecraft 1.21.9 gebruikt Mojang "min_format"/"max_format" in plaats van een
losse "pack_format" (sinds snapshot 25w31a) — dat is hier al toegepast voor 1.21.10,
1.21.11, 26.1 en 26.2. Dit systeem is relatief nieuw; controleer bij laadproblemen
de exacte syntax op de Minecraft Wiki (Pack format-pagina) voor jouw build.
`);

  return zip;
}
