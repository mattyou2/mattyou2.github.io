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

/* Generieke pixel-editor voor een texture-library entry (zelfde tool als in de Datapack Maker,
   maar los getrokken zodat 'ie op elk object met .dataUrl kan werken i.p.v. alleen een item). */
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
