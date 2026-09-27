import API from '../api';
export function pushSupport(){
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const installed=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 if(ios&&!installed)return 'Sur iPhone ou iPad, ouvrez l’application ajoutée à l’écran d’accueil (iOS 16.4 ou plus récent).';
 if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return 'Les notifications ne sont pas disponibles dans ce navigateur. Utilisez l’application sur iPhone ou Chrome sur Android.';
 return '';
}
export function applicationKey(value){const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export async function disableThisDevice(){
 if(!('serviceWorker' in navigator))return;
 const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager?.getSubscription();
 if(sub){
  let removed=false;try{removed=await sub.unsubscribe();}catch{/* Server disable remains available. */}
  try{await API.post('/notifications/disable',{endpoint:sub.endpoint});}catch(e){if(!removed)throw e;}
 }
}
