'use strict';
const $ = id => document.getElementById(id);
const source = $('source'), crop = $('crop');
const ctx = source.getContext('2d'), cropCtx = crop.getContext('2d');
let image = null, selection = null, start = null, uploadVersion = 0;
let connected = false, musicConnected = false, busy = false, interpretationSnapshot = null;
const savedClips = [];
let loadingTimer=null, loadingStarted=0;
function startLoading(kind) {
  clearInterval(loadingTimer);loadingStarted=performance.now();
  $('loading').hidden=false;$('loading').dataset.state='working';
  $('loading-bar').removeAttribute('value');
  $('loading-bar').setAttribute('aria-label',kind==='interpret'?'Interpreting selected image':'Composing music');
  $('loading-title').textContent=kind==='interpret'?'Interpreting your detail…':'Composing your music…';
  $('loading-note').textContent=kind==='interpret'?'Waiting for Gemini. Temporary errors get one retry. Allow up to 95 seconds.':'Waiting for ElevenLabs to create your 10-second clip. Allow up to 90 seconds.';
  $('loading-time').textContent='0s elapsed';
  loadingTimer=setInterval(()=>{$('loading-time').textContent=Math.floor((performance.now()-loadingStarted)/1000)+'s elapsed';},1000);
  $(kind==='interpret'?'interpret':'compose').textContent=kind==='interpret'?'Interpreting…':'Composing…';
}
function loadingStage(message) { $('loading-title').textContent=message; }
function finishLoading(success,kind) {
  clearInterval(loadingTimer);loadingTimer=null;
  $('loading-time').textContent=Math.floor((performance.now()-loadingStarted)/1000)+'s elapsed';
  $('loading').dataset.state=success?'complete':'error';
  if(success) $('loading-bar').value=1;
  $('loading-bar').setAttribute('aria-label',success?'Request complete':'Request failed');
  $('loading-title').textContent=success?(kind==='interpret'?'Interpretation complete':'Music ready'):'Couldn’t finish this request';
  $('loading-note').textContent=success?(kind==='interpret'?'Your musical direction is ready to edit.':'Your clip is ready to play and download below.'):'See the error message below. Your selection is still here.';
  $('interpret').textContent='Interpret this detail';$('compose').textContent='Compose 10-second music';
}
function announce(message) { $('status').textContent = message; }
function setImage(value) {
  image = value;
  source.width = Math.max(1,Math.round(value.width*Math.min(1,1200/Math.max(value.width,value.height))));
  source.height = Math.round(value.height * source.width / value.width);
  $('empty').hidden = true; source.hidden = false; $('controls').hidden = false;
  choose(0, 0, source.width, source.height);
}
function choose(x, y, w, h) {
  if (!image || busy) return;
  $('loading').hidden=true;
  $('interpretation').hidden = true; interpretationSnapshot = null;
  $('interpret').disabled = !connected;
  selection = { x: Math.max(0, Math.min(x, source.width - 1)), y: Math.max(0, Math.min(y, source.height - 1)) };
  selection.w = Math.max(1, Math.min(w, source.width - selection.x));
  selection.h = Math.max(1, Math.min(h, source.height - selection.y));
  render();
}
function render() {
  const s = selection;
  ctx.clearRect(0, 0, source.width, source.height);
  ctx.drawImage(image, 0, 0, source.width, source.height);
  // Dim the surroundings while leaving the selected image region untouched.
  ctx.fillStyle = 'rgba(20,38,29,.38)';
  ctx.fillRect(0, 0, source.width, s.y);
  ctx.fillRect(0, s.y + s.h, source.width, source.height - s.y - s.h);
  ctx.fillRect(0, s.y, s.x, s.h);
  ctx.fillRect(s.x + s.w, s.y, source.width - s.x - s.w, s.h);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(s.x, s.y, s.w, s.h);
  crop.width = Math.max(1, Math.round(s.w)); crop.height = Math.max(1, Math.round(s.h));
  const scale = image.width / source.width;
  cropCtx.drawImage(image, s.x * scale, s.y * scale, s.w * scale, s.h * scale, 0, 0, crop.width, crop.height);
  crop.hidden = false; $('crop-empty').hidden = true;
  const whole = s.x === 0 && s.y === 0 && s.w === source.width && s.h === source.height;
  $('selection-label').textContent = whole ? 'Whole image selected.' : `Detail selected · ${Math.round(s.w / source.width * 100)}% wide × ${Math.round(s.h / source.height * 100)}% tall`;
  for (const [id, value] of Object.entries({x:s.x/source.width, y:s.y/source.height, w:s.w/source.width, h:s.h/source.height})) $(id).value = Math.round(value * 100);
}
function point(event) {
  const rect = source.getBoundingClientRect();
  return {x:Math.max(0,Math.min(source.width,event.clientX - rect.left < 0 ? 0 : (event.clientX-rect.left)*source.width/rect.width)),y:Math.max(0,Math.min(source.height,(event.clientY-rect.top)*source.height/rect.height))};
}
source.addEventListener('pointerdown', event => { if (!image || busy) return; start = point(event); source.setPointerCapture(event.pointerId); });
source.addEventListener('pointermove', event => { if (!start) return; const end = point(event); if (Math.abs(end.x-start.x) < 4 || Math.abs(end.y-start.y) < 4) return; choose(Math.min(start.x,end.x), Math.min(start.y,end.y), Math.abs(end.x-start.x), Math.abs(end.y-start.y)); });
source.addEventListener('pointerup', event => { if (!start) return; const end = point(event); if (Math.abs(end.x-start.x)>3 && Math.abs(end.y-start.y)>3) choose(Math.min(start.x,end.x),Math.min(start.y,end.y),Math.abs(end.x-start.x),Math.abs(end.y-start.y)); start=null; announce('Selection ready. Preview the detail on the right.'); });
source.addEventListener('pointercancel', () => { start = null; });
for (const id of ['x','y','w','h']) $(id).addEventListener('input', () => choose(Number($('x').value)/100*source.width,Number($('y').value)/100*source.height,Number($('w').value)/100*source.width,Number($('h').value)/100*source.height));
$('whole').onclick = () => { start=null; choose(0,0,source.width,source.height); };
$('left').onclick = () => { start=null; choose(0,0,source.width/2,source.height); };
$('right').onclick = () => { start=null; choose(source.width/2,0,source.width/2,source.height); };
$('file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  const version = ++uploadVersion;
  if (!['image/jpeg','image/png'].includes(file.type)) { announce('Please choose a JPG or PNG image.'); event.target.value=''; return; }
  if (file.size>10*1024*1024) { announce('Please choose an image smaller than 10 MB.'); event.target.value=''; return; }
  const url = URL.createObjectURL(file);
  const next = new Image();
  try {
    next.src = url; await next.decode();
    if (version !== uploadVersion) return;
    if (next.width*next.height>40000000) { announce('This image is too large. Resize it below 40 million pixels.'); return; }
    setImage(next); announce('Image loaded. Choose a detail or keep the whole image.');
  } catch { if (version === uploadVersion) announce('This image could not be read. Try another JPG or PNG.'); }
  finally { URL.revokeObjectURL(url); event.target.value=''; }
});
$('example').onclick = () => {
  ++uploadVersion;
  const art=document.createElement('canvas');art.width=1000;art.height=700;const c=art.getContext('2d');
  const sky=c.createLinearGradient(0,0,1000,500);sky.addColorStop(0,'#e7ac69');sky.addColorStop(.55,'#dbbf8b');sky.addColorStop(1,'#667c85');c.fillStyle=sky;c.fillRect(0,0,1000,700);
  c.fillStyle='#f9df9e';c.beginPath();c.arc(190,170,70,0,Math.PI*2);c.fill();
  for(let i=0;i<7;i++){c.fillStyle=`rgba(49,65,79,${.25+i*.07})`;c.beginPath();c.ellipse(700+i*22,160+i*22,190-i*9,65, -.15,0,Math.PI*2);c.fill();}
  c.fillStyle='#6d8064';c.beginPath();c.moveTo(0,520);c.quadraticCurveTo(300,370,600,510);c.quadraticCurveTo(830,420,1000,490);c.lineTo(1000,700);c.lineTo(0,700);c.fill();
  c.fillStyle='#344d41';c.beginPath();c.moveTo(0,620);c.quadraticCurveTo(500,460,1000,620);c.lineTo(1000,700);c.lineTo(0,700);c.fill();
  c.fillStyle='#ede0bd';c.beginPath();c.moveTo(530,700);c.lineTo(615,520);c.lineTo(635,520);c.lineTo(700,700);c.fill();
  c.fillStyle='#273931';c.beginPath();c.arc(620,480,9,0,Math.PI*2);c.fill();c.fillRect(613,490,14,30);c.fillRect(613,518,5,18);c.fillRect(623,518,5,18);
  setImage(art);announce('Original example artwork loaded. Compare the warm sun with the dark clouds.');
};

function setBusy(value) {
  busy=value;
  for(const element of document.querySelectorAll('button,input,textarea')) element.disabled=value;
  if(!value) { $('interpret').disabled=!image||!connected; $('compose').disabled=!musicConnected; }
  document.querySelector('.workspace').setAttribute('aria-busy',String(value));
}
async function apiError(response) {
  try {const value=await response.json();return value.error||'Request failed. Please retry.';}catch{return 'The server could not complete the request. Please retry.';}
}
$('interpret').onclick=async()=>{
  if(!image||busy)return;
  const thumbnail=crop.toDataURL('image/jpeg',.85);
  const upload=document.createElement('canvas');
  const scale=Math.min(1,768/Math.max(crop.width,crop.height));
  upload.width=Math.max(1,Math.round(crop.width*scale));upload.height=Math.max(1,Math.round(crop.height*scale));
  upload.getContext('2d').drawImage(crop,0,0,upload.width,upload.height);
  const label=$('selection-label').textContent;
  setBusy(true);startLoading('interpret');announce('Gemini is interpreting your selected detail…');
  try {
    const response=await fetch('/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:upload.toDataURL('image/jpeg',.8),intent:$('intent').value})});
    if(!response.ok)throw new Error(await apiError(response));
    loadingStage('Reading your interpretation…');
    const value=await response.json();
    $('music-title').textContent=value.title; $('explanation').textContent=value.explanation; $('prompt').value=value.musicPrompt;
    interpretationSnapshot={thumbnail,label,title:value.title,explanation:value.explanation};
    $('interpretation').hidden=false;finishLoading(true,'interpret');announce('Interpretation ready. Edit the musical direction, then compose.');
  }catch(error){finishLoading(false,'interpret');announce(error.message);}finally{setBusy(false);}
};
$('compose').onclick=async()=>{
  if(busy||!interpretationSnapshot)return;
  const snapshot={...interpretationSnapshot,prompt:$('prompt').value};
  setBusy(true);startLoading('music');announce('ElevenLabs is composing your 10-second instrumental clip…');
  try {
    const response=await fetch('/api/music',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:snapshot.prompt})});
    if(!response.ok)throw new Error(await apiError(response));
    loadingStage('Preparing your audio player…');
    const blob=await response.blob();const url=URL.createObjectURL(blob);savedClips.unshift({...snapshot,url});
    if(savedClips.length>2)URL.revokeObjectURL(savedClips.pop().url);
    showClips();finishLoading(true,'music');announce('Music ready. Press Play to listen. Select a different detail to compare.');
  }catch(error){finishLoading(false,'music');announce(error.message);}finally{setBusy(false);}
};
function showClips(){
  $('clips').replaceChildren();$('results').hidden=false;
  for(const clip of savedClips){
    const card=document.createElement('article');card.className='clip panel';
    const thumb=document.createElement('img');thumb.src=clip.thumbnail;thumb.alt=clip.label;
    const title=document.createElement('h3');title.textContent=clip.title;
    const explanation=document.createElement('p');explanation.textContent=clip.explanation;
    const audio=document.createElement('audio');audio.controls=true;audio.src=clip.url;audio.preload='metadata';
    const download=document.createElement('a');download.href=clip.url;download.download='picyourbeat-'+Date.now()+'.mp3';download.textContent='Download music';download.className='download';
    const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Musical direction used';const prompt=document.createElement('p');prompt.textContent=clip.prompt;details.append(summary,prompt);
    card.append(thumb,title,explanation,audio,download,details);$('clips').append(card);
  }
}
fetch('/api/health').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(value=>{
  connected=value.interpretation;musicConnected=value.music;
  $('connection').textContent=connected&&musicConnected?'Gemini + ElevenLabs connected. Interpretation uses Google; composing uses your existing music credits.':'An API key is missing. Check the private server configuration.';
  $('interpret').disabled=!image||!connected;
}).catch(()=>{$('connection').textContent='The API server is unavailable. Start server.mjs instead of the static preview server.';});
