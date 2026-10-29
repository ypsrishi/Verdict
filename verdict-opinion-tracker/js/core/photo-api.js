/* ============================= PHOTO API (client for Python /api/photos) =============================
   All photo traffic (profile, candidate and party photos) goes through the
   one Python endpoint. Files are stored in /storage/photos/. If PHP is not running the app keeps
   working and the failure is only logged. */
const PhotoAPI = (()=>{
  const BASE = '/api/photos';
  async function call(fd){
    const r = await fetch(BASE, { method:'POST', body:fd });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Request failed');
    return j;
  }
  async function upload(kind, file, meta={}){
    const fd = new FormData();
    fd.append('action','upload'); fd.append('kind',kind); fd.append('owner', meta.email || '');
    fd.append('photo', file, file.name || (kind+'.jpg'));
    const j = await call(fd);
    AppStorage.write('photo.'+kind, j);
    return j;
  }
  async function list(kind='', owner=''){
    const r = await fetch(BASE+'?action=list&kind='+encodeURIComponent(kind)+'&owner='+encodeURIComponent(owner));
    return r.json();
  }
  async function remove(id){
    const fd = new FormData(); fd.append('action','delete'); fd.append('id',id);
    return call(fd);
  }
  const url = id => BASE+'?action=get&id='+encodeURIComponent(id);
  return { upload, list, remove, url };
})();

/* "Upload a different photo" button in Become a Participant → Photo step. */
function pickPhotoUpload(){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp';
  inp.onchange = async ()=>{
    const f = inp.files && inp.files[0]; if(!f) return;
    try{ await PhotoAPI.upload('profile', f, {email: SessionStore.get().email}); toast('Photo uploaded'); }
    catch(e){ toast('Could not upload photo — ' + e.message); }
  };
  inp.click();
}
