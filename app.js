'use strict';
(function(){
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const money0=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const pct=n=>new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+'%';
const parse=v=>{const s=String(v==null?'':v).trim().replace(/[\s€]/g,'');const t=s.includes(',')?s.replace(/\./g,'').replace(',','.'):/^\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,''):s;return t?Number(t):0;};
const IDS=['price','annualRate','years','downValue','financedFees','upfrontCreditFees','monthlyFees','otherUpfrontFees','appraisal','rateType','discount','tradeIn','balloon','targetMonthly'];
const defaults={
 mutuo:{price:'190000',annualRate:'3,50',years:'30',downValue:'10',downMode:'percent',appraisal:'190000',rateType:'fisso',targetMonthly:'700'},
 auto:{price:'30000',annualRate:'6,50',years:'6',downValue:'5000',downMode:'euro',appraisal:'0',rateType:'fisso',targetMonthly:'400'},
 prestito:{price:'10000',annualRate:'8,00',years:'5',downValue:'0',downMode:'euro',appraisal:'0',rateType:'fisso',targetMonthly:'200'}
};
for(const s of Object.values(defaults))for(const k of IDS)if(s[k]===undefined)s[k]='0';
const state={type:'mutuo',solution:'rata',advanced:false,data:JSON.parse(JSON.stringify(defaults)),result:null,info:null,selected:[],saved:[]};
const STORAGE='finance-calculator-archive-v1';
try{const x=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(x))state.saved=x.filter(y=>y&&y.id&&y.inputs).slice(0,500);}catch(e){}
let toastTimer;
function toast(msg){const n=$('toast');n.textContent=msg;n.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.hidden=true,3500);}
function saveStorage(){try{localStorage.setItem(STORAGE,JSON.stringify(state.saved));}catch(e){toast('Salvataggio non disponibile: usa il backup JSON.');}}
function currentDown(){return document.querySelector('[data-down-mode].active')?.dataset.downMode||'euro';}
function snapshot(){const d={downMode:currentDown()};for(const id of IDS)d[id]=$(id).value;return d;}
function persistType(){state.data[state.type]=snapshot();}
function setDown(mode,convert){
 const input=$('downValue');
 if(convert){const n=parse(input.value),p=parse($('price').value);input.value=String(mode==='percent'?p>0?n/p*100:0:p*n/100).replace('.',',');}
 for(const b of document.querySelectorAll('[data-down-mode]'))b.classList.toggle('active',b.dataset.downMode===mode);
 $('downUnit').textContent=mode==='percent'?'%':'€';
}
function restore(data){for(const id of IDS)$(id).value=data[id]===undefined?'0':data[id];setDown(data.downMode||'euro',false);}
function setAdvanced(on){state.advanced=on;$('advancedFields').hidden=!on;for(const b of document.querySelectorAll('[data-mode]'))b.classList.toggle('active',b.dataset.mode===(on?'advanced':'basic'));$('advancedToggle').textContent=on?'Nascondi i costi ⌃':'Mostra tutti i costi ⌄';}
function setSolution(mode){state.solution=mode;for(const b of document.querySelectorAll('[data-solution]'))b.classList.toggle('active',b.dataset.solution===mode);$('budgetWrap').hidden=mode!=='budget';$('budgetExplanation').hidden=mode!=='budget';update();}
function showType(type){
 persistType();state.type=type;restore(state.data[type]);
 for(const b of document.querySelectorAll('.type-tab')){const active=b.dataset.type===type;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));}
 $('downWrap').hidden=type==='prestito';
 $('priceLabel').textContent=type==='mutuo'?"Prezzo dell'immobile":type==='auto'?'Prezzo auto':'Importo da ricevere';
 $('mortgageAdvanced').hidden=type!=='mutuo';$('autoAdvanced').hidden=type!=='auto';
 $('resultTypeBadge').textContent=type.toUpperCase();rateNotice();update();
}
function rateNotice(){$('variableNotice').hidden=!(state.type==='mutuo'&&$('rateType').value==='variabile');}
function getInputs(){
 const obj={};for(const id of IDS)if(id!=='rateType'){obj[id]=parse($(id).value);if(!Number.isFinite(obj[id]))throw Error('Campo non valido: '+id);}
 const type=state.type,mode=currentDown(),price=obj.price;
 if(obj.downValue<0||mode==='percent'&&obj.downValue>=100&&type!=='prestito')throw Error('Anticipo: inserisci una percentuale tra 0 e meno di 100.');
 return{type,price,annualRate:obj.annualRate,months:Math.round(obj.years*12),
 cashDown:type==='prestito'?0:mode==='percent'?price*obj.downValue/100:obj.downValue,
 financedFees:obj.financedFees,upfrontCreditFees:obj.upfrontCreditFees,monthlyFees:obj.monthlyFees,otherUpfrontFees:obj.otherUpfrontFees,
 discount:type==='auto'?obj.discount:0,tradeIn:type==='auto'?obj.tradeIn:0,balloon:type==='auto'?obj.balloon:0,
 appraisal:type==='mutuo'?obj.appraisal:0,rateType:$('rateType').value,downMode:mode,downValue:obj.downValue,targetMonthly:obj.targetMonthly};
}
function compute(){
 const inputs=getInputs();if(inputs.months<1||inputs.months>600)throw Error('La durata deve essere compresa tra 1 mese e 50 anni.');
 let applied=inputs,maxPrice=inputs.price;
 if(state.solution==='budget'){
  if(!(inputs.targetMonthly>0))throw Error('Inserisci una rata massima positiva.');
  const capacity=Finance.affordablePrincipal(inputs.targetMonthly,inputs.annualRate,inputs.months,inputs.balloon,inputs.monthlyFees);
  const base=capacity-inputs.financedFees;
  if(base<=0)throw Error('Il budget non copre le spese del finanziamento.');
  if(inputs.downMode==='percent'&&inputs.type!=='prestito'){
   maxPrice=(base+inputs.discount+inputs.tradeIn)/(1-inputs.downValue/100);
   applied={...inputs,price:maxPrice,cashDown:maxPrice*inputs.downValue/100};
  }else{maxPrice=base+inputs.cashDown+inputs.discount+inputs.tradeIn;applied={...inputs,price:maxPrice};}
 }
 return{result:Finance.calculate(applied),inputs,maxPrice};
}
function update(){
 try{
  persistType();
  const p=parse($('price').value),d=parse($('downValue').value);if(Number.isFinite(p)&&Number.isFinite(d)&&state.type!=='prestito'){
   const down=currentDown()==='percent'?p*d/100:d;$('downHint').textContent=money0(down)+' di anticipo · '+pct(p>0?(p-down)/p*100:0)+' finanziato';}
  state.info=compute();state.result=state.info.result;render(state.info);
  $('errorBox').hidden=true;
  for(const id of ['saveSimulation','printSimulation','csvButton'])$(id).disabled=false;
 }catch(e){
  state.result=null;state.info=null;$('errorBox').textContent=e.message;$('errorBox').hidden=false;
  for(const id of ['saveSimulation','printSimulation','csvButton'])$(id).disabled=true;
  for(const id of ['mainMetric','capitalOutput','upfrontOutput','interestOutput','aprOutput','totalOutput'])$(id).textContent='—';
  $('chartLine').setAttribute('d','');$('chartArea').setAttribute('d','');
 }
}
function render(info){
 const r=info.result;
 $('mainMetricLabel').textContent=state.solution==='budget'?'Capitale finanziabile con il tuo budget':'Rata mensile';
 $('mainMetric').textContent=state.solution==='budget'?money0(r.baseLoan):money(r.monthlyOutlay);
 $('metricSubtitle').textContent=state.solution==='budget'?'Rata '+money(r.monthlyOutlay)+' · Prezzo massimo '+money0(info.maxPrice):'TAN '+pct(r.annualRate)+' · '+r.months+' rate';
 $('capitalOutput').textContent=money0(r.principal);$('upfrontOutput').textContent=money0(r.upfrontCash);
 $('interestOutput').textContent=money0(r.totalInterest);
 $('aprOutput').textContent=r.annualEffectiveRate===null?'n/d':pct(r.annualEffectiveRate);
 $('totalOutput').textContent=money0(r.totalCashOut);
 const fees=Math.max(0,r.totalPayments-r.totalInterest-r.principal),den=Math.max(1,r.totalPayments);
 $('capitalBar').style.width=100*r.principal/den+'%';
 $('interestBar').style.width=100*r.totalInterest/den+'%';
 $('feeBar').style.width=100*fees/den+'%';
 let note='TAN ipotetico. TAEG approssimato, non contrattuale. I costi non inseriti non sono stimati.';
 if(r.type==='mutuo'){const value=parse($('appraisal').value);const den=state.advanced&&value>0?Math.min(value,r.price):r.price;note+=' LTV indicativo: '+pct(r.baseLoan/den*100)+'.';if($('rateType').value==='variabile')note+=' Tasso variabile: TAN mantenuto costante solo per la simulazione.';}
 $('additionalNote').textContent=note;
 $('balloonNote').hidden=!(r.type==='auto'&&r.balloon>0);
 if(!$('balloonNote').hidden)$('balloonNote').textContent='Maxi rata finale di '+money(r.balloon)+' compresa nell’ultimo pagamento: '+money(r.schedule[r.schedule.length-1].payment+r.monthlyFees)+'.';
 $('printSummary').textContent=r.type.toUpperCase()+' — Capitale: '+money(r.principal)+'; TAN: '+pct(r.annualRate)+'; Rata: '+money(r.monthlyOutlay)+'; Durata: '+r.months+' mesi; Interessi: '+money(r.totalInterest)+'; Esborso complessivo: '+money(r.totalCashOut)+'.';
 chart(r);if(!$('schedulePanel').hidden)renderSchedule(r);
}
function chart(r){
 const points=[{balance:r.principal},...r.schedule],x=i=>5+i/(points.length-1)*320,y=v=>108-v/r.principal*98;
 const path=points.map((p,i)=>(i?'L':'M')+x(i).toFixed(2)+' '+y(p.balance).toFixed(2)).join(' ');
 $('chartLine').setAttribute('d',path);$('chartArea').setAttribute('d',path+' L325 108 L5 108 Z');
 $('chartEndDate').textContent=(r.months/12).toLocaleString('it-IT',{maximumFractionDigits:1})+' anni';
}
function renderSchedule(r){
 const tbody=$('scheduleBody'),frag=document.createDocumentFragment();
 for(const s of r.schedule){const tr=document.createElement('tr');
  for(const v of [s.month,money(s.payment+s.fee),money(s.interest),money(s.principal),money(s.balance)]){const td=document.createElement('td');td.textContent=v;tr.append(td);}
  frag.append(tr);}tbody.replaceChildren(frag);
}
function download(filename,text,mime){
 const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function exportCSV(){if(!state.result)return;
 const data=[['Mese','Rata','Spese rata','Interessi','Capitale','Debito residuo'],...state.result.schedule.map(s=>[s.month,s.payment,s.fee,s.interest,s.principal,s.balance])];
 const text='\ufeff'+data.map(row=>row.map(v=>'"'+String(typeof v==='number'?Math.round(v*100)/100:v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 download('piano-ammortamento.csv',text,'text/csv;charset=utf-8');toast('Piano di ammortamento esportato.');
}
function newId(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);}
function saveCurrent(name){
 if(!state.result)return;persistType();const r=state.result;
 state.saved.unshift({id:newId(),name:name||'Simulazione '+new Date().toLocaleDateString('it-IT'),created:new Date().toISOString(),type:state.type,
  inputs:{...state.data[state.type]},advanced:state.advanced,solution:state.solution,
  summary:{monthlyOutlay:r.monthlyOutlay,annualRate:r.annualRate,months:r.months,principal:r.principal,totalCashOut:r.totalCashOut,totalInterest:r.totalInterest,upfrontCash:r.upfrontCash}});
 state.saved=state.saved.slice(0,500);saveStorage();renderArchive();toast('Simulazione salvata.');
}
function loadRecord(id){
 const item=state.saved.find(x=>x.id===id);if(!item)return;const type=Object.hasOwn(defaults,item.type)?item.type:'mutuo';
 state.data[type]={...defaults[type],...item.inputs};state.advanced=!!item.advanced;state.solution=item.solution==='budget'?'budget':'rata';
 state.type=type;restore(state.data[type]);
 for(const b of document.querySelectorAll('.type-tab')){let yes=b.dataset.type===type;b.classList.toggle('active',yes);b.setAttribute('aria-selected',String(yes));}
 $('downWrap').hidden=type==='prestito';$('mortgageAdvanced').hidden=type!=='mutuo';$('autoAdvanced').hidden=type!=='auto';
 $('priceLabel').textContent=type==='mutuo'?"Prezzo dell'immobile":type==='auto'?'Prezzo auto':'Importo da ricevere';
 $('resultTypeBadge').textContent=type.toUpperCase();
 setAdvanced(state.advanced);for(const b of document.querySelectorAll('[data-solution]'))b.classList.toggle('active',b.dataset.solution===state.solution);
 $('budgetWrap').hidden=state.solution!=='budget';$('budgetExplanation').hidden=state.solution!=='budget';
 rateNotice();switchPage('calculatorPage');update();toast('Simulazione caricata.');
}
function delRecord(id){const item=state.saved.find(x=>x.id===id);if(!item||!confirm('Eliminare "'+item.name+'"?'))return;
 state.saved=state.saved.filter(x=>x.id!==id);state.selected=state.selected.filter(x=>x!==id);saveStorage();renderArchive();toast('Simulazione eliminata.');
}
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function renderArchive(){
 const list=$('savedList');list.replaceChildren();$('archiveCounter').textContent=state.saved.length;
 if(!state.saved.length){const item=el('div','empty-state');item.append(el('strong','', 'Nessuna simulazione salvata'),el('span','', 'Crea una simulazione e premi Salva.'));list.append(item);}
 for(const s of state.saved){
  const card=el('article','saved-card'),info=el('div'),actions=el('div','saved-actions');
  info.append(el('h3','',s.name),el('p','',s.type.toUpperCase()+' · '+new Date(s.created).toLocaleDateString('it-IT')+' · '+s.summary.months+' mesi'),el('strong','',money(s.summary.monthlyOutlay)+' / mese'));
  const open=el('button','','Apri'),remove=el('button','danger-button','Elimina');open.type='button';remove.type='button';open.onclick=()=>loadRecord(s.id);remove.onclick=()=>delRecord(s.id);
  const checkLabel=el('label','saved-check'),check=document.createElement('input');check.type='checkbox';check.checked=state.selected.includes(s.id);
  check.onchange=()=>{if(check.checked){if(state.selected.length===2){check.checked=false;toast('Confronta al massimo 2 simulazioni.');return;}state.selected.push(s.id);}else state.selected=state.selected.filter(id=>id!==s.id);renderComparison();};
  checkLabel.append(check,document.createTextNode(' Confronta'));actions.append(open,remove,checkLabel);card.append(info,actions);list.append(card);
 }renderComparison();
}
function renderComparison(){
 const panel=$('comparePanel');panel.hidden=state.selected.length!==2;if(panel.hidden)return;
 const items=state.selected.map(id=>state.saved.find(x=>x.id===id));if(items.some(x=>!x)){panel.hidden=true;return;}
 const table=document.createElement('table');for(const [index,row] of [
  ['Voce',items[0].name,items[1].name],
  ['Rata mensile',...items.map(x=>money(x.summary.monthlyOutlay))],
  ['Capitale finanziato',...items.map(x=>money(x.summary.principal))],
  ['Durata',...items.map(x=>x.summary.months+' mesi')],
  ['Interessi totali',...items.map(x=>money(x.summary.totalInterest))],
  ['Esborso complessivo',...items.map(x=>money(x.summary.totalCashOut))]
 ].entries()){
  const tr=document.createElement('tr');for(const text of row){const cell=document.createElement(index?'td':'th');cell.textContent=text;tr.append(cell);}table.append(tr);
 }$('compareTable').replaceChildren(table);
}
function switchPage(page){
 for(const n of document.querySelectorAll('.page'))n.hidden=n.id!==page;
 for(const b of document.querySelectorAll('.nav-button'))b.classList.toggle('active',b.dataset.page===page);
 if(page==='archivePage')renderArchive();window.scrollTo(0,0);
}
for(const n of document.querySelectorAll('.entry-panel input,.entry-panel select'))n.addEventListener('input',()=>{rateNotice();update();});
for(const b of document.querySelectorAll('.type-tab'))b.addEventListener('click',()=>showType(b.dataset.type));
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{setAdvanced(b.dataset.mode==='advanced');update();});
$('advancedToggle').addEventListener('click',()=>{setAdvanced(!state.advanced);update();});
for(const b of document.querySelectorAll('[data-down-mode]'))b.addEventListener('click',()=>{setDown(b.dataset.downMode,true);update();});
for(const b of document.querySelectorAll('[data-solution]'))b.addEventListener('click',()=>setSolution(b.dataset.solution));
for(const b of document.querySelectorAll('.nav-button'))b.addEventListener('click',()=>switchPage(b.dataset.page));
$('showSchedule').addEventListener('click',()=>{$('schedulePanel').hidden=!$('schedulePanel').hidden;if(!$('schedulePanel').hidden&&state.result){renderSchedule(state.result);$('schedulePanel').scrollIntoView({behavior:'smooth'});}});
$('csvButton').addEventListener('click',exportCSV);
$('printSimulation').addEventListener('click',()=>{if(state.result)window.print();});
$('saveSimulation').addEventListener('click',()=>{if(!state.result)return;$('simulationName').value='';$('saveDialog').showModal();});
$('saveDialog').addEventListener('close',()=>{if($('saveDialog').returnValue==='save'&&state.result)saveCurrent($('simulationName').value.trim());});
$('clearCompare').addEventListener('click',()=>{state.selected=[];renderArchive();});
$('exportBackup').addEventListener('click',()=>{download('finance-calculator-backup.json',JSON.stringify({app:'finance-calculator',version:1,exported:new Date().toISOString(),records:state.saved},null,2),'application/json');toast('Backup scaricato.');});
$('importBackup').addEventListener('click',()=>$('backupFile').click());
$('backupFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>2000000)throw Error('Backup troppo grande.');
  const data=JSON.parse(await file.text());if(data.app!=='finance-calculator'||!Array.isArray(data.records))throw Error('Formato non riconosciuto.');
  const existing=new Set(state.saved.map(x=>x.id));let count=0;
  for(const record of data.records.slice(0,500))if(record&&typeof record.id==='string'&&record.inputs&&record.summary&&['mutuo','auto','prestito'].includes(record.type)&&!existing.has(record.id)){state.saved.push(record);existing.add(record.id);count++;}
  state.saved=state.saved.slice(0,500);saveStorage();renderArchive();toast(count+' simulazioni importate.');
 }catch(err){toast('Importazione fallita: '+err.message);}finally{e.target.value='';}
});
window.addEventListener('online',()=>{$('connection').textContent='● Solo sul dispositivo';});
window.addEventListener('offline',()=>{$('connection').textContent='● Offline';});
if(!navigator.onLine)$('connection').textContent='● Offline';
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
restore(state.data.mutuo);setAdvanced(false);showType('mutuo');renderArchive();
})();