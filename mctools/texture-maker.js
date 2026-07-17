/* =========================================================================
   TEXTURE PACK MAKER — alleen gebruikt door texture-pack-maker.html
   Werkt met de gedeelde state.textureLibrary (localStorage), dus je kan
   textures die je via Importeren binnenhaalt ook hier terugzien.
   ========================================================================= */
window.IS_DATAPACK_PAGE=false;

const tpState = { packName:'', packVersion:'1.21.8', editingId:null };

function render(){
  const prevWindowScroll=window.scrollY;
  const app=document.getElementById('app');
  app.innerHTML='';
  app.appendChild(renderHeader('tools'));
  const main=document.createElement('main');
  main.appendChild(renderTextureMaker());
  app.appendChild(main);
  app.appendChild(renderFooter());
  if(state.authModal) app.appendChild(renderAuthModal());
  if(state.myPacksModal) app.appendChild(renderMyPacksModal());
  if(state.importModal) app.appendChild(renderImportModal());
  window.scrollTo(0, prevWindowScroll);
}

function renderTextureMaker(){
  const wrap=document.createElement('div');
  wrap.innerHTML=`
    <div style="margin-bottom:4px;">
      <h1 style="font-size:22px;margin:0 0 6px;">🎨 Texture Pack Maker</h1>
      <p style="color:var(--text-dim);font-size:13px;max-width:760px;margin:0 0 18px;line-height:1.6;">
        Reskin bestaande Minecraft-textures: elke texture die je hier tekent of importeert met exact de
        vanilla bestandsnaam (bijv. "diamond_sword") overschrijft die look in-game. Los bestand, los van
        de Datapack Maker — maar dezelfde bibliotheek, dus geïmporteerde textures zie je hier terug.
      </p>
    </div>
    <div class="panel dm-toolbar">
      <div class="pack-name-box"><span class="pn-dot"></span>
        <input type="text" id="tpNameInput" placeholder="Texture pack naam" value="${escapeHtml(tpState.packName)}"
          style="background:transparent;border:none;padding:0;width:180px;font-weight:700;"> ✎
      </div>
      <div class="field" style="max-width:200px;">
        <select id="tpVersionSelect">${VERSIONS.map(v=>`<option value="${v.id}" ${v.id===tpState.packVersion?'selected':''}>${v.label}</option>`).join('')}</select>
      </div>
      <div class="spacer"></div>
      <button class="btn" id="tpImportBtn">📥 Importeren</button>
      <button class="btn gold" id="tpExportBtn">↓ Export texture pack</button>
    </div>

    <div class="panel" style="padding:16px;margin-top:14px;">
      <button class="btn-dashed" id="tpAddNewBtn" style="margin-bottom:14px;">+ Nieuwe texture tekenen</button>
      <div id="tpLibGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;"></div>
    </div>
  `;
  const grid=wrap.querySelector('#tpLibGrid');
  if(!state.textureLibrary.length){
    grid.innerHTML='<div class="empty-hint">Nog geen textures. Teken er een, of importeer een resourcepack.</div>';
  } else {
    state.textureLibrary.forEach(t=>{
      const card=document.createElement('div');
      card.className='item-card';
      card.style.cssText='flex-direction:column;align-items:stretch;text-align:center;cursor:pointer;';
      card.innerHTML=`
        <div class="thumb" style="width:100%;height:80px;margin:0 auto 6px;">${t.dataUrl?`<img src="${t.dataUrl}">`:''}</div>
        <div class="meta"><div class="nm">${escapeHtml(t.name)}</div><div class="sub">${escapeHtml(t.category)}/</div></div>
        <div class="del" style="align-self:flex-end;">✕</div>
      `;
      card.querySelector('.thumb').onclick=()=>{ tpState.editingId=t.id; render(); };
      card.querySelector('.meta').onclick=()=>{ tpState.editingId=t.id; render(); };
      card.querySelector('.del').onclick=(e)=>{ e.stopPropagation(); state.textureLibrary=state.textureLibrary.filter(x=>x.id!==t.id); saveTextureLibrary(); render(); };
      grid.appendChild(card);
    });
  }

  if(tpState.editingId || tpState.editingId==='new') wrap.appendChild(renderTpEditor());

  setTimeout(()=>{
    wrap.querySelector('#tpNameInput').addEventListener('input',e=>{ tpState.packName=e.target.value; });
    wrap.querySelector('#tpVersionSelect').addEventListener('change',e=>{ tpState.packVersion=e.target.value; });
    wrap.querySelector('#tpImportBtn').addEventListener('click',()=>openImportModal());
    wrap.querySelector('#tpExportBtn').addEventListener('click',()=>exportTexturePack());
    wrap.querySelector('#tpAddNewBtn').addEventListener('click',()=>{
      const entry={id:uid('lib'),name:'nieuwe_texture',category:'item',ns:'minecraft',texturePath:'item/nieuwe_texture',dataUrl:null};
      state.textureLibrary.push(entry); saveTextureLibrary();
      tpState.editingId=entry.id; render();
    });
  },0);
  return wrap;
}

function renderTpEditor(){
  const entry=state.textureLibrary.find(t=>t.id===tpState.editingId);
  const box=document.createElement('div');
  box.className='panel';
  box.style.cssText='padding:18px;margin-top:14px;';
  if(!entry){ tpState.editingId=null; return box; }
  box.innerHTML=`
    <div class="field-row">
      <div class="field" style="max-width:220px;"><label>NAAM (= vanilla bestandsnaam om te reskinnen)</label><input type="text" id="tpEntryName" value="${escapeHtml(entry.name)}"></div>
      <div class="field" style="max-width:160px;"><label>CATEGORIE</label>
        <select id="tpEntryCategory">${['item','block','entity','armor','painting','gui','environment'].map(c=>`<option value="${c}" ${entry.category===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="field" style="max-width:160px;"><label>NAMESPACE</label><input type="text" id="tpEntryNs" value="${escapeHtml(entry.ns||'minecraft')}"></div>
      <button class="btn ghost small" id="tpCloseEditorBtn" style="align-self:flex-end;">Sluiten</button>
    </div>
  `;
  const editorHost=document.createElement('div');
  box.appendChild(editorHost);
  editorHost.appendChild(renderGenericTextureEditor(entry));

  setTimeout(()=>{
    box.querySelector('#tpEntryName').addEventListener('change',e=>{ entry.name=slug(e.target.value); saveTextureLibrary(); render(); });
    box.querySelector('#tpEntryCategory').addEventListener('change',e=>{ entry.category=e.target.value; saveTextureLibrary(); render(); });
    box.querySelector('#tpEntryNs').addEventListener('change',e=>{ entry.ns=slug(e.target.value); saveTextureLibrary(); render(); });
    box.querySelector('#tpCloseEditorBtn').addEventListener('click',()=>{ tpState.editingId=null; render(); });
  },0);
  return box;
}

/* renderGenericTextureEditor() zit nu in app.js (gedeeld met de Browse-pagina) */

async function exportTexturePack(){
  if(!tpState.packName.trim()){ showToast('Geef je texture pack eerst een naam.'); return; }
  if(!state.textureLibrary.length){ showToast('Voeg eerst minstens 1 texture toe.'); return; }
  const versionInfo=VERSIONS.find(v=>v.id===tpState.packVersion)||VERSIONS[0];
  const zip=new JSZip();
  zip.file('pack.mcmeta', JSON.stringify(packMcmeta(tpState.packName+' texture pack ('+APP_NAME+')',versionInfo,'resource'),null,2));
  state.textureLibrary.forEach(t=>{
    if(!t.dataUrl) return;
    const ns=t.ns||'minecraft';
    zip.file(`assets/${ns}/textures/${t.category}/${t.name}.png`, dataUrlToBlob(t.dataUrl));
  });
  const blob=await zip.generateAsync({type:'blob'});
  downloadBlob(blob, slug(tpState.packName)+'_texturepack.zip');
  showToast('Texture pack geëxporteerd!');
}

render();
