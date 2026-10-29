/* ============================= ACTIVITY LOG HELPER =============================
   Every admin mutation funnels through here so the activity log stays a faithful record of what
   changed. Entries carry a real timestamp (`at`) and are saved to the server with everything else. */
const adminName = () => (Ctx.admin && Ctx.admin.name) || 'Admin';
function logActivity(action, target){
  DB.activity.unshift({ id:'g_'+Date.now()+Math.random().toString(36).slice(2,6), actor:'Admin — '+adminName(), action, target, time:'', at:Date.now() });
}

/* ============================= NOTIFICATION HELPERS =============================
   pushUserNotification feeds the participant bell. Pass `to` (an email address) for a personal
   message — the server only shows it to that person; without `to` it is a broadcast.
   pushAdminNotification feeds the admin bell. */
function pushUserNotification(title, body, type='info', to=null){
  const n = { id:'n_'+Date.now()+Math.random().toString(36).slice(2,6), title, body, time:'', at:Date.now(), type, read:false };
  if(to) n.to = to;
  DB.notifications.unshift(n);
}
function pushAdminNotification(title, body, type='info'){
  DB.adminNotifications.unshift({ id:'an_'+Date.now()+Math.random().toString(36).slice(2,6), title, body, time:'', at:Date.now(), type, read:false });
}
/* A participant's "read" state is private to their browser; an admin's is shared. */
function rememberRead(ids){
  const seen = new Set(AppStorage.read('readNotifs') || []); ids.forEach(i=>seen.add(i));
  AppStorage.write('readNotifs', [...seen].slice(-300));
}
function markNotificationRead(id){ const n = DB.notifications.find(x=>x.id===id); if(n && !n.read){ n.read = true; rememberRead([id]); render(); } }
function markAllNotificationsRead(){ DB.notifications.forEach(n=>n.read=true); rememberRead(DB.notifications.map(n=>n.id)); toast('All notifications marked as read'); render(); }
function markAdminNotificationRead(id){ const n = DB.adminNotifications.find(x=>x.id===id); if(n && !n.read){ n.read = true; render(); } }
function markAllAdminNotificationsRead(){ DB.adminNotifications.forEach(n=>n.read=true); toast('All notifications marked as read'); render(); }
