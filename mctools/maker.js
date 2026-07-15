/* =========================================================================
   DATAPACK MAKER — alleen gebruikt door datapack-maker.html
   ========================================================================= */

function render(){
  const app=document.getElementById('app');
  app.innerHTML='';
  app.appendChild(renderHeader('tools'));
  const main=document.createElement('main');
  main.appendChild(renderDatapackMaker());
  app.appendChild(main);
  app.appendChild(renderFooter());

  if(state.modal) app.appendChild(renderAddItemModal());
  if(state.authModal) app.appendChild(renderAuthModal());
  if(state.myPacksModal) app.appendChild(renderMyPacksModal());
}

/* ---------------- toolbar + layout ---------------- */
function renderDatapackMaker(){
  const wrap=document.createElement('div');

  const heading=document.createElement('div');
  heading.style.marginBottom='4px';
  heading.innerHTML=`<h1 style="font-size:22px;margin:0 0 6px;">🪄 Datapack Maker</h1>
    <p style="color:var(--text-dim);font-size:13px;max-width:760px;margin:0 0 18px;line-height:1.6;">
      Voeg hele kleine werelden vol spullen toe — een nieuw erts met tools en harnas, een bes die tot pie
      bakt, vuurbal-toverstaven, eigen muziekplaten, mobs om alles te bewaken. Exporteert als een echte
      datapack + resourcepack. Geen mods nodig, Java ${VERIFIED_VERSION}+.
    </p>`;
  wrap.appendChild(heading);

  const toolbar=document.createElement('div');
  toolbar.className='panel dm-toolbar';
  toolbar.innerHTML=`
    <div class="pack-name-box">
      <span class="pn-dot"></span>
      <input type="text" id="packNameInput" placeholder="Pack naam, bijv. GG Pack" value="${escapeHtml(state.packName)}"
        style="background:transparent;border:none;padding:0;width:180px;font-weight:700;">
      ✎
    </div>
    <div class="pack-slug-box">${slug(state.packName)||'pack_naam'}</div>
    <button class="btn small primary" id="saveDraftBtn">Save</button>
    <div class="field" style="max-width:200px;">
      <select id="packVersionSelect">
        ${VERSIONS.map(v=>`<option value="${v.id}" ${v.id===state.packVersion?'selected':''}>${v.label}</option>`).join('')}
      </select>
    </div>
    <div class="spacer"></div>
    <button class="btn gold" id="exportBtn">↓ Export pack</button>
  `;
  wrap.appendChild(toolbar);

  const versionInfo=VERSIONS.find(v=>v.id===state.packVersion)||VERSIONS[0];
  if(state.packVersion!==VERIFIED_VERSION){
    const warn=document.createElement('div');
    warn.className='version-warning';
    warn.innerHTML=`<div>De hierboven gekozen versie is nog niet volledig getest met custom items —
      <b>${VERIFIED_VERSION}</b> is de geverifieerde keuze.</div>
      <button class="btn small" id="switchVerifiedBtn">Naar ${VERIFIED_VERSION} ✓</button>`;
    wrap.appendChild(warn);
    setTimeout(()=>{
      const b=document.getElementById('switchVerifiedBtn');
      if(b) b.onclick=()=>{ state.packVersion=VERIFIED_VERSION; render(); };
    },0);
  }

  const grid=document.createElement('div');
  grid.className='dm-grid';
  grid.appendChild(renderItemsPanel());
  grid.appendChild(renderEditorPanel());
  wrap.appendChild(grid);

  setTimeout(()=>{
    document.getElementById('packNameInput').addEventListener('input',e=>{
      state.packName=e.target.value;
      document.querySelector('.pack-slug-box').textContent=slug(state.packName)||'pack_naam';
    });
    document.getElementById('packVersionSelect').addEventListener('change',e=>{state.packVersion=e.target.value; render();});
    document.getElementById('exportBtn').addEventListener('click',()=>doExport());
    document.getElementById('saveDraftBtn').addEventListener('click',()=>{
      if(currentUser) saveCurrentPackToCloud(); else { state.authModal={tab:'login',username:'',error:null,loading:false}; render(); }
    });
  },0);

  return wrap;
}

/* ---------------- items panel (links) ---------------- */
function renderItemsPanel(){
  const box=document.createElement('div');
  box.className='panel items-panel';

  const tabs=document.createElement('div');
  tabs.className='tab-row';
  tabs.innerHTML=`<div class="tab-chip on">⚔ Items (${state.items.length})</div><div class="tab-chip">👹 Mobs (0)</div>`;
  box.appendChild(tabs);

  const addBtn=document.createElement('button');
  addBtn.className='btn-dashed addnew';
  addBtn.textContent='+ Iets nieuws toevoegen';
  addBtn.onclick=()=>openAddItemModal();
  box.appendChild(addBtn);

  if(state.items.length===0){
    const e=document.createElement('div');
    e.className='empty-hint';
    e.innerHTML='Nog geen items.<br>Klik op <b>+ Iets nieuws toevoegen</b> om te beginnen.';
    box.appendChild(e);
    return box;
  }

  const sets={};
  const order=[];
  state.items.forEach(it=>{
    const key=it.setId||it.id;
    if(!sets[key]){ sets[key]={label:it.setLabel||it.name,color:it.color,items:[]}; order.push(key); }
    sets[key].items.push(it);
  });
  order.forEach(key=>{
    const g=sets[key];
    const group=document.createElement('div');
    group.className='set-group';
    group.innerHTML=`<div class="set-title"><span class="dot" style="background:${mcColorHex(g.color)}"></span>${escapeHtml(g.label)}<span class="badge">${g.items.length} stuk${g.items.length>1?'ken':''}</span></div>`;
    const list=document.createElement('div');
    g.items.forEach(it=>{
      const card=document.createElement('div');
      card.className='item-card'+(state.selectedItemId===it.id?' selected':'');
      const abilBadge = it.abilities.length ? `<span class="ab-pill">${ABILITY_DEFS[it.abilities[0].type].label}</span>` : '';
      card.innerHTML=`
        <div class="thumb">${it.texture?`<img src="${it.texture}">`:''}</div>
        <div class="meta">
          <div class="nm" style="color:${mcColorHex(it.color)}">${escapeHtml(it.name)}</div>
          <div class="sub">${prettyName(it.baseItem)}</div>
        </div>
        ${abilBadge}
        <div class="del" title="Verwijderen">✕</div>
      `;
      card.querySelector('.meta').onclick=()=>{state.selectedItemId=it.id; render();};
      card.querySelector('.thumb').onclick=()=>{state.selectedItemId=it.id; render();};
      card.querySelector('.del').onclick=(e)=>{
        e.stopPropagation();
        state.items=state.items.filter(x=>x.id!==it.id);
        if(state.selectedItemId===it.id) state.selectedItemId=null;
        render();
      };
      list.appendChild(card);
    });
    group.appendChild(list);
    box.appendChild(group);
  });
  return box;
}
function refreshItemsPanelInPlace(){
  const old=document.querySelector('.items-panel');
  if(!old) return;
  old.replaceWith(renderItemsPanel());
}

/* ---------------- editor panel (rechts) ---------------- */
function renderEditorPanel(){
  const box=document.createElement('div');
  box.className='panel editor-panel';
  const item=state.items.find(i=>i.id===state.selectedItemId);
  if(!item){
    box.innerHTML=`<div class="placeholder">Selecteer een item links om te bewerken,<br>of maak een nieuw item aan.</div>`;
    return box;
  }
  const scroll=document.createElement('div');
  scroll.className='editor-scroll';

  const head=document.createElement('div');
  head.className='editor-head';
  head.innerHTML=`
    <div class="thumb-col">
      <div class="bigthumb" id="bigThumb">${item.texture?`<img src="${item.texture}">`:''}</div>
    </div>
    <div class="hd-fields">
      <div class="hd-top-row">
        <div class="field" style="max-width:340px;"><label>NAAM</label><input type="text" id="itNameInput" value="${escapeHtml(item.name)}"></div>
        <button class="btn danger small" id="deleteItemBtn">Delete</button>
      </div>
      <div class="field-row">
        <div class="field"><label>BASIS ITEM</label><input type="text" value="${prettyName(item.baseItem)}" disabled></div>
      </div>
      <label>NAAMKLEUR</label>
      <div class="color-swatches" id="colorSwatches">
        ${MC_COLORS.map(c=>`<div class="swatch ${item.color===c.code?'active':''}" data-code="${c.code}" style="background:${c.hex}" title="${c.code}"></div>`).join('')}
      </div>
      <div class="format-toggles">
        <div class="toggle-chip ${item.bold?'on':''}" data-f="bold"><b>B</b></div>
        <div class="toggle-chip ${item.italic?'on':''}" data-f="italic"><i>I</i></div>
        <div class="toggle-chip ${item.underline?'on':''}" data-f="underline"><u>U</u></div>
      </div>
      <div class="name-preview" id="namePreview"></div>
    </div>
  `;
  scroll.appendChild(head);
  function refreshPreview(){
    const p=head.querySelector('#namePreview');
    p.textContent=item.name;
    p.style.color=mcColorHex(item.color);
    p.style.fontWeight=item.bold?'bold':'normal';
    p.style.fontStyle=item.italic?'italic':'normal';
    p.style.textDecoration=item.underline?'underline':'none';
  }
  refreshPreview();

  scroll.appendChild(sectionTitle('Texture','Teken de pixelart voor dit item (16×16). Achtergrond = doorzichtig.'));
  scroll.appendChild(renderTextureEditor(item));

  scroll.appendChild(sectionTitle('Ability','Optioneel — hier worden items magisch. Kies er één of meer.'));
  scroll.appendChild(renderAbilitySection(item));

  scroll.appendChild(sectionTitle('Crafting recipe','Optioneel — hoe spelers dit item craften in survival.'));
  scroll.appendChild(renderRecipeSection(item));

  scroll.appendChild(renderAdvancedAccordion(item));

  box.appendChild(scroll);

  setTimeout(()=>{
    head.querySelector('#itNameInput').addEventListener('input',e=>{ item.name=e.target.value; refreshPreview(); refreshItemsPanelInPlace(); });
    head.querySelector('#deleteItemBtn').addEventListener('click',()=>{
      state.items=state.items.filter(x=>x.id!==item.id);
      state.selectedItemId=null; render();
    });
    head.querySelectorAll('#colorSwatches .swatch').forEach(s=>{ s.onclick=()=>{item.color=s.dataset.code; render();}; });
    head.querySelectorAll('.toggle-chip').forEach(chip=>{ chip.onclick=()=>{ item[chip.dataset.f]=!item[chip.dataset.f]; render(); }; });
  },0);

  return box;
}
function sectionTitle(title,desc){
  const s=document.createElement('div');
  s.className='section';
  s.innerHTML=`<h4>${title}</h4>${desc?`<div class="sub-desc">${desc}</div>`:''}`;
  return s;
}

/* ---------------- Ability section ---------------- */
function renderAbilitySection(item){
  const d=document.createElement('div');
  const grid=document.createElement('div');
  grid.className='ability-grid';
  Object.entries(ABILITY_DEFS).forEach(([type,def])=>{
    const active=item.abilities.find(a=>a.type===type);
    const tile=document.createElement('div');
    tile.className='ability-tile'+(active?' on':'');
    tile.innerHTML=`
      <div class="at-h"><b>${def.label}</b><span class="trig">${def.trigLabel}</span></div>
      <p>${def.desc}</p>
      ${active?`<div class="ability-params">${def.params.map(p=>`
        <div class="field"><label>${p.label}</label>
          <input type="number" min="${p.min}" max="${p.max}" value="${active.params[p.k]}" data-p="${p.k}">
        </div>`).join('')}</div>`:''}
    `;
    tile.onclick=(e)=>{
      if(e.target.tagName==='INPUT') return;
      if(active){ item.abilities=item.abilities.filter(a=>a.type!==type); }
      else {
        const params={}; def.params.forEach(p=>params[p.k]=p.def);
        item.abilities.push({type,params});
      }
      render(); refreshItemsPanelInPlace();
    };
    if(active){
      setTimeout(()=>{
        tile.querySelectorAll('input[data-p]').forEach(inp=>{
          inp.addEventListener('click',e=>e.stopPropagation());
          inp.addEventListener('change',e=>{ active.params[e.target.dataset.p]=parseFloat(e.target.value)||0; });
        });
      },0);
    }
    grid.appendChild(tile);
  });
  d.appendChild(grid);
  return d;
}

/* ---------------- Recipe section ---------------- */
function renderRecipeSection(item){
  const d=document.createElement('div');
  const r=item.recipe;
  d.innerHTML=`
    <div class="checkbox-line"><input type="checkbox" id="recipeEnabledChk" ${r.enabled?'checked':''}><label style="margin:0;">Recipe aanzetten</label></div>
    <div id="recipeBody" style="${r.enabled?'':'display:none;'}">
      <div class="recipe-tabs">
        <div class="recipe-tab ${r.shaped?'on':''}" data-s="1">Shaped (exact layout)</div>
        <div class="recipe-tab ${!r.shaped?'on':''}" data-s="0">Shapeless (any layout)</div>
      </div>
      <div class="recipe-wrap">
        <div class="recipe-grid" id="recipeGrid">
          ${r.grid.map((v,i)=>`<div class="recipe-slot"><input type="text" data-i="${i}" value="${escapeHtml(v)}" placeholder="–"></div>`).join('')}
        </div>
        <div class="recipe-arrow">→</div>
        <div class="field" style="max-width:90px;"><label>Makes</label><input type="number" id="recipeCount" min="1" value="${r.count}"></div>
      </div>
      <div class="hint-box">Typ elk vanilla item-id — blokken kunnen ook (stone, oak_planks…) — of een #tag zoals #planks. Laat een vakje leeg voor geen ingrediënt daar.</div>
    </div>
  `;
  setTimeout(()=>{
    d.querySelector('#recipeEnabledChk').onchange=e=>{ r.enabled=e.target.checked; d.querySelector('#recipeBody').style.display=r.enabled?'':'none'; refreshItemsPanelInPlace(); };
    d.querySelectorAll('.recipe-tab').forEach(t=>{ t.onclick=()=>{ r.shaped=t.dataset.s==='1'; render(); }; });
    d.querySelectorAll('#recipeGrid input').forEach(inp=>{ inp.addEventListener('change',e=>{ r.grid[+e.target.dataset.i]=e.target.value.trim(); }); });
    d.querySelector('#recipeCount').addEventListener('change',e=>{ r.count=parseInt(e.target.value)||1; });
  },0);
  return d;
}

/* ---------------- Advanced accordion ---------------- */
function renderAdvancedAccordion(item){
  const acc=document.createElement('div');
  acc.className='accordion section';
  const head=document.createElement('div');
  head.className='accordion-head';
  head.innerHTML=`<span>Advanced — stats, enchantments &amp; more</span><span class="chev">▶</span>`;
  head.onclick=()=>{ acc.classList.toggle('open'); };
  acc.appendChild(head);
  const body=document.createElement('div');
  body.className='accordion-body';
  body.appendChild(renderAdvancedSection(item));
  acc.appendChild(body);
  return acc;
}

function renderAdvancedSection(item){
  const d=document.createElement('div');
  const attrList=item.attributes.map((a,i)=>`
    <div class="row-item" data-i="${i}">
      <select class="a-attr">${ATTRIBUTES.map(at=>`<option value="${at.id}" ${a.attribute===at.id?'selected':''}>${at.label}</option>`).join('')}</select>
      <input type="number" class="a-amount" value="${a.amount}" step="0.1">
      <select class="a-op">${OPERATIONS.map(op=>`<option value="${op.id}" ${a.operation===op.id?'selected':''}>${op.label}</option>`).join('')}</select>
      <select class="a-slot">${SLOTS.map(s=>`<option value="${s.id}" ${a.slot===s.id?'selected':''}>${s.label}</option>`).join('')}</select>
      <span class="rm">✕</span>
    </div>`).join('');
  const enchList=item.enchants.map((e,i)=>`
    <div class="row-item" data-i="${i}">
      <select class="e-id">${ENCHANTMENTS.map(en=>`<option value="${en.id}" ${e.id===en.id?'selected':''}>${prettyName(en.id)}</option>`).join('')}</select>
      <input type="number" class="e-lvl" value="${e.level}" min="1" max="${(ENCHANTMENTS.find(x=>x.id===e.id)||{max:5}).max}" style="max-width:70px;">
      <span class="rm">✕</span>
    </div>`).join('');

  d.innerHTML=`
    <div class="subheading">Tooltip lines — flavor text onder de naam, één per regel</div>
    <textarea id="tooltipInput" placeholder="bijv. Gesmeed in drakenvuur">${escapeHtml(item.misc.tooltip)}</textarea>

    <div class="field-row" style="margin-top:14px;align-items:center;">
      <div class="checkbox-line" style="margin:0;"><input type="checkbox" id="glintChk" ${item.misc.glint?'checked':''}><label style="margin:0;">Enchant glint (shimmer)</label></div>
      <div class="field" style="max-width:160px;"><label>Rarity</label>
        <select id="raritySelect">${['common','uncommon','rare','epic'].map(r=>`<option value="${r}" ${item.misc.rarity===r?'selected':''}>${r}</option>`).join('')}</select>
      </div>
    </div>

    <div class="subheading">Durability &amp; stacking</div>
    <div class="field-row">
      <div class="field"><label>Durability (leeg = stackt i.p.v. slijtage)</label><input type="number" id="durInput" value="${item.durability.value}"></div>
      <div class="field"><label>Max stack</label><input type="number" id="stackInput" value="${item.durability.maxStack}"></div>
      <div class="checkbox-line" style="align-self:center;"><input type="checkbox" id="unbreakableChk" ${item.durability.unbreakable?'checked':''}><label style="margin:0;">Unbreakable</label></div>
    </div>
    <div class="checkbox-line"><input type="checkbox" id="fireResChk" ${item.durability.fireResistant?'checked':''}><label style="margin:0;">Fire-resistant (overleeft lava als dropped item)</label></div>

    <div class="subheading">Attributen — actief zolang het item vastgehouden/gedragen wordt</div>
    <div class="row-list" id="attrList">${item.attributes.length?attrList:'<div class="empty-hint" style="padding:10px;">Nog geen attributen.</div>'}</div>
    <button class="btn small primary" id="addAttrBtn">+ Attribuut toevoegen</button>

    <div class="subheading">Enchantments — al aanwezig bij craften/geven</div>
    <div class="row-list" id="enchList">${item.enchants.length?enchList:'<div class="empty-hint" style="padding:10px;">Nog geen enchantments.</div>'}</div>
    <button class="btn small primary" id="addEnchBtn">+ Enchantment toevoegen</button>

    <div class="subheading">Eetbaar</div>
    <div class="checkbox-line"><input type="checkbox" id="edibleChk" ${item.misc.edible?'checked':''}><label style="margin:0;">Maak eetbaar</label></div>

    <div class="subheading">Overige eigenschappen</div>
    <div class="field-row">
      <div class="field"><label>Wearable slot</label>
        <select id="wearableSelect">${['none','head','chest','legs','feet','offhand'].map(s=>`<option value="${s}" ${item.misc.wearableSlot===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Use cooldown (sec)</label><input type="number" id="cooldownInput" value="${item.misc.useCooldown}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Enchantability (tafel-rol kwaliteit)</label><input type="number" id="enchantabilityInput" value="${item.misc.enchantability}"></div>
      <div class="field"><label>Repair cost (aanbeeld-boete)</label><input type="number" id="repairCostInput" value="${item.misc.repairCost}"></div>
    </div>
    <div class="checkbox-line"><input type="checkbox" id="gliderChk" ${item.misc.glider?'checked':''}><label style="margin:0;">Glider (elytra-vlucht bij dragen)</label></div>
    <div class="checkbox-line"><input type="checkbox" id="reviveChk" ${item.misc.reviveOnDeath?'checked':''}><label style="margin:0;">Revive on death (zoals een totem, bij vasthouden)</label></div>
    <div class="field" style="max-width:220px;"><label>Dye tint (leather-stijl kleur)</label><input type="color" id="dyeTintInput" value="${item.misc.dyeTint||'#a06540'}"></div>

    <div class="hint-box">In-game (met geëxporteerde datapack actief): <code>/function ${slug(state.packName)||'..'}:give_${slug(item.name)}</code></div>
  `;

  setTimeout(()=>{
    d.querySelector('#tooltipInput').onchange=e=>{ item.misc.tooltip=e.target.value; };
    d.querySelector('#glintChk').onchange=e=>{ item.misc.glint=e.target.checked; };
    d.querySelector('#raritySelect').onchange=e=>{ item.misc.rarity=e.target.value; };
    d.querySelector('#durInput').onchange=e=>{ item.durability.value=e.target.value; };
    d.querySelector('#stackInput').onchange=e=>{ item.durability.maxStack=e.target.value; };
    d.querySelector('#unbreakableChk').onchange=e=>{ item.durability.unbreakable=e.target.checked; };
    d.querySelector('#fireResChk').onchange=e=>{ item.durability.fireResistant=e.target.checked; };
    d.querySelector('#edibleChk').onchange=e=>{ item.misc.edible=e.target.checked; };
    d.querySelector('#wearableSelect').onchange=e=>{ item.misc.wearableSlot=e.target.value; };
    d.querySelector('#cooldownInput').onchange=e=>{ item.misc.useCooldown=e.target.value; };
    d.querySelector('#enchantabilityInput').onchange=e=>{ item.misc.enchantability=e.target.value; };
    d.querySelector('#repairCostInput').onchange=e=>{ item.misc.repairCost=e.target.value; };
    d.querySelector('#gliderChk').onchange=e=>{ item.misc.glider=e.target.checked; };
    d.querySelector('#reviveChk').onchange=e=>{ item.misc.reviveOnDeath=e.target.checked; };
    d.querySelector('#dyeTintInput').onchange=e=>{ item.misc.dyeTint=e.target.value; };

    d.querySelector('#addAttrBtn').onclick=()=>{ item.attributes.push({attribute:ATTRIBUTES[0].id,amount:1,operation:'add_value',slot:'mainhand'}); render(); };
    d.querySelectorAll('#attrList .row-item').forEach(row=>{
      const i=+row.dataset.i;
      row.querySelector('.a-attr').onchange=e=>{item.attributes[i].attribute=e.target.value;};
      row.querySelector('.a-amount').onchange=e=>{item.attributes[i].amount=parseFloat(e.target.value)||0;};
      row.querySelector('.a-op').onchange=e=>{item.attributes[i].operation=e.target.value;};
      row.querySelector('.a-slot').onchange=e=>{item.attributes[i].slot=e.target.value;};
      row.querySelector('.rm').onclick=()=>{item.attributes.splice(i,1); render();};
    });
    d.querySelector('#addEnchBtn').onclick=()=>{ item.enchants.push({id:ENCHANTMENTS[0].id,level:1}); render(); };
    d.querySelectorAll('#enchList .row-item').forEach(row=>{
      const i=+row.dataset.i;
      row.querySelector('.e-id').onchange=e=>{item.enchants[i].id=e.target.value;};
      row.querySelector('.e-lvl').onchange=e=>{item.enchants[i].level=parseInt(e.target.value)||1;};
      row.querySelector('.rm').onclick=()=>{item.enchants.splice(i,1); render();};
    });
  },0);

  return d;
}

/* ---------------- Texture editor ---------------- */
const PIXEL_SIZE=16;
const PIXEL_SCALE=20;
function renderTextureEditor(item){
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
    <div class="hint-box">Achtergrond = doorzichtig. 16×16 canvas, uitvergroot. Er zit geen vanilla
    Minecraft-texture voorgeladen (auteursrecht) — teken zelf of upload een eigen afbeelding als basis.</div>
  `;
  const canvasWrap=document.createElement('div');
  const canvas=document.createElement('canvas');
  canvas.id='pixelCanvas';
  canvas.width=PIXEL_SIZE*PIXEL_SCALE; canvas.height=PIXEL_SIZE*PIXEL_SCALE;
  canvasWrap.appendChild(canvas);
  d.appendChild(toolcol); d.appendChild(canvasWrap);

  setTimeout(()=>{
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    let buf=document.createElement('canvas'); buf.width=16; buf.height=16;
    let bctx=buf.getContext('2d');
    if(item.texture){
      const img=new Image();
      img.onload=()=>{ bctx.clearRect(0,0,16,16); bctx.drawImage(img,0,0,16,16); redraw(); };
      img.src=item.texture;
    }
    function redraw(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(buf,0,0,16,16,0,0,canvas.width,canvas.height);
      ctx.strokeStyle='rgba(0,0,0,0.15)';
      for(let i=0;i<=PIXEL_SIZE;i++){
        ctx.beginPath();ctx.moveTo(i*PIXEL_SCALE,0);ctx.lineTo(i*PIXEL_SCALE,canvas.height);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,i*PIXEL_SCALE);ctx.lineTo(canvas.width,i*PIXEL_SCALE);ctx.stroke();
      }
    }
    function saveToItem(){
      item.texture=buf.toDataURL('image/png');
      const bigThumb=document.getElementById('bigThumb');
      if(bigThumb) bigThumb.innerHTML=`<img src="${item.texture}">`;
    }
    redraw();

    let tool='pencil'; let color='#ff5555';
    toolcol.querySelectorAll('.pixel-tool-btn').forEach(b=>{
      b.onclick=()=>{ toolcol.querySelectorAll('.pixel-tool-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); tool=b.dataset.tool; };
    });
    const colorInput=toolcol.querySelector('#colorPickerInput');
    const hexInput=toolcol.querySelector('#hexInput');
    const colorBox=toolcol.querySelector('#curColorBox');
    function setColor(hex){
      if(!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
      color=hex; colorInput.value=hex; hexInput.value=hex; colorBox.style.background=hex;
    }
    colorInput.addEventListener('input',e=>setColor(e.target.value));
    hexInput.addEventListener('change',e=>setColor(e.target.value.startsWith('#')?e.target.value:'#'+e.target.value));

    toolcol.querySelector('#uploadImgInput').addEventListener('change',e=>{
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=ev=>{
        const img=new Image();
        img.onload=()=>{ bctx.clearRect(0,0,16,16); bctx.drawImage(img,0,0,16,16); redraw(); saveToItem(); refreshItemsPanelInPlace(); };
        img.src=ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    toolcol.querySelector('#clearCanvasBtn').onclick=()=>{ bctx.clearRect(0,0,16,16); redraw(); saveToItem(); refreshItemsPanelInPlace(); };

    function px(e){
      const rect=canvas.getBoundingClientRect();
      const x=Math.floor((e.clientX-rect.left)/(rect.width/PIXEL_SIZE));
      const y=Math.floor((e.clientY-rect.top)/(rect.height/PIXEL_SIZE));
      return [Math.max(0,Math.min(15,x)),Math.max(0,Math.min(15,y))];
    }
    function hexToRgba(hex){ const v=parseInt(hex.slice(1),16); return [(v>>16)&255,(v>>8)&255,v&255,255]; }
    function floodFill(sx,sy,fillColor){
      const data=bctx.getImageData(0,0,16,16);
      const idx=(x,y)=>(y*16+x)*4;
      const target=data.data.slice(idx(sx,sy),idx(sx,sy)+4);
      const fc=hexToRgba(fillColor);
      if(target[0]===fc[0]&&target[1]===fc[1]&&target[2]===fc[2]&&target[3]===fc[3]) return;
      const stack=[[sx,sy]];
      while(stack.length){
        const [x,y]=stack.pop();
        if(x<0||x>15||y<0||y>15) continue;
        const i=idx(x,y);
        if(data.data[i]!==target[0]||data.data[i+1]!==target[1]||data.data[i+2]!==target[2]||data.data[i+3]!==target[3]) continue;
        data.data[i]=fc[0];data.data[i+1]=fc[1];data.data[i+2]=fc[2];data.data[i+3]=fc[3];
        stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
      }
      bctx.putImageData(data,0,0);
    }
    let painting=false;
    function act(e){
      const [x,y]=px(e);
      if(tool==='pencil'){ bctx.clearRect(x,y,1,1); bctx.fillStyle=color; bctx.fillRect(x,y,1,1); }
      else if(tool==='eraser'){ bctx.clearRect(x,y,1,1); }
      else if(tool==='bucket'){ floodFill(x,y,color); }
      else if(tool==='eyedrop'){
        const d2=bctx.getImageData(x,y,1,1).data;
        if(d2[3]>0){ setColor('#'+[d2[0],d2[1],d2[2]].map(n=>n.toString(16).padStart(2,'0')).join('')); }
      }
      redraw(); saveToItem();
    }
    canvas.addEventListener('mousedown',e=>{ painting=true; act(e); });
    canvas.addEventListener('mousemove',e=>{ if(painting && (tool==='pencil'||tool==='eraser')) act(e); });
    window.addEventListener('mouseup',()=>{ if(painting){ painting=false; refreshItemsPanelInPlace(); } });
  },0);

  return d;
}

/* =========================================================================
   ADD ITEM MODAL — "Wat wil je maken?"
   ========================================================================= */
function openAddItemModal(){
  state.modal={step:1,type:null,name:'',color:'white',bold:false,italic:false,underline:false,
    singleBase:ALL_BASE_ITEMS[0], weaponBase:VANILLA_ITEMS['Zwaarden'][0],
    armorMaterial:'diamond', setPicks:new Set([ALL_BASE_ITEMS[0]])
  };
  render();
}
function closeModal(){ state.modal=null; render(); }

const TYPE_CHOICES=[
  {t:'single',icon:'🗡️',n:'Los item',d:'Eén item op zichzelf — gem, snack of bijzonder voorwerp.'},
  {t:'weapon',icon:'⚔️',n:'Wapen',d:'Een los wapen gebaseerd op een zwaard, tool of afstandswapen.'},
  {t:'armor_set',icon:'🛡️',n:'Armor set',d:'Vier bij elkaar horende stukken met dezelfde look.'},
  {t:'item_set',icon:'💎',n:'Item-set',d:'Bijv. een nieuw erts — meerdere basis-items, één naam en kleur.'},
];

function renderAddItemModal(){
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.onclick=(e)=>{ if(e.target===overlay) closeModal(); };
  const box=document.createElement('div');
  box.className='panel modal-box wide';
  overlay.appendChild(box);
  const m=state.modal;
  if(m.step===1) box.appendChild(modalStepType());
  else box.appendChild(modalStepDetails());
  return overlay;
}

function modalStepType(){
  const d=document.createElement('div');
  const m=state.modal;
  d.innerHTML=`
    <h2>Wat wil je maken?</h2>
    <div class="type-choice-grid">
      ${TYPE_CHOICES.map(c=>`
        <div class="type-choice ${m.type===c.t?'selected':''}" data-t="${c.t}">
          <div class="ti">${c.icon}</div><div class="tn">${c.n}</div><div class="td">${c.d}</div>
        </div>`).join('')}
    </div>
    <div class="field-row" style="margin-top:18px;justify-content:flex-end;">
      <button class="btn ghost" id="cancelModalBtn">Annuleren</button>
      <button class="btn primary" id="nextModalBtn" ${m.type?'':'disabled'}>Volgende →</button>
    </div>
  `;
  setTimeout(()=>{
    d.querySelectorAll('.type-choice').forEach(c=>{ c.onclick=()=>{ state.modal.type=c.dataset.t; render(); }; });
    d.querySelector('#cancelModalBtn').onclick=closeModal;
    d.querySelector('#nextModalBtn').onclick=()=>{ if(state.modal.type){ state.modal.step=2; render(); } };
  },0);
  return d;
}

function modalStepDetails(){
  const d=document.createElement('div');
  const m=state.modal;
  let inner='';
  if(m.type==='single'){
    inner=`<label>BASIS ITEM</label><select id="baseSelect">${ALL_BASE_ITEMS.map(it=>`<option value="${it}" ${it===m.singleBase?'selected':''}>${prettyName(it)}</option>`).join('')}</select>
      <label style="margin-top:12px;">NAAM</label><input type="text" id="nameInput" placeholder="bijv. GG Appel" value="${escapeHtml(m.name)}">`;
  } else if(m.type==='weapon'){
    inner=`<label>BASIS WAPEN</label><select id="baseSelect">${[...VANILLA_ITEMS['Zwaarden'],...VANILLA_ITEMS['Gereedschap'],...VANILLA_ITEMS['Wapens op afstand']].map(it=>`<option value="${it}" ${it===m.weaponBase?'selected':''}>${prettyName(it)}</option>`).join('')}</select>
      <label style="margin-top:12px;">NAAM</label><input type="text" id="nameInput" placeholder="bijv. GG" value="${escapeHtml(m.name)}">
      <div class="hint-box">Uiteindelijke naam wordt: <b id="finalNamePreview"></b></div>`;
  } else if(m.type==='armor_set'){
    inner=`<label>MATERIAAL-STIJL (voor alle 4 stukken)</label>
      <select id="armorMaterialSelect">${['leather','chainmail','iron','golden','diamond','netherite'].map(mat=>`<option value="${mat}" ${mat===m.armorMaterial?'selected':''}>${prettyName(mat)}</option>`).join('')}</select>
      <label style="margin-top:12px;">NAAM VAN DE SET</label><input type="text" id="nameInput" placeholder="bijv. GG" value="${escapeHtml(m.name)}">
      <div class="hint-box">Er worden 4 items gemaakt: <b id="finalNamePreview"></b> Helmet / Chestplate / Leggings / Boots</div>`;
  } else if(m.type==='item_set'){
    inner=`<label>KIES BASIS-ITEMS VOOR DE SET</label>
      <div class="checklist" id="setChecklist">${ALL_BASE_ITEMS.map(it=>`<label><input type="checkbox" value="${it}" ${m.setPicks.has(it)?'checked':''}> ${prettyName(it)}</label>`).join('')}</div>
      <label style="margin-top:12px;">NAAM VAN DE SET</label><input type="text" id="nameInput" placeholder="bijv. Ruby" value="${escapeHtml(m.name)}">`;
  }
  d.innerHTML=`
    <h2>Details</h2>${inner}
    <label style="margin-top:14px;">NAAMKLEUR</label>
    <div class="color-swatches" id="colorSwatches">${MC_COLORS.map(c=>`<div class="swatch ${m.color===c.code?'active':''}" data-code="${c.code}" style="background:${c.hex}" title="${c.code}"></div>`).join('')}</div>
    <div class="format-toggles">
      <div class="toggle-chip ${m.bold?'on':''}" data-f="bold"><b>B</b></div>
      <div class="toggle-chip ${m.italic?'on':''}" data-f="italic"><i>I</i></div>
      <div class="toggle-chip ${m.underline?'on':''}" data-f="underline"><u>U</u></div>
    </div>
    <div class="name-preview" id="namePreview"></div>
    <div class="field-row" style="margin-top:18px;justify-content:flex-end;">
      <button class="btn ghost" id="backModalBtn">← Terug</button>
      <button class="btn primary" id="createModalBtn">Aanmaken</button>
    </div>
  `;
  function suffixFor(type){ return type==='armor_set' ? ' Armor' : ''; }
  function refresh(){
    const preview=d.querySelector('#namePreview');
    const finalName = m.name ? (m.name + suffixFor(m.type)) : '(vul een naam in)';
    preview.textContent=finalName;
    preview.style.color=mcColorHex(m.color);
    preview.style.fontWeight=m.bold?'bold':'normal';
    preview.style.fontStyle=m.italic?'italic':'normal';
    preview.style.textDecoration=m.underline?'underline':'none';
    const fp=d.querySelector('#finalNamePreview'); if(fp) fp.textContent=finalName;
  }
  refresh();
  setTimeout(()=>{
    const nameInput=d.querySelector('#nameInput');
    if(nameInput) nameInput.addEventListener('input',e=>{ m.name=e.target.value; refresh(); });
    const baseSelect=d.querySelector('#baseSelect');
    if(baseSelect) baseSelect.addEventListener('change',e=>{ if(m.type==='single') m.singleBase=e.target.value; if(m.type==='weapon') m.weaponBase=e.target.value; });
    const armorMaterialSelect=d.querySelector('#armorMaterialSelect');
    if(armorMaterialSelect) armorMaterialSelect.addEventListener('change',e=>{ m.armorMaterial=e.target.value; });
    const setChecklist=d.querySelector('#setChecklist');
    if(setChecklist) setChecklist.addEventListener('change',e=>{ if(e.target.checked) m.setPicks.add(e.target.value); else m.setPicks.delete(e.target.value); });
    d.querySelectorAll('#colorSwatches .swatch').forEach(s=>{ s.onclick=()=>{ m.color=s.dataset.code; d.querySelectorAll('#colorSwatches .swatch').forEach(x=>x.classList.remove('active')); s.classList.add('active'); refresh(); }; });
    d.querySelectorAll('.toggle-chip').forEach(chip=>{ chip.onclick=()=>{ chip.classList.toggle('on'); m[chip.dataset.f]=chip.classList.contains('on'); refresh(); }; });
    d.querySelector('#backModalBtn').onclick=()=>{ state.modal.step=1; render(); };
    d.querySelector('#createModalBtn').onclick=()=>{ createItemsFromModal(); };
  },0);
  return d;
}

function newRecipe(){ return {enabled:false,shaped:true,grid:['','','','','','','','',''],count:1}; }
function newMisc(){ return {tooltip:'',glint:false,rarity:'common',edible:false,wearableSlot:'none',useCooldown:'',enchantability:'',repairCost:'',glider:false,reviveOnDeath:false,dyeTint:''}; }
function newDurability(){ return {value:'',maxStack:'',unbreakable:false,fireResistant:false}; }

function createItemsFromModal(){
  const m=state.modal;
  if(!m.name || !m.name.trim()){ showToast('Geef eerst een naam op.'); return; }
  function baseItemObj(baseItem,name,armorSlot){
    return {
      id:uid('item'), setId:null, setLabel:null, baseItem, armorSlot:armorSlot||null,
      name, color:m.color, bold:m.bold, italic:m.italic, underline:m.underline,
      texture:null, attributes:[], enchants:[], abilities:[], recipe:newRecipe(), misc:newMisc(), durability:newDurability()
    };
  }
  if(m.type==='single'){
    const it=baseItemObj(m.singleBase, m.name); state.items.push(it); state.selectedItemId=it.id;
  } else if(m.type==='weapon'){
    const it=baseItemObj(m.weaponBase, m.name); state.items.push(it); state.selectedItemId=it.id;
  } else if(m.type==='armor_set'){
    const setId=uid('set'); const setLabel=m.name+' Armor';
    const pieceNames={helmet:'Helmet',chestplate:'Chestplate',leggings:'Leggings',boots:'Boots'};
    let first=null;
    ARMOR_SLOTS.forEach(as=>{
      const base=guessArmorBase(m.armorMaterial, as.slot);
      const it=baseItemObj(base, m.name+' '+pieceNames[as.slot], as.eq);
      it.setId=setId; it.setLabel=setLabel;
      it.attributes.push({attribute:'armor',amount:2,operation:'add_value',slot:as.eq});
      state.items.push(it); if(!first) first=it;
    });
    state.selectedItemId=first.id;
  } else if(m.type==='item_set'){
    const setId=uid('set'); const setLabel=m.name;
    const picks=Array.from(m.setPicks);
    if(picks.length===0){ showToast('Kies minimaal 1 basis-item voor de set.'); return; }
    let first=null;
    picks.forEach(base=>{
      const it=baseItemObj(base, m.name+' '+prettyName(base));
      it.setId=setId; it.setLabel=setLabel; state.items.push(it); if(!first) first=it;
    });
    state.selectedItemId=first.id;
  }
  state.modal=null;
  render();
  showToast('Item(s) aangemaakt! Bewerk texture, ability, recipe & stats rechts.');
}

/* boot */
render();
