const tg=window.Telegram?.WebApp;
const $=id=>document.getElementById(id);
const q=(selector,root=document)=>root.querySelector(selector);
const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const fmt=value=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(value||0));
const money=value=>{const n=Number(value||0);return n>=1e6?'$'+(n/1e6).toFixed(1)+'M':n>=1e3?'$'+(n/1e3).toFixed(n>=1e5?0:1)+'K':'$'+fmt(n)};
const pct=value=>(Number(value||0)>=0?'+':'')+Number(value||0).toFixed(1)+'%';
const duration=ms=>{const seconds=Math.max(0,Math.ceil(ms/1000));if(seconds>=3600)return Math.floor(seconds/3600)+'h '+Math.floor(seconds%3600/60)+'m';return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')};
const storageKey='xradar_lab_operator_v1';
const deviceKey='xradar_lab_device_v1';
const defaultEditor={callSign:'Operator',gender:'custom',face:3,build:3,hair:4,gear:2};
function loadEditor(){try{return {...defaultEditor,...JSON.parse(localStorage.getItem(storageKey)||'{}')}}catch{return {...defaultEditor}}}
function deviceId(){let value=localStorage.getItem(deviceKey);if(!value){value=crypto.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);localStorage.setItem(deviceKey,value)}return value}

const state={game:null,config:null,tab:'lab',view:'lab',signalId:null,factors:new Set(),lastResult:null,lastExpected:new Set(),lastVisible:[],poll:null,toast:null,editor:loadEditor(),editorDirty:false,sound:localStorage.getItem('xradar_lab_sound')==='1',audio:null,hum:null,leaderboard:null,catalog:null,ton:null,jobTicker:null,jobDeadline:null,serverNode:null,sheet:null};
/* ==========================================================================
   Station geometry

   One coordinate space, shared with the CSS cutaway: x and y are percentages
   of the scene. Eight floors of equal height, a room band on the left and one
   elevator shaft on the right.

   Every id below is a node in the server's navigation graph, so a path handed
   back by the API maps straight onto screen positions. Two nodes on the same
   floor differ only in x, and the two elevator nodes of neighbouring floors
   differ only in y — which is what makes "walk along the floor, ride the
   shaft" fall out of the data instead of being special-cased.
   ========================================================================== */
const FLOORS=8;
const SHAFT_X=92;
const floorTop=floor=>floor*(100/FLOORS);
/* Feet rest just above the floor line that closes each room box. */
const floorLine=floor=>floorTop(floor)+(100/FLOORS)-1.2;

const LAB_X={lab_supply:9,lab_generator:21,lab_center:40,lab_analyzer:52,lab_terminal:64,lab_locker:76,lab_elevator:SHAFT_X};
const OBJECT_X={supply:9,generator:21,analyzer:52,terminal:64,locker:76,elevator:SHAFT_X};
const OBJECT_ICON={terminal:'i-monitor',analyzer:'i-radio',generator:'i-zap',locker:'i-archive',supply:'i-inbound',elevator:'i-elevator'};

function nodePoint(node){
  const id=String(node||'');
  if(LAB_X[id]!==undefined)return {x:LAB_X[id],y:floorLine(0),floor:0,shaft:id==='lab_elevator'};
  const match=/^floor_(\d+)_(elevator|center|console)$/.exec(id);
  if(!match)return {x:LAB_X.lab_center,y:floorLine(0),floor:0,shaft:false};
  const floor=Number(match[1]);
  const x=match[2]==='elevator'?SHAFT_X:match[2]==='center'?45:20;
  return {x,y:floorLine(floor),floor,shaft:match[2]==='elevator'};
}
const TAB_INDEX={lab:0,signals:1,crew:2};
/* No copy tables live here any more.

   Room names, object names and blurbs, action labels, item names, task titles
   and job labels all arrive on the payload already rendered in the player's
   language. The local ROOM/OBJECT/ACTION/ITEM/TASK dictionaries that used to
   shadow them were not just duplication — once the server learned Russian they
   actively pinned half the UI to English, which is exactly the bug they were
   originally added to hide.

   The one thing still needed locally is the item id list, because equipment
   drives CSS classes on the operator sprite rather than text. */
const ITEM_IDS=['field_coat','insulated_gloves','analyst_goggles','utility_vest','field_tablet','headlamp'];
const HAIR=['#17191d','#4a3027','#76513b','#a8b4b5','#d6cfc0','#7c2223','#31555d','#c1c8cf'];
const GEAR=['#3fddc4','#5fd4ff','#f2b43f','#9dacc0','#d5efe9'];
const CREW_ICON={engineer:'i-wrench',analyst:'i-radio'};
const TASK_ICON={daily:'i-target',recon:'i-radio'};

/* Icon helper. Every glyph in this client is an SVG symbol from the inline
   sprite — never a unicode character, which renders differently on every
   platform and silently falls back to an emoji font on Android. */
const icon=(name,extra='')=>`<svg class="icon ${extra}" aria-hidden="true"><use href="#${name}"/></svg>`;

/* ==========================================================================
   Telegram platform layer
   ========================================================================== */

const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');

function tgAvailable(version){return Boolean(tg?.isVersionAtLeast?.(version))}

function applyInsets(){
  const root=document.documentElement;
  /* Telegram reports its own insets, which account for the client header and
     the gesture bar. Where it reports nothing, the CSS env() baseline stands. */
  const top=Number(tg?.contentSafeAreaInset?.top??tg?.safeAreaInset?.top)||0;
  const bottom=Number(tg?.safeAreaInset?.bottom)||0;
  if(top>0)root.style.setProperty('--sa-top',top+'px');
  if(bottom>0)root.style.setProperty('--sa-bottom',bottom+'px');
  /* Pin the shell to the stable height so opening the keyboard for the call
     sign field cannot collapse the game grid. */
  const stable=Number(tg?.viewportStableHeight)||0;
  if(stable>0)root.style.setProperty('--app-h',stable+'px');
}

function initTelegram(){
  if(!tg)return;
  tg.ready();
  tg.expand();
  /* Bot API 7.7. Without this a vertical drag anywhere on the game scene is
     interpreted as "dismiss the mini app" — the single most disruptive
     default for a game that lives inside a draggable sheet. */
  tg.disableVerticalSwipes?.();
  if(tgAvailable('6.1')){tg.setHeaderColor?.('#0a1013');tg.setBackgroundColor?.('#050809')}
  tg.BackButton?.onClick?.(handleBack);
  for(const event of ['viewportChanged','safeAreaChanged','contentSafeAreaChanged'])tg.onEvent?.(event,applyInsets);
  applyInsets();
}

/* One predictable back path: sheet, then signal detail, then home tab.
   Telegram's own back control drives it, so the gesture matches the chrome. */
function handleBack(){
  if($('sheet').classList.contains('open')){closeSheet();return}
  if(state.tab==='signals'&&(state.signalId||state.lastResult)){state.signalId=null;state.lastResult=null;state.factors.clear();renderSignals();syncBackButton();return}
  if(state.tab!=='lab'){setTab('lab');return}
}
function syncBackButton(){
  if(!tg?.BackButton)return;
  const deep=$('sheet').classList.contains('open')||state.tab!=='lab'||Boolean(state.signalId||state.lastResult);
  try{deep?tg.BackButton.show():tg.BackButton.hide()}catch{}
}

/* ==========================================================================
   Motion helpers — all GPU-friendly, all reduced-motion aware
   ========================================================================== */

function animateNumber(element,target,format){
  const from=Number(element.dataset.v);
  const to=Number(target)||0;
  element.dataset.v=to;
  if(!Number.isFinite(from)||from===to||reduceMotion.matches){element.textContent=format(to);return from!==to&&Number.isFinite(from)}
  cancelAnimationFrame(element._raf);
  const start=performance.now(),span=520;
  const step=now=>{
    const t=Math.min(1,(now-start)/span);
    const eased=1-Math.pow(1-t,3);
    element.textContent=format(Math.round(from+(to-from)*eased));
    if(t<1)element._raf=requestAnimationFrame(step)
  };
  element._raf=requestAnimationFrame(step);
  return true;
}
function pulseResource(element){
  const host=element.closest('.resource');
  if(!host||reduceMotion.matches)return;
  host.classList.remove('tick');
  void host.offsetWidth;
  host.classList.add('tick');
}

/* ==========================================================================
   Networking
   ========================================================================== */

async function api(url,options={}){
  const response=await fetch(url,{method:options.method||'GET',headers:options.body?{'Content-Type':'application/json'}:undefined,body:options.body?JSON.stringify(options.body):undefined});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(englishError(data.error,data.message));error.status=response.status;error.code=data.error;throw error}
  return data;
}
function englishError(code,fallback){return ({HERO_BUSY:'The operator is already assigned.',ROOM_BUSY:'That room is already under construction.',NOT_ENOUGH_DATA:'Not enough Intel.',NOT_ENOUGH_COMPONENTS:'Not enough Parts.',NOT_ENOUGH_ENERGY:'Not enough Power.',ACTION_LOCKED:'That operation is not available yet.',LOCKED_ROOM:'This room is still locked.',MAX_LEVEL:'This room has reached level 10.',UNKNOWN_SIGNAL:'This signal is no longer available.',ITEM_LOCKED:'This item has not been recovered yet.',INCIDENT_LOCKED:'Complete the restoration protocol first.',INCIDENT_ACTIVE:'Contain the active station incident first.',INCIDENT_COOLDOWN:'Security systems are still analyzing the last incident.',NO_ACTIVE_INCIDENT:'The incident has already been contained.',INVALID_APPEARANCE:'Check the operator profile values.',INVALID_COSMETIC:'Unknown station appearance.',COSMETIC_LOCKED:'This appearance is part of the cosmetic station pack.',REFERRAL_EXISTS:'A referral is already connected.',SELF_REFERRAL:'You cannot use your own referral code.',REFERRAL_NOT_FOUND:'Referral code not found.',XRADAR_NOT_CONFIGURED:'Live XRadar waves are not configured yet.',STARS_NOT_CONFIGURED:'Telegram Stars are not configured yet.',TON_NOT_CONFIGURED:'TON payments are not configured yet.'})[code]||fallback||'The operation could not be completed.'}
function haptic(type='light'){try{if(!tgAvailable('6.1'))return;if(type==='success')tg.HapticFeedback?.notificationOccurred('success');else if(type==='error')tg.HapticFeedback?.notificationOccurred('error');else if(type==='warning')tg.HapticFeedback?.notificationOccurred('warning');else if(type==='select')tg.HapticFeedback?.selectionChanged();else tg.HapticFeedback?.impactOccurred(type)}catch{}}
function audioContext(){state.audio||=new(window.AudioContext||window.webkitAudioContext)();state.audio.resume?.();return state.audio}
function tone(freq=520,length=.06){if(!state.sound)return;try{const ctx=audioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=freq;osc.type='sine';gain.gain.setValueAtTime(.025,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+length);osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+length)}catch{}}
function setAmbient(on){
  state.sound=on;
  localStorage.setItem('xradar_lab_sound',on?'1':'0');
  const button=$('soundButton');
  button.classList.toggle('on',on);
  button.setAttribute('aria-pressed',on?'true':'false');
  q('use',button).setAttribute('href',on?'#i-sound-on':'#i-sound-off');
  if(on&&!state.hum){try{const ctx=audioContext(),osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();osc.type='sawtooth';osc.frequency.value=42;filter.type='lowpass';filter.frequency.value=120;gain.gain.value=.008;osc.connect(filter).connect(gain).connect(ctx.destination);osc.start();state.hum={osc,gain}}catch{}}
  if(state.hum)state.hum.gain.gain.setTargetAtTime(on?.008:0,state.audio.currentTime,.15);
}
function notify(message,error=false){clearTimeout(state.toast);const toast=$('toast');toast.textContent=message;toast.classList.toggle('error',error);toast.classList.add('show');state.toast=setTimeout(()=>toast.classList.remove('show'),error?4300:3000)}
function taskCopy(task){return{title:task.title||'Station directive',desc:task.description||'Complete the current operation.'}}
function actionCopy(action){return [action?.label||'Start operation',action?.description||'Assign the operator to this task.']}

/* ==========================================================================
   Render scheduling

   The previous client rebuilt the innerHTML of all five tabs on every poll —
   every 900ms while any job ran. That destroyed in-flight animations, reset
   scroll positions and dropped keystrokes out of the referral field.

   Two rules now: only the visible tab renders, and each block re-renders only
   when the data it depends on actually changed.
   ========================================================================== */

const rendered={};
function gate(key,signature,build){
  if(rendered[key]===signature)return false;
  rendered[key]=signature;
  build();
  return true;
}
function invalidate(...keys){for(const key of keys)delete rendered[key]}

function setGame(game){
  const previous=state.game,oldJob=previous?.hero?.job?.id;
  state.game=game;
  if(!state.editorDirty&&game.profile?.appearance){state.editor={...defaultEditor,...game.profile.appearance};localStorage.setItem(storageKey,JSON.stringify(state.editor))}
  if(oldJob&&!game.hero.job){notify('Operation complete.');tone(760,.12);haptic('success')}
  if(previous){
    const delta=game.resources.data-previous.resources.data;
    if(delta>=1)resourceFly('+'+fmt(delta)+' Intel');
    const parts=game.resources.components-previous.resources.components;
    if(parts>=1)resourceFly('+'+fmt(parts)+' Parts');
  }
  renderAll();schedulePoll();
}
function schedulePoll(){clearTimeout(state.poll);const busy=state.game?.hero?.job||state.game?.progression?.secondaryJob;state.poll=setTimeout(()=>refresh().catch(()=>{}),busy?900:20000)}
async function refresh(){const response=await api('/api/game');setGame(response.game)}

function renderAll(){
  if(!state.game)return;
  applyTheme();
  renderHud();
  renderLab();
  renderActiveTab();
  renderReturn();
}
function renderActiveTab(){
  if(state.tab==='crew')renderCrew();
  else if(state.tab==='signals')renderSignals();
}
function applyTheme(){const cosmetic=state.game.profile.cosmetics||{};const game=$('game');game.dataset.neon=cosmetic.neon||'cyan';game.dataset.floor=cosmetic.floor||'steel';game.dataset.skin=cosmetic.heroSkin||'standard'}

const XP_CIRCUMFERENCE=119.4;
function renderHud(){
  const game=state.game;
  if(animateNumber($('intelValue'),game.resources.data,fmt))pulseResource($('intelValue'));
  if(animateNumber($('powerValue'),game.resources.energy,value=>fmt(value)+'/'+fmt(game.resources.energyMax)))pulseResource($('powerValue'));
  if(animateNumber($('partsValue'),game.resources.components,fmt))pulseResource($('partsValue'));
  $('levelValue').textContent=game.hero.level;
  $('xpRing').style.strokeDashoffset=XP_CIRCUMFERENCE*(1-(game.hero.xp%100)/100);
}

function renderLab(){
  const game=state.game,task=game.recommendedTask,copy=task?taskCopy(task):{title:'All systems stable'};
  $('stationStatus').textContent=game.progression.onboarding.completed?'Online · '+fmt(game.resources.productionPerHour)+' Intel/h · '+game.resources.offlineCapacityHours+'h storage':'Emergency restoration protocol';
  $('goalText').textContent=copy.title;
  const job=game.hero.job,second=game.progression.secondaryJob,displayJob=job||second;
  $('jobStrip').classList.toggle('hidden',!displayJob);
  $('goalButton').classList.toggle('hidden',Boolean(displayJob));
  if(displayJob){
    $('jobTitle').textContent=jobTitle(displayJob);
    /* Anchor the countdown locally so it ticks every second instead of
       jumping whenever a poll happens to land. */
    state.jobDeadline=performance.now()+displayJob.remainingMs;
    state.jobDuration=displayJob.durationMs||1;
    paintJobClock();
    startJobTicker();
  }else stopJobTicker();
  $('secondaryJob').classList.toggle('hidden',!job||!second);
  if(job&&second)$('secondaryJob').textContent='Automation slot · '+jobTitle(second)+' · '+duration(second.remainingMs);
  for(const object of game.objects){
    const element=q('[data-object="'+object.id+'"]');
    if(!element)continue;
    element.classList.toggle('ready',Boolean(object.action?.enabled||object.action?.type==='navigate'));
    element.classList.toggle('attn',Boolean(object.action&&object.id==='generator'&&!game.progression.onboarding.completed));
  }
  const incident=game.progression.incidents?.active;
  q('.scene').classList.toggle('incident',Boolean(incident));
  $('incidentButton').title=incident?'Active: '+incident.title:game.progression.incidents?.ready?'Run tactical incident':'Security systems standing by';
  renderStation();renderUnits();
}
function paintJobClock(){
  const remaining=Math.max(0,state.jobDeadline-performance.now());
  $('jobTime').textContent=duration(remaining);
  $('jobBar').style.width=Math.max(2,100-(remaining/state.jobDuration)*100)+'%';
}
function startJobTicker(){if(state.jobTicker)return;state.jobTicker=setInterval(paintJobClock,250)}
function stopJobTicker(){clearInterval(state.jobTicker);state.jobTicker=null}

function renderStation(){
  const game=state.game;
  const signature=game.roomOrder.map(id=>{const room=game.rooms[id];return id+':'+room.level+':'+(room.unlocked?1:0)+':'+(room.construction?Math.round(room.construction.progress*100):'-')+':'+room.name}).join('|');
  gate('station',signature,()=>{
    $('station').innerHTML=game.roomOrder.map(id=>{
      const room=game.rooms[id];
      const status=room.construction?'building':room.level?'open':room.unlocked?'ready':'locked';
      const progress=room.construction?Math.round(room.construction.progress*100):0;
      const badge=room.level?'LV '+room.level:room.unlocked?'BUILD':icon('i-lock','icon-sm');
      return `<button class="room-node ${status}" style="--progress:${progress}%" data-room="${id}" type="button"><span>${esc(room.name)}</span><b>${badge}</b></button>`
    }).join('');
  });
  renderSpots();
}
/* Object markers live in scene space rather than inside a room box, because the
   elevator marker belongs to the shaft, which is outside the room band. */
function renderSpots(){
  const game=state.game;
  const signature=game.objects.map(o=>o.id+':'+(o.action?.enabled?1:0)+':'+(o.action?.type||'-')).join('|');
  gate('spots',signature,()=>{
    $('spots').innerHTML=game.objects.map(object=>{
      const x=OBJECT_X[object.id];
      if(x===undefined)return '';
      const ready=Boolean(object.action?.enabled||object.action?.type==='navigate');
      const attn=Boolean(object.action&&object.id==='generator'&&!game.progression.onboarding.completed);
      return `<button class="spot ${ready?'ready':''} ${attn?'attn':''}" style="left:${x}%;top:${floorLine(0)}%" data-object="${object.id}" type="button" aria-label="${esc(object.name)}">${icon(OBJECT_ICON[object.id]||'i-package','icon-sm')}</button>`
    }).join('');
  });
}
function jobTitle(job){return job.label||'Station operation'}

/* ==========================================================================
   Movement

   The server already runs a BFS over the station graph and returns the node
   sequence; the client's only job is to play it back. Each leg is animated on
   its own, so a trip to another floor reads as walk → ride → walk instead of
   one diagonal slide through the concrete.
   ========================================================================== */

const WALK_SPEED=34;   /* percent of scene width per second */
const RIDE_SPEED=17;   /* percent of scene height per second */
let walkToken=0;

function placeUnit(unit,x,y,ms=0){
  unit.style.setProperty('--walk-ms',ms+'ms');
  unit.style.left=x+'%';
  unit.style.top=y+'%';
  unit.dataset.x=x;
  unit.dataset.y=y;
}
function pose(unit,mode){
  unit.classList.remove('idle','walking','working','alarm','tired','riding');
  unit.classList.add(mode);
}
function currentPoint(unit){
  return {x:Number(unit.dataset.x??LAB_X.lab_center),y:Number(unit.dataset.y??floorLine(0))};
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/**
 * Play a node path. Returns once the operator has arrived, or immediately if a
 * newer walk superseded this one — the token guard stops two overlapping trips
 * from fighting over the same element.
 */
async function walkPath(nodes,restMode='idle'){
  const unit=$('operatorUnit');
  const token=++walkToken;
  const legs=(nodes||[]).filter(Boolean);
  if(!legs.length){pose(unit,restMode);return}
  if(reduceMotion.matches){
    const last=nodePoint(legs[legs.length-1]);
    placeUnit(unit,last.x,last.y,0);
    moveCar(last);
    pose(unit,restMode);
    return;
  }
  for(const node of legs){
    if(token!==walkToken)return;
    const to=nodePoint(node);
    const from=currentPoint(unit);
    const dx=to.x-from.x,dy=to.y-from.y;
    if(Math.abs(dx)<0.2&&Math.abs(dy)<0.2)continue;
    /* Within a floor only x changes; between floors only y does. That is a
       property of the graph, not an assumption — the shaft is the sole link
       between levels, so a leg is never truly diagonal. */
    const riding=Math.abs(dy)>Math.abs(dx);
    const ms=Math.max(180,Math.round((riding?Math.abs(dy)/RIDE_SPEED:Math.abs(dx)/WALK_SPEED)*1000));
    if(!riding&&Math.abs(dx)>0.2)unit.style.setProperty('--flip',dx>=0?1:-1);
    pose(unit,riding?'riding':'walking');
    if(riding)moveCar(to,ms);
    placeUnit(unit,to.x,to.y,ms);
    await sleep(ms);
  }
  if(token!==walkToken)return;
  pose(unit,restMode);
}
function moveCar(point,ms=0){
  const car=$('elevatorCar');
  car.style.transitionDuration=ms+'ms';
  car.style.top=floorTop(point.floor)+'%';
}
function appearanceStyle(element){const editor=state.editor;element.dataset.gender=editor.gender||'custom';element.style.setProperty('--body-scale',(0.93+Number(editor.build||3)*.018).toFixed(3));element.style.setProperty('--face-scale',(0.955+Number(editor.face||3)*.012).toFixed(3));element.style.setProperty('--hair-color',HAIR[(Number(editor.hair||4)-1)%HAIR.length]);element.style.setProperty('--gear-color',GEAR[(Number(editor.gear||2)-1)%GEAR.length])}
function equipmentClasses(element){const outfit=state.game.hero.outfit||{};for(const id of ITEM_IDS)element.classList.toggle('has-'+id,Object.values(outfit).includes(id));element.classList.remove('rank-1','rank-2','rank-3');element.classList.add('rank-'+Math.min(3,Math.floor((state.game.hero.level-1)/5)+1))}
function restMode(){
  const game=state.game;
  if(game.progression.incidents?.active)return 'alarm';
  if(game.resources.energy<=0)return 'tired';
  return game.hero.job?'working':'idle';
}
function renderUnits(){
  const game=state.game,operator=$('operatorUnit'),engineer=$('engineerUnit'),incident=Boolean(game.progression.incidents?.active);
  appearanceStyle(operator);equipmentClasses(operator);
  $('operatorUnitLabel').textContent=state.editor.callSign||'Operator';
  /* The server node is authoritative but only moves when the player actually
     starts something. Polls repeat the same value, so re-placing on every one
     of them would yank the operator back mid-stride and undo any local walk.
     Snap only when the server genuinely relocated the hero. */
  if(!walkInFlight&&game.hero.node!==state.serverNode){
    state.serverNode=game.hero.node;
    const point=nodePoint(game.hero.node);
    placeUnit(operator,point.x,point.y,0);
    moveCar(point);
    pose(operator,restMode());
  }else if(!walkInFlight){
    pose(operator,restMode());
  }
  const engineerOpen=Boolean(game.crew?.engineer?.recruited);
  engineer.classList.toggle('hidden',!engineerOpen);
  if(engineerOpen){
    const job=game.hero.job;
    const supports=job&&(job.type==='construction'||['repair_power','generator_charge'].includes(job.actionId));
    const floor=supports&&job.type==='construction'?(game.rooms[job.roomId]?.floor??1):1;
    placeUnit(engineer,supports?30:66,floorLine(Math.min(FLOORS-1,floor)),400);
    engineer.style.setProperty('--flip',-1);
    pose(engineer,incident?'alarm':supports?'working':'idle');
  }
}
let walkInFlight=false;
/** Walk a server path, holding off position snaps until the trip completes. */
async function runWalk(path){
  if(!Array.isArray(path)||!path.length)return;
  walkInFlight=true;
  /* The walk ends where the server already believes the hero is, so record it
     and let the next poll agree instead of re-snapping. */
  state.serverNode=state.game?.hero?.node;
  try{await walkPath(path,restMode())}finally{walkInFlight=false}
}
const elevatorNode=floor=>floor===0?'lab_elevator':`floor_${floor}_elevator`;
/**
 * Route for a move the server was never asked about — tapping an object, or
 * following a directive. It mirrors the server's graph rather than guessing:
 * the shaft is the only link between floors, so any cross-floor trip is
 * "walk to this floor's elevator, ride, walk out of that one".
 */
function routeTo(node){
  const from=nodePoint(state.game.hero.node).floor;
  const to=nodePoint(node);
  if(from===to.floor)return [node];
  return [elevatorNode(from),elevatorNode(to.floor),node];
}
/* Tapping an object walks there instead of cutting to it. */
function moveOperatorToObject(id){
  const object=state.game.objects.find(entry=>entry.id===id);
  if(!object?.node)return;
  runWalk(routeTo(object.node));
}

/* ==========================================================================
   Crew
   ========================================================================== */

function renderCrew(){
  const game=state.game,editor=state.editor;
  $('operatorName').textContent=editor.callSign||game.profile.firstName||'Operator';
  if(document.activeElement!==$('callSign'))$('callSign').value=editor.callSign||'Operator';
  qa('button[data-gender]').forEach(button=>button.classList.toggle('active',button.dataset.gender===editor.gender));
  qa('[data-editor-range]').forEach(input=>{if(document.activeElement!==input)input.value=editor[input.dataset.editorRange]||input.value});
  appearanceStyle($('operatorVisual'));equipmentClasses($('operatorVisual'));

  const characteristics=game.hero.characteristics;
  gate('crewStats',JSON.stringify(characteristics),()=>{
    $('crewStats').innerHTML=`<div class="stat"><b>+${characteristics.workSpeedPct}%</b><span>Work speed</span></div><div class="stat"><b>${characteristics.energyCapacity}</b><span>Power capacity</span></div><div class="stat"><b>LV ${characteristics.analysisLevel}</b><span>Analysis</span></div>`;
  });
  gate('crewList',JSON.stringify(game.crew),()=>{
    $('crewList').innerHTML=Object.values(game.crew).map(member=>`<div class="crew-row" style="${member.recruited?'':'opacity:.42'}"><div class="mini-avatar">${icon(CREW_ICON[member.id]||'i-users','icon-sm')}</div><div class="row-copy"><b>${esc(member.name)}</b><span>${esc(member.recruited?member.role:member.id==='engineer'?'Recruit after opening the Power Room':'Recruit after opening the Signal Array')}</span></div><span class="row-end">${esc(member.status)}</span></div>`).join('');
  });
  renderSettings();renderCosmetics();renderReferral();
}
/* Language lives on the server with the save, not in localStorage: the player
   picks it once and every device shows the station in that language. The whole
   payload is re-fetched on switch because every game string is server-owned. */
const LANGUAGE_OPTIONS=[['en','English'],['ru','Русский']];
function renderSettings(){
  const current=state.game.profile.language||'en';
  gate('settings',current,()=>{
    $('settingsCard').innerHTML=`<div class="option-row"><div class="row-copy"><b>${LANG_COPY[current].languageTitle}</b><span>${LANG_COPY[current].languageHint}</span></div>${LANGUAGE_OPTIONS.map(([value,label])=>`<button class="${current===value?'active':''}" data-language="${value}" type="button">${label}</button>`).join('')}</div>`;
  });
}
/* The few strings that describe the switch itself have to exist on both sides
   of it, otherwise the control explaining the language is stuck in one. */
const LANG_COPY={
  en:{languageTitle:'Interface language',languageHint:'Applies to the whole station immediately.',saved:'Interface language updated.'},
  ru:{languageTitle:'Язык интерфейса',languageHint:'Применяется ко всей станции сразу.',saved:'Язык интерфейса обновлён.'}
};
async function saveLanguage(language){
  if(language===state.game.profile.language)return;
  try{
    const response=await api('/api/game/profile/language',{method:'POST',body:{language}});
    /* Every cached block holds server copy in the old language, so the render
       gates are dropped wholesale rather than one by one. */
    invalidate(...Object.keys(rendered));
    setGame(response.game);
    renderActiveTab();
    notify(LANG_COPY[response.language].saved);
    haptic('success');
  }catch(error){notify(error.message,true);haptic('error')}
}
function renderCosmetics(){
  const game=state.game,current=game.profile.cosmetics,owned=new Set(game.progression.commerce.entitlements);
  gate('cosmetics',JSON.stringify(current)+'|'+[...owned].join(','),()=>{
    const options={neon:[['cyan','Cyan'],['amber','Amber'],['ice','Ice']],floor:[['steel','Steel'],['concrete','Concrete'],['grid','Grid']],heroSkin:[['standard','Standard'],['field','Field'],['command','Command']]};
    $('cosmeticList').innerHTML=Object.entries(options).map(([key,values])=>`<div class="option-row"><div class="row-copy"><b>${key==='heroSkin'?'Operator suit':key[0].toUpperCase()+key.slice(1)}</b><span>Purely visual. No gameplay advantage.</span></div>${values.map(([value,label],index)=>{const unlocked=index===0||owned.has('cosmetic:'+key+':'+value);return `<button class="${current[key]===value?'active':''}" data-cosmetic-key="${key}" data-cosmetic-value="${value}" type="button" ${unlocked?'':'disabled'}>${label}</button>`}).join('')}</div>`).join('');
  });
}
function renderReferral(){
  const profile=state.game.profile,referrals=state.game.progression.referrals;
  /* Gated: this block owns a text input. Rebuilding it on a timer is what
     used to swallow characters while the player typed a code. */
  gate('referral',profile.referralCode+'|'+profile.referralConnected+'|'+referrals.total,()=>{
    $('referralCard').innerHTML=`<div class="card-top"><div><h3>Your code: ${esc(profile.referralCode)}</h3><p>A referral qualifies only after operator level 3 and one completed signal. Registration alone gives nothing.</p></div><span class="tag">${referrals.total} qualified</span></div><div class="field" style="margin-top:var(--s-4)"><label for="referralInput">Connect inviter code</label><input id="referralInput" type="text" maxlength="24" placeholder="XR…" ${profile.referralConnected?'disabled':''}></div><button class="secondary full" data-referral-connect type="button" ${profile.referralConnected?'disabled':''}>${profile.referralConnected?'Referral connected':'Connect code'}</button>`;
  });
}

/* ==========================================================================
   Signals
   ========================================================================== */

function renderSignals(){
  const recon=state.game.progression.recon,body=$('signalsBody');
  if(state.lastResult){
    gate('signals','result:'+JSON.stringify(state.lastResult),()=>{body.innerHTML=resultMarkup(state.lastResult)});
    return;
  }
  const selected=recon.signals.find(signal=>signal.id===state.signalId);
  if(selected){
    gate('signals','detail:'+selected.id,()=>{canvasObserver.disconnect();body.innerHTML=signalDetail(selected);drawChart(selected.market)});
    return;
  }
  if(!recon.unlocked||recon.requiresAntenna){
    gate('signals','locked',()=>{body.innerHTML='<div class="card amber"><div class="card-top"><div><h3>Signal Array offline</h3><p>Build the Signal Array to receive recurring market observations. The tutorial signal remains available before that.</p></div><span class="tag locked">Locked</span></div><div class="row-actions"><button class="secondary" data-room-focus="antenna" type="button">Show required room</button></div></div>'});
    return;
  }
  if(!recon.signals.length){
    gate('signals','empty',()=>{body.innerHTML='<div class="card"><h3>Scanning external feeds</h3><p>The station is preparing the next intelligence batch.</p></div>'});
    return;
  }
  gate('signals','list:'+recon.signals.map(signal=>signal.id).join(','),()=>{
    canvasObserver.disconnect();
    body.innerHTML=`<div class="card"><div class="card-top"><div><h3>Intercepted assets</h3><p>${recon.signals.length} signals are ready. Names remain hidden until an outcome is verified.</p></div><span class="tag">${recon.signals.length} live</span></div><div class="signal-list">${recon.signals.map(signalRow).join('')}</div>${state.config?.liveWaves?'<button class="secondary full" data-sync-live type="button">Replace with live XRadar wave</button>':''}</div><div class="card accent"><h3>Assessment protocol</h3><p>Use liquidity depth, holder distribution and buying pressure. Advanced station rooms reveal additional evidence; they never choose for you.</p></div>`;
    recon.signals.forEach(drawSpark);
  });
}
function signalRow(signal){const market=signal.market||{},up=Number(market.change24h)>=0;return `<button class="signal" data-signal-open="${esc(signal.id)}" type="button"><canvas class="spark" data-spark="${esc(signal.id)}" width="140" height="60"></canvas><span><b>${esc(signal.name)}</b><small>${money(market.liquidityUsd)} liquidity · ${fmt(market.holders)} holders</small></span><span class="change ${up?'up':'down'}">${pct(market.change24h)}</span></button>`}
/* Every factor the player can be asked to mark, paired with the piece of
   evidence that justifies it. If the evidence is not on screen, the factor
   is not offered — the game's own rule is that a good decision must follow
   from visible data only. */
const FACTOR_LIB={
  liquidity:{label:'Thin liquidity',hint:'Limited market depth may make an exit difficult.',evidence:'Liquidity depth'},
  holders:{label:'Holder concentration',hint:'A few wallets can control price movement.',evidence:'Holder concentration'},
  mutable:{label:'Mutable contract',hint:'The token supply rules may still be changed.',evidence:'Contract state'},
  pressure:{label:'Sell pressure',hint:'Selling activity currently exceeds buying.',evidence:'Buy / sell split'},
  lp:{label:'Unlocked liquidity',hint:'The liquidity pool can potentially be removed.',evidence:'Liquidity pool'},
  mint:{label:'Active mint authority',hint:'New token supply can still be issued.',evidence:'Mint authority'},
  age:{label:'Very young token',hint:'Too little history to judge its behaviour.',evidence:'Token age'}
};
function visibleFactors(signal){
  const market=signal.market||{},list=['liquidity'];
  if(Number.isFinite(Number(signal.concentration)))list.push('holders');
  if(typeof signal.mutable==='boolean')list.push('mutable');
  if(Number.isFinite(Number(market.buys))&&Number.isFinite(Number(market.sells)))list.push('pressure');
  if(typeof market.lpLocked==='boolean')list.push('lp');
  if(typeof market.mintRevoked==='boolean')list.push('mint');
  if(Number.isFinite(Number(market.ageHours)))list.push('age');
  return list;
}
const ageLabel=hours=>{const h=Number(hours)||0;return h>=48?Math.round(h/24)+'d':Math.round(h)+'h'};

function signalDetail(signal){
  const market=signal.market||{},up=Number(market.change24h)>=0;
  const visible=visibleFactors(signal);
  const hasConcentration=Number.isFinite(Number(signal.concentration));
  const hasMutable=typeof signal.mutable==='boolean';
  const hasWallets=Number.isFinite(Number(signal.smartWallets));

  /* The four readings below are the ones the station's risk model actually
     weighs. They used to be absent from the screen entirely — the liquidity
     tile showed a dollar figure, which is a different number from the depth
     score, and market activity was never surfaced at all. */
  const gauge=(label,value,percent,tone,note)=>`<div class="evidence ${tone}"><div class="evidence-head"><span>${label}</span><b>${value}</b></div><div class="evidence-bar"><i style="width:${Math.max(2,Math.min(100,percent))}%"></i></div>${note?`<p class="evidence-note">${note}</p>`:''}</div>`;
  const locked=(label,requirement)=>`<div class="evidence locked"><div class="evidence-head"><span>${label}</span><b>${icon('i-lock','icon-sm')}</b></div><p class="evidence-note">${requirement}</p></div>`;

  const liquidityScore=Number(signal.liquidity)||0;
  const activityScore=Number(signal.activity)||0;
  const evidence=[
    gauge('Liquidity depth',liquidityScore,liquidityScore,liquidityScore<45?'bad':liquidityScore<65?'warn':'',money(market.liquidityUsd)+' pooled · '+money(market.volume24hUsd)+' traded in 24h'),
    hasConcentration?gauge('Holder concentration',signal.concentration+'%',signal.concentration,signal.concentration>60?'bad':signal.concentration>40?'warn':'',fmt(market.holders)+' holders on record'):locked('Holder concentration','Risk Analysis Center reveals the top-wallet share.'),
    gauge('Market activity',activityScore,activityScore,activityScore<35?'bad':activityScore<55?'warn':'','Sustained trading reduces the station risk reading.'),
    hasMutable?gauge('Contract state',signal.mutable?'Mutable':'Locked',signal.mutable?100:0,signal.mutable?'bad':'','Whether the supply rules can still be rewritten.'):locked('Contract state','Risk Analysis Center reveals contract permissions.')
  ].join('');

  const buys=Number(market.buys)||0,sells=Number(market.sells)||0,total=buys+sells||1;
  const flow=`<div class="evidence ${sells>buys?'bad':''}"><div class="evidence-head"><span>Buy / sell split</span><b>${Math.round(buys/total*100)}%</b></div><div class="ratio"><i class="buys" style="width:${buys/total*100}%"></i><i class="sells" style="width:${sells/total*100}%"></i></div><div class="ratio-legend"><span class="buys">${fmt(buys)} buys</span><span class="sells">${fmt(sells)} sells</span></div></div>`;

  const metric=(label,value,bad)=>`<div class="metric ${bad?'bad':''}"><span>${label}</span><b>${value}</b></div>`;
  const context=[
    metric('Token age',ageLabel(market.ageHours),Number(market.ageHours)<72),
    metric('From peak',pct(market.fromPeak),Number(market.fromPeak)<-40),
    metric('Market cap',money(market.marketCapUsd),false),
    typeof market.lpLocked==='boolean'?metric('Liquidity pool',market.lpLocked?'Locked':'Unlocked',!market.lpLocked):'',
    typeof market.mintRevoked==='boolean'?metric('Mint authority',market.mintRevoked?'Revoked':'Active',!market.mintRevoked):'',
    hasWallets?metric('Smart wallets',fmt(signal.smartWallets),false):''
  ].join('');

  const marked=visible.filter(id=>state.factors.has(id)).length;
  return `<button class="signal-back" data-signal-back type="button">${icon('i-back','icon-sm')}All intercepted signals</button>`
    +`<div class="card accent"><div class="token-head"><div><div class="eyebrow">${signal.source==='xradar'?'Live XRadar signal':'Station simulation'}</div><h3>${esc(signal.name)}</h3></div><div class="token-price"><b class="${up?'up':'down'}">${pct(market.change24h)}</b><span>observed movement</span></div></div><canvas id="signalChart" class="chart"></canvas>${signal.riskBand?`<div class="chips"><span class="chip">Analysis hint: ${signal.riskBand.toUpperCase()} risk band</span></div>`:''}</div>`
    +`<div class="section-title">Station readings</div><div class="evidence-grid">${evidence}${flow}</div>`
    +`<div class="section-title">Market context</div><div class="metrics">${context}</div>`
    +`<div class="section-title">Mark the warning signs you can see</div>`
    +`<div class="factor-count"><span>Every sign below is backed by a reading above.</span><b id="factorCount">${marked}/${visible.length}</b></div>`
    +visible.map(id=>{const f=FACTOR_LIB[id];return `<button class="factor ${state.factors.has(id)?'selected':''}" data-factor="${id}" type="button"><i>${icon('i-check')}</i><span><b>${f.label}</b><span>${f.hint}</span></span></button>`}).join('')
    +`<div class="assessment"><button class="safe" data-assessment="study" type="button">Clear for research</button><button class="risky" data-assessment="skip" type="button">Flag as dangerous</button></div>`;
}
function expectedFactors(signal){
  const market=signal.market||{},visible=new Set(visibleFactors(signal)),set=new Set();
  if(visible.has('liquidity')&&Number(signal.liquidity)<45)set.add('liquidity');
  if(visible.has('holders')&&Number(signal.concentration)>60)set.add('holders');
  if(visible.has('mutable')&&signal.mutable===true)set.add('mutable');
  if(visible.has('pressure')&&Number(market.sells)>Number(market.buys))set.add('pressure');
  if(visible.has('lp')&&market.lpLocked===false)set.add('lp');
  if(visible.has('mint')&&market.mintRevoked===false)set.add('mint');
  if(visible.has('age')&&Number(market.ageHours)<72)set.add('age');
  return set;
}
/* Naming which signs were missed teaches the skill. "You identified 2" does
   not — it was the only feedback the player used to get. */
function resultMarkup(result){
  const expected=state.lastExpected,visible=state.lastVisible||[];
  const hits=visible.filter(id=>expected.has(id)&&state.factors.has(id));
  const missed=visible.filter(id=>expected.has(id)&&!state.factors.has(id));
  const wrong=visible.filter(id=>!expected.has(id)&&state.factors.has(id));
  const row=(id,kind,note)=>`<div class="verdict-row ${kind}"><i>${icon(kind==='hit'?'i-check':kind==='miss'?'i-alert':'i-minus','icon-sm')}</i><div><b>${FACTOR_LIB[id].label}</b><span>${note}</span></div></div>`;
  const breakdown=[
    ...hits.map(id=>row(id,'hit','Correctly read from '+FACTOR_LIB[id].evidence.toLowerCase()+'.')),
    ...missed.map(id=>row(id,'miss','Missed. The evidence was on screen under '+FACTOR_LIB[id].evidence.toLowerCase()+'.')),
    ...wrong.map(id=>row(id,'false','Marked, but the readings did not support it.'))
  ].join('');
  return `<div class="result ${result.correct?'':'bad'}"><b>${result.correct?'Assessment confirmed':'Assessment reviewed'}</b><p>${esc(result.explanation)}</p></div>`
    +`<div class="card"><div class="stat-grid"><div class="stat"><b>${result.risk}</b><span>Risk score</span></div><div class="stat"><b>+${result.reward.data||0}</b><span>Intel</span></div><div class="stat"><b>+${(result.reward.components||0)+(result.reward.dailyComponents||0)}</b><span>Parts</span></div></div>${result.rareFind?'<p style="margin-top:var(--s-3)">Rare wallet-interceptor find: +1 Part.</p>':''}</div>`
    +(breakdown?`<div class="section-title">How you read the evidence</div><div class="verdict">${breakdown}</div>`:'')
    +`<div class="card" style="margin-top:var(--s-4)"><button class="secondary full" data-result-close type="button">Return to signals</button>${state.game.progression.onboarding.completed?'<button class="primary live-scan" data-live-scan type="button">Open live XRadar terminal</button>':''}</div>`;
}

/* Charts are painted synchronously and re-painted from a ResizeObserver.
   The earlier version waited on requestAnimationFrame, which never fires
   while the page is not compositing — a backgrounded mini app, a throttled
   WebView — and left an unsized 300x150 canvas behind. The observer also
   covers rotation and the Telegram viewport resizing under the keyboard. */
const canvasObserver=new ResizeObserver(entries=>{
  for(const entry of entries){
    if(entry.contentRect.width<2)continue;
    entry.target._paint?.();
  }
});
function mountCanvas(canvas,paint){
  canvas._paint=paint;
  paint();
  canvasObserver.observe(canvas);
}

/* Canvas sizing follows devicePixelRatio, so the line is not a soft blur on
   the 3x screens most of these players are holding. */
function fitCanvas(canvas,cssHeight){
  const dpr=Math.min(2.5,window.devicePixelRatio||1);
  const width=canvas.getBoundingClientRect().width||canvas.parentElement?.getBoundingClientRect().width||0;
  const height=cssHeight||canvas.getBoundingClientRect().height;
  if(width<2||height<2)return null;
  canvas.width=Math.round(width*dpr);
  canvas.height=Math.round(height*dpr);
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);
  return {ctx,width,height};
}
function seriesPath(ctx,values,x0,y0,w,h){
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  ctx.beginPath();
  values.forEach((value,index)=>{
    const x=x0+w*index/(values.length-1);
    const y=y0+h*(1-(value-min)/range);
    index?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  const lastX=x0+w,lastY=y0+h*(1-(values[values.length-1]-min)/range);
  return {lastX,lastY};
}
function drawSpark(signal){
  const canvas=q('[data-spark="'+CSS.escape(signal.id)+'"]');
  if(!canvas)return;
  const values=signal.market?.priceSeries||[];
  if(!values.length)return;
  const color=Number(signal.market?.change24h)>=0?'#4fe39b':'#ff6f5e';
  mountCanvas(canvas,()=>paintSpark(canvas,values,color));
}
function paintSpark(canvas,values,color){
  const fitted=fitCanvas(canvas,34);
  if(!fitted)return;
  const {ctx,width,height}=fitted;
  ctx.lineWidth=1.75;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=color;
  seriesPath(ctx,values,2,4,width-4,height-8);
  ctx.stroke();
}
function drawChart(market){
  const canvas=$('signalChart');
  if(!canvas)return;
  const values=market?.priceSeries||[];
  if(!values.length)return;
  mountCanvas(canvas,()=>paintChart(canvas,market,values));
}
function paintChart(canvas,market,values){
  const volumes=market?.volumeSeries||[];
  const color=Number(market?.change24h)>=0?'#4fe39b':'#ff6f5e';
  const fitted=fitCanvas(canvas,150);
  if(!fitted)return;
  const {ctx,width,height}=fitted;
  const volH=volumes.length?26:0;
  const plotH=height-volH-14;

  ctx.strokeStyle='rgba(150,190,198,.1)';ctx.lineWidth=1;
  for(let i=1;i<3;i++){const y=Math.round(plotH*i/3)+0.5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke()}

  const {lastX,lastY}=seriesPath(ctx,values,1,6,width-2,plotH-12);
  ctx.save();
  ctx.lineTo(width-1,plotH);ctx.lineTo(1,plotH);ctx.closePath();
  const fill=ctx.createLinearGradient(0,0,0,plotH);
  fill.addColorStop(0,color+'40');fill.addColorStop(1,color+'00');
  ctx.fillStyle=fill;ctx.fill();
  ctx.restore();

  seriesPath(ctx,values,1,6,width-2,plotH-12);
  ctx.lineWidth=2.25;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=color;ctx.stroke();

  /* The live end of the series gets a marker, so "now" is unambiguous. */
  ctx.beginPath();ctx.arc(lastX-1,lastY,3,0,Math.PI*2);
  ctx.fillStyle=color;ctx.fill();
  ctx.beginPath();ctx.arc(lastX-1,lastY,6,0,Math.PI*2);
  ctx.strokeStyle=color+'55';ctx.lineWidth=1.5;ctx.stroke();

  /* Volume beneath the price. It was in the payload all along and never drawn. */
  if(volumes.length){
    const peak=Math.max(...volumes)||1;
    const step=width/volumes.length;
    const barW=Math.max(1,step-1);
    ctx.fillStyle='rgba(150,190,198,.22)';
    volumes.forEach((value,index)=>{
      const h=Math.max(1,(value/peak)*volH);
      ctx.fillRect(index*step,height-h,barW,h);
    });
  }
}

/* ==========================================================================
   Missions
   ========================================================================== */

/* Operations and Storage are sheets, not tabs. They build their markup on open
   instead of living in the DOM behind a hidden tab, so nothing renders while
   it is off screen and there is no gate cache to invalidate on a language
   switch. `state.sheet` records which one is open so an async load or a poll
   can repaint it in place. */
function operationsMarkup(){
  const game=state.game;
  const daily=game.progression.daily,season=game.progression.season;
  const achievements=game.progression.achievements,earned=new Set(achievements.earned);
  const tasks=game.tasks.map(task=>{const copy=taskCopy(task);return `<div class="task-row"><div class="mini-avatar">${icon(TASK_ICON[task.kind]||'i-flag','icon-sm')}</div><div class="row-copy"><b>${esc(copy.title)}</b><span>${esc(copy.desc)}</span></div><button class="secondary" data-task="${esc(task.id)}" type="button">Open</button></div>`}).join('')
    ||'<p>No urgent directives. Expand a room or assess a signal.</p>';
  const board=!state.leaderboard?'<p>Loading the accuracy board…</p>'
    :state.leaderboard.entries.length?state.leaderboard.entries.map(entry=>`<div class="board-row ${entry.self?'self':''}"><div class="rank-badge">${entry.rank}</div><div class="row-copy"><b>${esc(entry.name)}</b><span>Level ${entry.level} · ${entry.attempts} assessments</span></div>${entry.subscriber?'<span class="tag">Pass</span>':''}<span class="row-end">${entry.accuracy}%</span></div>`).join('')
    :'<p>Complete an assessment to enter the 30-day accuracy board.</p>';
  return `<div class="card">${tasks}</div>`
    +`<div class="section-title">Daily training</div><div class="card"><div class="card-top"><div><h3>Five-signal daily assessment</h3><p>Complete five assessments. The challenge measures accuracy, not clicks.</p></div><span class="tag">${daily.attempts}/5</span></div><div class="progress" style="margin-top:var(--s-4)"><i style="width:${Math.min(100,daily.attempts/5*100)}%"></i></div><div class="chips"><span class="chip">${daily.correct} correct</span><span class="chip gain">${daily.rewardClaimed?'Reward collected':'+5 Parts at 5 attempts'}</span></div></div>`
    +`<div class="section-title">Season</div><div class="card season amber"><span class="tag warn">${season.id}</span><h3 style="margin-top:var(--s-3)">City Under Glass</h3><p>Your bunker remains permanently. Only the accuracy board refreshes when the ${season.daysRemaining}-day season ends.</p><div class="chips"><span class="chip">${season.attempts} assessments</span><span class="chip">${season.accuracy}% accuracy</span></div></div>`
    +`<div class="section-title">Accuracy leaderboard</div><div class="card">${board}</div>`
    +`<div class="section-title">Achievements</div><div class="card">${Object.entries(achievements.definitions).map(([id,item])=>`<div class="achievement-row" style="${earned.has(id)?'':'opacity:.45'}"><div class="rank-badge">${earned.has(id)?icon('i-check','icon-sm'):icon('i-target','icon-sm')}</div><div class="row-copy"><b>${esc(item.title)}</b><span>${esc(item.description)}</span></div><span class="row-end">+${item.components} Parts</span></div>`).join('')}</div>`;
}
function storageMarkup(){
  const game=state.game,inventory=game.progression.inventory;
  const items=Object.entries(inventory.items).map(([id,item])=>{
    const owned=inventory.owned.includes(id),equipped=Object.values(game.hero.outfit).includes(id);
    return `<div class="item-row" style="${owned?'':'opacity:.42'}"><div class="item-icon">${icon('i-package','icon-sm')}</div><div class="row-copy"><b>${esc(item.name)}</b><span>${esc(item.effect)}</span></div><button class="secondary" data-equip="${id}" type="button" ${owned?'':'disabled'}>${equipped?'Equipped':'Equip'}</button></div>`
  }).join('');
  const shop=!state.catalog?'<div class="card"><p>Station support catalog is loading.</p></div>'
    :state.catalog.products.map(product=>{
      const available=product.starsEnabled||product.tonEnabled||state.config.allowDevAuth;
      const price=product.starsEnabled?product.stars+' Stars':product.tonEnabled?(Number(product.tonNano)/1e9)+' TON':'Local demo';
      return `<div class="shop-card"><h3>${esc(product.name)}</h3><p>${esc(product.description)}</p><button data-buy="${product.id}" data-method="${product.starsEnabled?'stars':product.tonEnabled?'ton':'demo'}" type="button" ${available?'':'disabled'}>${price}</button></div>`
    }).join('');
  const triggers=game.progression.conversionTriggers;
  const conversion=triggers.length?`<div class="card accent"><h3>Live terminal unlocked</h3><p>${esc(triggers[0].title)} This continues the action you already learned in the Lab.</p><button class="primary full" data-live-scan type="button">Open XRadar terminal</button></div>`:'';
  return `<div class="card">${items}</div><div class="section-title">Station support</div><div class="shop-list">${shop}</div>${conversion}`;
}
function openOperations(){
  state.sheet='operations';
  openSheet('Operations','DIRECTIVES · SEASON · RECORDS',operationsMarkup());
  if(!state.leaderboard)loadLeaderboard();
  tone(560);
}
function openStorage(){
  state.sheet='storage';
  openSheet('Equipment Locker','INVENTORY · STATION SUPPORT',storageMarkup());
  if(!state.catalog)loadCatalog();
  tone(560);
}
/** Repaint whichever sheet is open after an async load or a state change. */
function refreshSheet(){
  if(state.sheet==='operations')$('sheetBody').innerHTML=operationsMarkup();
  else if(state.sheet==='storage')$('sheetBody').innerHTML=storageMarkup();
}
async function loadLeaderboard(){try{state.leaderboard=await api('/api/game/leaderboard');refreshSheet()}catch{state.leaderboard={entries:[]};refreshSheet()}}
async function loadCatalog(){try{state.catalog=await api('/api/game/commerce/catalog');refreshSheet()}catch{}}

function renderReturn(){const report=state.game.progression.returnReport;$('returnModal').classList.toggle('hidden',!report);if(!report)return;let text='The station produced '+fmt(report.data)+' Intel during '+Number(report.hours||0).toFixed(1)+' productive hours.';if(report.full)text+=' Storage filled after '+report.capacityHours+' hours and production stopped for '+Number(report.stoppedHours||0).toFixed(1)+' hours.';if(report.streak)text+=' Login streak day '+report.streak.day+': +'+report.streak.components+' Parts'+(report.streak.passComponents?' and +'+report.streak.passComponents+' Pass Parts':'')+'.';$('returnText').textContent=text}
function resourceFly(text){const element=document.createElement('span');element.className='resource-fly';element.textContent=text;$('resourceFx').append(element);setTimeout(()=>element.remove(),1000)}

/* ==========================================================================
   Navigation
   ========================================================================== */

function setTab(tab){
  state.tab=tab;
  qa('.tab').forEach(element=>element.classList.toggle('active',element.id==='tab-'+tab));
  qa('[data-tab]').forEach(element=>element.classList.toggle('active',element.dataset.tab===tab));
  /* One rail slides between the three items instead of blobs fading. */
  $('nav').style.setProperty('--nav-index',TAB_INDEX[tab]??0);
  closeSheet();tone(420);haptic('select');
  if(tab==='signals'&&!state.signalId){state.factors.clear();state.lastResult=null;invalidate('signals')}
  renderActiveTab();
  syncBackButton();
}
/* The cutaway shows every floor at once, so there is no longer a camera to
   switch. The function survives only so the call sites that used to change view
   keep working; it now just names what is on screen. */
function setView(view){state.view=view;$('sceneTitle').textContent='Station'}
function openSheet(title,status,html){$('sheetTitle').textContent=title;$('sheetStatus').textContent=status;$('sheetBody').innerHTML=html;$('sheet').classList.add('open');syncBackButton()}
function closeSheet(){state.sheet=null;$('sheet').classList.remove('open');syncBackButton()}
function costMarkup(action){const cost=action.cost||{},reward=action.reward||{};return '<div class="chips">'+(cost.energy?'<span class="chip cost">−'+cost.energy+' Power</span>':'')+(cost.data?'<span class="chip cost">−'+fmt(cost.data)+' Intel</span>':'')+(cost.components?'<span class="chip cost">−'+cost.components+' Parts</span>':'')+(reward.data?'<span class="chip gain">+'+reward.data+' Intel</span>':'')+(reward.components?'<span class="chip gain">+'+reward.components+' Parts</span>':'')+(reward.xp?'<span class="chip gain">+'+reward.xp+' XP</span>':'')+(action.durationMs?'<span class="chip">'+duration(action.durationMs)+'</span>':'')+'</div>'}
function openObject(id){const object=state.game.objects.find(entry=>entry.id===id);if(!object)return;const copy=[object.name,object.description||''];let html='<p class="sheet-desc">'+esc(copy[1])+'</p>';if(object.action){if(object.action.type==='navigate')html+='<button class="primary sheet-action" data-navigate="'+esc(object.action.target)+'" type="button">'+(object.action.target==='map'?'Open intercepted signals':'Open equipment storage')+'</button>';else if(object.action.type==='build')html+=costMarkup(object.action)+'<button class="primary sheet-action" data-build="'+esc(object.action.roomId)+'" type="button" '+(object.action.enabled?'':'disabled')+'>'+esc(object.action.label||'Build room')+'</button>';else{const action=actionCopy(object.action);html+='<p class="sheet-desc">'+esc(action[1])+'</p>'+costMarkup(object.action)+'<button class="primary sheet-action" data-action="'+esc(object.action.id)+'" type="button" '+(object.action.enabled?'':'disabled')+'>'+esc(action[0])+'</button>'}}else html+='<div class="card"><h3>System standing by</h3><p>No manual operation is currently required.</p></div>';openSheet(copy[0],object.status||'Station object',html);tone(560)}
function openRoom(id){const room=state.game.rooms[id];if(!room)return;let html=`<p class="sheet-desc">${esc(room.short)}</p><div class="card accent"><h3>Gameplay effect</h3><p>${esc(room.effect)}</p></div>`;if(room.construction){html+=`<div class="card amber"><h3>Construction in progress</h3><p>Level ${room.construction.targetLevel} · ${duration(room.construction.remainingMs)} remaining</p><div class="progress" style="margin-top:var(--s-3)"><i style="width:${Math.round(room.construction.progress*100)}%"></i></div></div>`}else if(!room.level&&!room.unlocked){html+=`<div class="card"><h3>Locked foundation</h3><p>${esc(room.lockReason)}</p></div>`}else if(room.nextUpgrade){html+=`<div class="card"><div class="card-top"><div><h3>${room.level?'Upgrade to level '+room.nextUpgrade.level:'Open room'}</h3><p>Maximum level is 10.</p></div><span class="tag">LV ${room.level}</span></div>${costMarkup({cost:room.nextUpgrade,durationMs:room.nextUpgrade.durationMs})}</div><button class="primary sheet-action" data-build="${id}" type="button">${room.level?'Start upgrade':'Open room'}</button>`}else html+='<div class="card"><h3>Level 10 reached</h3><p>This room is fully upgraded.</p></div>';openSheet(room.name,room.level?'LEVEL '+room.level:room.unlocked?'FOUNDATION READY':'LOCKED',html)}
function followTask(task){if(!task)return;if(task.target==='map'){setTab('signals');return}setTab('lab');const id=({bunker:'terminal',inventory:'locker'})[task.target]||task.target;moveOperatorToObject(id);setTimeout(()=>openObject(id),620)}

/* ==========================================================================
   Actions
   ========================================================================== */

/* `response.path` is the node sequence the server walked to reach the target.
   It was computed on every one of these routes and thrown away by the old
   client, which is why the operator used to slide straight through walls. */
async function startAction(id){try{const response=await api('/api/game/action/start',{method:'POST',body:{actionId:id}});closeSheet();setGame(response.game);runWalk(response.path);tone(690);haptic('medium')}catch(error){notify(error.message,true);haptic('error')}}
async function startBuild(id){try{const response=await api('/api/game/build',{method:'POST',body:{roomId:id}});closeSheet();setGame(response.game);runWalk(response.path);tone(690);haptic('medium')}catch(error){notify(error.message,true);haptic('error')}}
async function equip(id){try{const response=await api('/api/game/inventory/equip',{method:'POST',body:{itemId:id}});setGame(response.game);refreshSheet();notify('Equipment updated and visible on the operator.');tone(640);haptic('success')}catch(error){notify(error.message,true);haptic('error')}}
async function assess(decision){const signal=state.game.progression.recon.signals.find(entry=>entry.id===state.signalId);if(!signal)return;state.lastExpected=expectedFactors(signal);state.lastVisible=visibleFactors(signal);try{const response=await api('/api/game/recon/resolve',{method:'POST',body:{signalId:signal.id,decision}});state.lastResult=response.result;state.game=response.game;invalidate('signals');renderAll();setTab('signals');state.lastResult=response.result;invalidate('signals');renderSignals();tone(response.result.correct?820:240,.13);haptic(response.result.correct?'success':'warning');schedulePoll()}catch(error){notify(error.message,true);haptic('error')}}
async function syncLive(){try{const response=await api('/api/game/recon/sync-live',{method:'POST',body:{}});state.signalId=null;invalidate('signals');setGame(response.game);notify('Live XRadar wave loaded.')}catch(error){notify(error.message,true)}}
function openLiveScan(){const url=state.config?.xradarBaseUrl;if(url){try{if(tg?.openLink)tg.openLink(url);else window.open(url,'_blank','noopener')}catch{window.open(url,'_blank','noopener')}}else notify('Connect XRADAR_BASE_URL to enable live scans.')}
async function saveOperator(){state.editor.callSign=$('callSign').value.trim()||'Operator';try{const response=await api('/api/game/profile/appearance',{method:'POST',body:state.editor});state.editorDirty=false;state.editor={...defaultEditor,...response.appearance};localStorage.setItem(storageKey,JSON.stringify(state.editor));setGame(response.game);notify('Operator profile saved to the station.');tone(760);haptic('success')}catch(error){notify(error.message,true);haptic('error')}}
async function saveCosmetic(key,value){const cosmetics={...state.game.profile.cosmetics,[key]:value};try{const response=await api('/api/game/profile/cosmetics',{method:'POST',body:cosmetics});invalidate('cosmetics');setGame(response.game);notify('Station appearance updated.');haptic('select')}catch(error){notify(error.message,true)}}
async function connectReferral(){const code=$('referralInput')?.value.trim();if(!code)return notify('Enter a referral code.',true);try{const response=await api('/api/game/referral/connect',{method:'POST',body:{code,deviceId:deviceId()}});invalidate('referral');setGame(response.game);notify('Referral connected. It qualifies after level 3 and one signal.')}catch(error){notify(error.message,true)}}
function showIncidentSheet(){const incident=state.game.progression.incidents.active;if(!incident)return;renderLab();setView('lab');tone(210,.18);setTimeout(()=>tone(260,.18),260);haptic('error');openSheet(incident.title,'TACTICAL INCIDENT',`<p class="sheet-desc">${esc(incident.description)}</p><div class="card amber"><h3>Choose a countermeasure</h3><p>Each response has a different Power cost and recovery reward.</p></div>${incident.options.map((option,index)=>`<button class="${index?'secondary':'primary'} sheet-action" data-incident-action="${option.id}" type="button">${esc(option.label)} · −${option.energy} Power · +${option.reward.data||0} Intel${option.reward.components?' · +'+option.reward.components+' Parts':''}</button>`).join('')}`)}
async function openIncident(){if(!state.game.progression.onboarding.completed){openOperations();notify('Complete the restoration protocol first.');return}if(state.game.progression.incidents?.active){showIncidentSheet();return}if(!state.game.progression.incidents?.ready){notify('Security systems are still analyzing the last incident.');return}try{const response=await api('/api/game/incident/start',{method:'POST',body:{}});setGame(response.game);showIncidentSheet()}catch(error){notify(error.message,true);haptic('error')}}
async function resolveIncident(action){try{const response=await api('/api/game/incident/resolve',{method:'POST',body:{action}});closeSheet();setGame(response.game);notify(response.result.message);tone(820,.14);haptic('success')}catch(error){notify(error.message,true);haptic('error')}}
function resourceInfo(type){const game=state.game,copy={intel:['Intel','Produced by the Command Lab. Automation increases offline production.','Current production: '+fmt(game.resources.productionPerHour)+'/h · offline '+fmt(game.resources.offlineProductionPerHour)+'/h · storage '+game.resources.offlineCapacityHours+'h'],power:['Power','Limits active operations and construction. The Power Room raises capacity and regeneration.','Regeneration: '+fmt(game.resources.energyRegenPerHour)+'/h'],parts:['Parts','Never produced passively. Earn them from supplies, streaks, assessments, achievements and qualified referrals.','Next supply: '+(game.progression.supply.ready?'ready now':duration(game.progression.supply.remainingMs))]};const item=copy[type];openSheet(item[0],'RESOURCE',`<p class="sheet-desc">${item[1]}</p><div class="card accent"><h3>Current rule</h3><p>${item[2]}</p></div>`)}

async function purchase(productId,method){try{const response=await api('/api/game/commerce/order',{method:'POST',body:{productId,method:method==='demo'?'stars':method,demo:method==='demo'}});if(response.demo){const completed=await api('/api/dev/commerce/fulfill',{method:'POST',body:{orderId:response.orderId}});setGame(completed.game);notify('Local demo purchase fulfilled.');haptic('success');return}if(method==='stars'){if(!tg?.openInvoice)throw new Error('Open the game inside Telegram to use Stars.');tg.openInvoice(response.invoiceLink,status=>{if(status==='paid')refresh().catch(()=>{});else if(status==='failed')notify('Payment failed.',true)});return}await sendTon(response.transaction,response.orderId)}catch(error){notify(error.message,true)}}
async function sendTon(transaction,orderId){try{if(!window.TON_CONNECT_UI)await loadScript('https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js');state.ton||=new window.TON_CONNECT_UI.TonConnectUI({manifestUrl:location.origin+'/tonconnect-manifest.json'});await state.ton.sendTransaction(transaction);notify('TON transaction sent. Verifying…');for(let attempt=0;attempt<12;attempt++){await new Promise(resolve=>setTimeout(resolve,3000));const result=await api('/api/game/commerce/ton/verify',{method:'POST',body:{orderId}});if(result.status==='paid'){setGame(result.game);notify('TON payment verified.');return}}notify('Payment sent. Verification is still pending.')}catch(error){notify(error.message,true)}}
function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Payment interface could not load.'));document.head.append(script)})}

/* ==========================================================================
   Events
   ========================================================================== */

document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.tab){setTab(button.dataset.tab);return}
  if(button.dataset.view){setView(button.dataset.view);return}
  if(button.dataset.viewOpen){closeSheet();setView(button.dataset.viewOpen);return}
  if(button.dataset.object){moveOperatorToObject(button.dataset.object);tone(330);haptic('light');setTimeout(()=>openObject(button.dataset.object),620);return}
  if(button.dataset.room){openRoom(button.dataset.room);return}
  if(button.dataset.roomFocus){setTab('lab');setView('overview');setTimeout(()=>openRoom(button.dataset.roomFocus),220);return}
  if(button.dataset.action){startAction(button.dataset.action);return}
  if(button.dataset.build){startBuild(button.dataset.build);return}
  if(button.dataset.navigate){closeSheet();if(button.dataset.navigate==='map')setTab('signals');else openStorage();return}
  if(button.dataset.signalOpen){state.signalId=button.dataset.signalOpen;state.factors.clear();invalidate('signals');renderSignals();syncBackButton();tone(570);haptic('light');return}
  if(button.hasAttribute('data-signal-back')){state.signalId=null;state.factors.clear();invalidate('signals');renderSignals();syncBackButton();return}
  if(button.dataset.factor){toggleFactor(button);return}
  if(button.dataset.assessment){assess(button.dataset.assessment);return}
  if(button.hasAttribute('data-result-close')){state.lastResult=null;state.signalId=null;state.factors.clear();invalidate('signals');renderSignals();syncBackButton();return}
  if(button.hasAttribute('data-sync-live')){syncLive();return}
  if(button.hasAttribute('data-live-scan')){openLiveScan();return}
  if(button.dataset.equip){equip(button.dataset.equip);return}
  if(button.dataset.task){followTask(state.game.tasks.find(task=>task.id===button.dataset.task));return}
  if(button.dataset.incidentAction){resolveIncident(button.dataset.incidentAction);return}
  if(button.dataset.gender){state.editor.gender=button.dataset.gender;state.editorDirty=true;haptic('select');invalidate('crewStats');renderCrew();renderUnits();return}
  if(button.dataset.language){saveLanguage(button.dataset.language);return}
  if(button.dataset.cosmeticKey){saveCosmetic(button.dataset.cosmeticKey,button.dataset.cosmeticValue);return}
  if(button.hasAttribute('data-referral-connect')){connectReferral();return}
  if(button.dataset.buy){purchase(button.dataset.buy,button.dataset.method);return}
  if(button.dataset.resourceInfo){resourceInfo(button.dataset.resourceInfo);return}
});

/* Toggling a risk factor mutates one button. It used to rebuild the whole
   screen, which cancelled the check animation it was supposed to play. */
function toggleFactor(button){
  const id=button.dataset.factor;
  const on=!state.factors.has(id);
  on?state.factors.add(id):state.factors.delete(id);
  button.classList.toggle('selected',on);
  const counter=$('factorCount');
  if(counter){
    const signal=state.game.progression.recon.signals.find(entry=>entry.id===state.signalId);
    const visible=signal?visibleFactors(signal):[];
    counter.textContent=visible.filter(entry=>state.factors.has(entry)).length+'/'+visible.length;
  }
  tone(on?520:400);haptic('select');
}

document.addEventListener('input',event=>{
  if(event.target.dataset.editorRange){state.editor[event.target.dataset.editorRange]=Number(event.target.value);state.editorDirty=true;appearanceStyle($('operatorVisual'));appearanceStyle($('operatorUnit'))}
  else if(event.target.id==='callSign'){state.editorDirty=true;state.editor.callSign=event.target.value;$('operatorName').textContent=event.target.value||'Operator';$('operatorUnitLabel').textContent=event.target.value||'Operator'}
});
$('saveOperator').addEventListener('click',saveOperator);
$('sheetClose').addEventListener('click',closeSheet);
$('goalButton').addEventListener('click',()=>followTask(state.game?.recommendedTask));
$('operationsButton').addEventListener('click',openOperations);
$('incidentButton').addEventListener('click',openIncident);
$('soundButton').addEventListener('click',()=>{setAmbient(!state.sound);tone(620);haptic('light')});
$('levelButton').addEventListener('click',()=>setTab('crew'));
$('returnAccept').addEventListener('click',async()=>{try{const response=await api('/api/game/report/ack',{method:'POST',body:{}});setGame(response.game);haptic('success')}catch(error){notify(error.message,true)}});

/* ==========================================================================
   Boot
   ========================================================================== */

async function enterGame(){
  const response=await api('/api/game');
  $('auth').classList.add('hidden');
  $('game').classList.remove('hidden');
  setGame(response.game);
  setView('lab');
  setAmbient(state.sound);
  syncBackButton();
}
async function authenticate(body){const startParam=tg?.initDataUnsafe?.start_param||new URLSearchParams(location.search).get('ref')||'';const response=await api('/api/auth/telegram',{method:'POST',body:{...body,deviceId:deviceId(),referralCode:startParam}});if(response.referralError)notify(englishError(response.referralError,'Referral could not be connected.'),true);await enterGame()}
async function boot(){
  initTelegram();
  try{
    state.config=await api('/api/config');
    try{await enterGame();return}catch(error){if(error.status!==401)throw error}
    if(tg?.initData)await authenticate({initData:tg.initData});
    else if(state.config.allowDevAuth){$('authButton').classList.remove('hidden');$('authStatus').textContent='Local secure environment ready.'}
    else $('authStatus').textContent='Open XRadar Lab from Telegram.';
  }catch(error){$('authStatus').textContent=error.message}
}
$('authButton').addEventListener('click',()=>authenticate({dev:true}).catch(error=>$('authStatus').textContent=error.message));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.game)refresh().catch(()=>{})});
boot();
