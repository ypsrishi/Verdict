/* ============================= ADMIN: PARTIES CRUD ============================= */
const PARTY_SYMBOLS = [{value:'symSun',label:'Sun'},{value:'symRings',label:'Rings'},{value:'symQuill',label:'Quill'},{value:'symStar',label:'Star'}];
function openAddPartyForm(){
  openFormSheet({ title:'Add party or group', submitLabel:'Add party', fields:[
    {id:'name', label:'Party / group name', required:true},
    {id:'tag', label:'Short tag (2–4 letters)', placeholder:'e.g. PA'},
    {id:'color', label:'Logo colour', type:'color', value:'#57678C'},
    {id:'sym', label:'Symbol', type:'select', options:PARTY_SYMBOLS},
    {id:'founded', label:'Founded year', inputType:'number', placeholder:'Optional'},
  ], onSubmit:(v)=>{
    const id = 'p_'+Date.now();
    DB.parties.push({ id, name:v.name, tag:(v.tag||v.name.slice(0,3)).toUpperCase(), members:0, founded:v.founded?parseInt(v.founded):null, color:v.color||'#57678C', sym:v.sym||'symStar', active:true });
    logActivity('added party', v.name);
    toast('Party added'); render();
  }});
}
function openEditPartyForm(id){
  const p = findParty(id); if(!p) return;
  openFormSheet({ title:'Edit party', submitLabel:'Save changes', fields:[
    {id:'name', label:'Party / group name', value:p.name, required:true},
    {id:'tag', label:'Short tag (2–4 letters)', value:p.tag},
    {id:'color', label:'Logo colour', type:'color', value:p.color},
    {id:'sym', label:'Symbol', type:'select', value:p.sym, options:PARTY_SYMBOLS},
    {id:'founded', label:'Founded year', inputType:'number', value:p.founded||''},
  ], onSubmit:(v)=>{
    Object.assign(p, { name:v.name, tag:(v.tag||p.tag).toUpperCase(), color:v.color, sym:v.sym, founded:v.founded?parseInt(v.founded):null });
    logActivity('edited party', p.name);
    toast('Party updated'); render();
  }});
}
function togglePartyActive(id){
  const p = findParty(id); if(!p) return;
  p.active = p.active===false ? true : false;
  logActivity(p.active?'activated party':'deactivated party', p.name);
  toast(p.active?'Party activated':'Party deactivated'); render();
}
function partyActionSheet(id){
  const p = findParty(id); if(!p) return;
  const active = p.active !== false;
  openActionSheet({ title:p.name, sub:p.members+' candidates listed', actions:[
    {label:'Edit party', icon:IC.gear(15), onClick:()=>openEditPartyForm(id)},
    {label:'Change logo &amp; symbol', icon:IC.flag(15), onClick:()=>openEditPartyForm(id)},
    {label: active?'Deactivate party':'Activate party', icon:IC.shield(15), onClick:()=>togglePartyActive(id)},
  ]});
}
