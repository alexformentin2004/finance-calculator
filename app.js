'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const euro = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
  const euro0 = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
  const pct = n => new Intl.NumberFormat('it-IT',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n)+'%';
  const parse = v => {
    if (typeof v === 'number') return v;
    const t = String(v ?? '').trim().replace(/\s|€/g,'');
    if(!t) return 0;
    const normalized = t.includes(',') ? t.replace(/\./g,'').replace(',','.') : (/^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g,'') : t);
    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  };
  const defaults = {
    mutuo:{price:'190000',annualRate:'3,50',years:'30',downValue:'10',downMode:'percent',financedFees:'0',upfrontCreditFees:'0',monthlyFees:'0',otherUpfrontFees:'0',appraisal:'190000',rateType:'fisso',discount:'0',tradeIn:'0',balloon:'0',targetMonthly:'700'},
    auto:{price:'30000',annualRate:'6,50',years:'6',downValue:'5000',downMode:'euro',financedFees:'0',upfrontCreditFees:'0',monthlyFees:'0',otherUpfrontFees:'0',appraisal:'30000',rateType:'fisso',discount:'0',tradeIn:'0',balloon:'0',targetMonthly:'400'},
    prestito:{price:'10000',annualRate:'8,00',years:'5',downValue:'0',downMode:'euro',financedFees:'0',upfrontCreditFees:'0',monthlyFees:'0',otherUpfrontFees:'0',appraisal:'0',rateType:'fisso',discount:'0',tradeIn:'0',balloon:'0',targetMonthly:'200'}
  };
  const inputIds=['price','annualRate','years','downValue','financedFees','upfrontCreditFees','monthlyFees','otherUpfrontFees','appraisal','rateType','discount','tradeIn','balloon','targetMonthly'];
  const state={type:'mutuo',advanced:false,solution:'rata',saved:[],compared:[],typeInputs:JSON.parse(JSON.stringify(defaults)),result:null,calcInfo:null};
  const STORAGE='finance-calculator-archive-v1';
  try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(raw))state.saved=raw.filter(item=>item&&item.inputs&&item.id).slice(0,500);}catch(_){/* Browser può limitare il localStorage in modalità privata. */}
  let toastTimer;
  function toast(msg){const el=$('toast');el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3500);}
  function store(){try{localStorage.setItem(STORAGE,JSON.stringify(state.saved));return true;}catch(_){toast('Salvataggio locale non disponibile: esporta un backup.');return false;}}
  function snapshot(){const s={};for(const id of inputIds)s[id]=$(id).value;s.downMode=document.querySelector('[data-down-mode].active')?.dataset.downMode||'euro';return s;}
  function syncCurrent(){state.typeInputs[state.type]=snapshot();}
  function restoreInputs(inputs){for(const id of inputIds)$(id).value=inputs[id]??defaults[state.type][id]??'0';setDownMode(inputs.downMode==='percent'?'percent':'euro',false);}
  function setDownMode(mode,convert){const field=$('downValue');if(convert){const current=parse(field.value),price=parse($('price').value);field.value=mode==='percent' ? String(price>0 ? Math.round(current/price*10000)/100 : 0).replace('.',',') : String(Math.round(price*current/100*100)/100).replace('.',',');}
    document.querySelectorAll('[data-down-mode]').forEach(b=>b.classList.toggle('active',b.dataset.downMode===mode));$('downUnit').textContent=mode==='percent'?'%':'€';
  }
const routeInfo={
  mutuo:{title:"Mutuo",eyebrow:"CASA",description:"Tutte le cifre per la tua prossima casa. Anticipo, rata, interessi e piano di rimborso.",features:["Anticipo e perizia","TAN fisso o scenario","Piano completo"],iconClass:"icon-mortgage"},
  auto:{title:"Finanziamento auto",eyebrow:"MOBILITÀ",description:"Valuta il costo reale dell'auto: rata, anticipo, permuta e maxi rata finale.",features:["Sconto e permuta","Maxi rata finale","Costo totale"],iconClass:"icon-car"},
  prestito:{title:"Prestito personale",eyebrow:"LIQUIDITÀ",description:"Simula un prestito, confronta rate e spese e scopri il capitale sostenibile.",features:["Importo desiderato","Spese accessorie","Rata o budget"],iconClass:"icon-loan"}
};
function applyTypeIdentity(type){
  const info=routeInfo[type];
  $('routeName').textContent=info.title;
  $('calcEyebrow').textContent=info.eyebrow;
  $('calcPageTitle').textContent=info.title;
  $('calcPageDescription').textContent=info.description;
  const icon=$('calcCategoryIcon');
  icon.className='calc-big-icon '+info.iconClass;
  const source=document.querySelector('[data-open-type="'+type+'"] .product-icon');
  if(source)icon.innerHTML=source.innerHTML;

}
  function showType(next){syncCurrent();state.type=next;document.body.dataset.financeType=next;applyTypeIdentity(next);restoreInputs(state.typeInputs[next]);document.querySelectorAll('.type-tab').forEach(b=>{const is=b.dataset.type===next;b.classList.toggle('active',is);b.setAttribute('aria-selected',String(is));});
    $('downWrap').hidden=next==='prestito';$('priceLabel').textContent=next==='mutuo'?"Prezzo dell'immobile":next==='auto'?'Prezzo auto':'Importo da ricevere';$('mortgageAdvanced').hidden=next!=='mutuo';$('autoAdvanced').hidden=next!=='auto';$('resultTypeBadge').textContent=next.toUpperCase();applyRateNotice();update();}
  function applyRateNotice(){$('variableNotice').hidden=!(state.type==='mutuo'&&$('rateType').value==='variabile');}
  function setAdvanced(active){state.advanced=active;$('advancedFields').hidden=!active;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===(active?'advanced':'basic')));$('advancedToggle').textContent=active?'Nascondi i costi ⌃':'Mostra tutti i costi ⌄';}
  function setSolution(mode){state.solution=mode;document.querySelectorAll('[data-solution]').forEach(b=>b.classList.toggle('active',b.dataset.solution===mode));$('budgetWrap').hidden=mode!=='budget';$('budgetExplanation').hidden=mode!=='budget';update();}
  function readInputs(){
    const fromIds={};for(const id of inputIds)if(id!=='rateType')fromIds[id]=parse($(id).value);
    for(const [key,value] of Object.entries(fromIds))if(!Number.isFinite(value))throw Error('Controlla il campo '+key+': inserisci un numero valido.');
    const price=fromIds.price,mode=document.querySelector('[data-down-mode].active')?.dataset.downMode||'euro';
    if(fromIds.downValue<0 || (mode==='percent'&&fromIds.downValue>=100&&state.type!=='prestito'))throw Error('L’anticipo percentuale deve essere compreso tra 0% e meno del 100%.');
    const cashDown=state.type==='prestito'?0:mode==='percent'?price*fromIds.downValue/100:fromIds.downValue;
    return {
      type:state.type,price,annualRate:fromIds.annualRate,months:Math.round(fromIds.years*12),cashDown,
      discount:state.type==='auto'?fromIds.discount:0,tradeIn:state.type==='auto'?fromIds.tradeIn:0,balloon:state.type==='auto'?fromIds.balloon:0,
      financedFees:fromIds.financedFees,
      upfrontCreditFees:fromIds.upfrontCreditFees,
      monthlyFees:fromIds.monthlyFees,
      otherUpfrontFees:fromIds.otherUpfrontFees,
      appraisal:state.type==='mutuo'?fromIds.appraisal:0,
      rateType:state.type==='mutuo'?$('rateType').value:'fisso',
      downMode:mode,downValue:fromIds.downValue,targetMonthly:fromIds.targetMonthly
    };
  }
  function compute(){
    const inputs=readInputs();
    if(inputs.months<1 || inputs.months>600)throw Error('Inserisci una durata tra 1 mese e 50 anni.');
    let applied=inputs,maxPrice=null,loanCapacity=null,priceAffordability=null;
    if(state.solution==='budget'){
      if(inputs.targetMonthly<=0)throw Error('Inserisci una rata-obiettivo positiva.');
      loanCapacity=Finance.affordablePrincipal(inputs.targetMonthly,inputs.annualRate,inputs.months,inputs.balloon,inputs.monthlyFees);
      const baseCapacity=loanCapacity-inputs.financedFees;
      if(baseCapacity<=0)throw Error('La rata-obiettivo non è sufficiente a finanziare le spese inserite.');
      if(inputs.downMode==='percent'&&state.type!=='prestito'){
        const fraction=1-inputs.downValue/100;
        maxPrice=(baseCapacity+inputs.tradeIn+inputs.discount)/fraction;
        applied={...inputs,price:maxPrice,cashDown:maxPrice*inputs.downValue/100};
      }else{
        maxPrice=baseCapacity+inputs.cashDown+inputs.tradeIn+inputs.discount;
        applied={...inputs,price:maxPrice};
      }
      priceAffordability=maxPrice-inputs.price;
    }
    const result=Finance.calculate(applied);
    return {result,inputs,maxPrice,loanCapacity,priceAffordability};
  }
  // Raggruppa più battute nello stesso frame: riduce i ricalcoli durante la digitazione su iPhone.
  let updateFrame=0;
  function queueInputUpdate(){
    if(updateFrame)cancelAnimationFrame(updateFrame);
    updateFrame=requestAnimationFrame(()=>{updateFrame=0;update();});
  }
  function update(){
    try{
      syncCurrent();
      const price=parse($('price').value),down=parse($('downValue').value),mode=document.querySelector('[data-down-mode].active')?.dataset.downMode;
      if(state.type!=='prestito'&&Number.isFinite(price)&&Number.isFinite(down)){
        const d=mode==='percent'?price*down/100:down;
        $('downHint').textContent=euro0(d)+' di anticipo · '+pct(price>0?(1-d/price)*100:0)+' finanziato (prima delle spese)';
      }
      const info=compute();state.result=info.result;state.calcInfo=info;renderResult(info);$('errorBox').hidden=true;
      $('saveSimulation').disabled=false;$('printSimulation').disabled=false;$('csvButton').disabled=false;
    }catch(e){state.result=null;state.calcInfo=null;$('errorBox').textContent=e.message;$('errorBox').hidden=false;
      $('quickResultValue').textContent='—';$('quickResult').disabled=true;
      $('mainMetric').textContent='—';['capitalOutput','upfrontOutput','interestOutput','aprOutput','totalOutput','regularOutput','recurringOutput','creditCostOutput','basePaymentOutput','monthlyFeesOutput','lastPaymentOutput'].forEach(id=>$(id).textContent='—');
      $('saveSimulation').disabled=true;$('printSimulation').disabled=true;$('csvButton').disabled=true;
      $('chartLine').setAttribute('d','');$('chartArea').setAttribute('d','');$('scheduleBody').replaceChildren();
    }
  }
  function renderResult(info){
    const r=info.result, variable=r.type==='mutuo'&&$('rateType').value==='variabile';
    $('quickResultLabel').textContent=state.solution==='budget'?'Capitale finanziabile':'Rata mensile stimata';
    $('quickResultValue').textContent=state.solution==='budget'?euro0(r.baseLoan):euro(r.monthlyOutlay);
    $('quickResult').disabled=false;
    $('mainMetricLabel').textContent=state.solution==='budget'?'Capitale finanziabile con il tuo budget':'Rata mensile';
    $('mainMetric').textContent=state.solution==='budget'?euro0(r.baseLoan):euro(r.monthlyOutlay);
    $('metricSubtitle').textContent=state.solution==='budget'
      ?`Rata ${euro(r.monthlyOutlay)} · Prezzo massimo ${euro0(info.maxPrice)}`
      :`TAN ${pct(r.annualRate)} · ${r.months} rate${variable?' · scenario costante':''}`;
    $('regularOutput').textContent=euro(r.regular);
    $('recurringOutput').textContent=euro(r.monthlyFees);
    $('creditCostOutput').textContent=euro(r.totalCreditCost);
    $('basePaymentOutput').textContent=euro(r.regular);
    $('monthlyFeesOutput').textContent=euro(r.monthlyFees);
    $('lastPaymentOutput').textContent=euro(r.schedule[r.schedule.length-1].payment+r.monthlyFees);
    $('capitalOutput').textContent=euro0(r.principal);
    $('upfrontOutput').textContent=euro0(r.upfrontCash);
    $('interestOutput').textContent=euro0(r.totalInterest);
    $('aprOutput').textContent=r.annualEffectiveRate===null?'n/d':pct(r.annualEffectiveRate);
    $('totalOutput').textContent=euro0(r.totalCashOut);
    const fees=r.totalPayments-r.totalInterest-r.principal;
    const total=Math.max(r.totalPayments,1);
    $('capitalBar').style.width=Math.max(0,100*r.principal/total)+'%';
    $('interestBar').style.width=Math.max(0,100*r.totalInterest/total)+'%';
    $('feeBar').style.width=Math.max(0,100*fees/total)+'%';
    let note='TAN ipotetico. TAEG annualizzato stimato dai flussi di rimborso: non è il TAEG ufficiale del contratto.';
    if(r.type==='mutuo'){
      const val=parse($('appraisal').value);const ltvDenom=state.advanced&&val>0?Math.min(val,r.price):r.price;
      note+=` LTV indicativo: ${pct(r.principal/ltvDenom*100)}${state.advanced?' (sul minore fra prezzo e perizia)':''}.`;
    }
    if(r.type==='auto'&&r.balloon>0)note+=' La rata finale comprende anche la maxi rata; la restituzione dell’auto non è simulata.';
    if(variable)note+=' Tasso variabile: proiezione con TAN invariato, senza prevedere revisioni future.';
    if(state.solution==='budget')note+=` Il prezzo desiderato è ${Math.abs(info.priceAffordability)<.01?'equivalente al budget':info.priceAffordability>=0?'inferiore al massimo stimato di '+euro0(info.priceAffordability):'superiore al massimo stimato di '+euro0(-info.priceAffordability)}.`;
    if(r.type==='auto'&&r.tradeIn>0)note+=' La permuta non è un esborso monetario ed è esclusa dall’esborso complessivo.';
    if(!state.advanced && (r.financedFees||r.upfrontCreditFees||r.otherUpfrontFees||r.monthlyFees)) note+=' I costi avanzati già inseriti restano inclusi.';
    $('balloonNote').hidden=!(r.type==='auto'&&r.balloon>0);
    $('balloonNote').textContent=r.type==='auto'&&r.balloon>0?'Attenzione: alla scadenza pagherai la maxi rata di '+euro(r.balloon)+' in aggiunta alla rata ordinaria e alle spese per rata.': ''; 
    $('additionalNote').textContent=note;
    renderChart(r);
    if(!$('schedulePanel').hidden)renderSchedule(r);
    $('printSummary').textContent=[
      `Tipologia: ${r.type.toUpperCase()}`,
      `Prezzo/Importo: ${euro(r.price)}`,
      `TAN: ${pct(r.annualRate)} · Durata: ${r.months} mesi`,
      `Anticipo in contanti: ${euro(r.cashDown)}`,
      `Capitale finanziato incluse spese: ${euro(r.principal)}`,
      `Rata periodica inclusi costi ricorrenti: ${euro(r.monthlyOutlay)}`,
      `Maxi rata finale aggiuntiva: ${euro(r.balloon)}`,
      `Interessi complessivi: ${euro(r.totalInterest)}`,
      `Totale rate e spese periodiche: ${euro(r.totalPayments)}`,
      `Spese iniziali, anticipo inclusi: ${euro(r.upfrontCash)}`,
      `Esborso monetario complessivo: ${euro(r.totalCashOut)}`,
      `TAEG indicativo: ${r.annualEffectiveRate===null?'n/d':pct(r.annualEffectiveRate)}`,
      `Data stampa: ${new Date().toLocaleDateString('it-IT')}`
    ].join('\n');
  }
  function renderChart(r){const W=320,top=10,bottom=108;
    const pts=[{month:0,balance:r.principal},...r.schedule.filter(s=>s.month%Math.max(1,Math.floor(r.months/55))===0||s.month===r.months)];
    const path=pts.map((s,i)=>`${i?'L':'M'}${(5+s.month/r.months*W).toFixed(1)} ${(bottom-s.balance/r.principal*(bottom-top)).toFixed(1)}`).join(' ');
    $('chartLine').setAttribute('d',path);$('chartArea').setAttribute('d',path+` L325 ${bottom} L5 ${bottom} Z`);
    $('chartEndDate').textContent=(r.months%12===0?r.months/12+' anni':r.months+' mesi');
  }
  function renderSchedule(r){const body=$('scheduleBody');const frag=document.createDocumentFragment();
    for(const s of r.schedule){const tr=document.createElement('tr');const cells=[s.month,euro(s.payment+s.fee),euro(s.interest),euro(s.principal),euro(s.balance)];
      for(const value of cells){const td=document.createElement('td');td.textContent=value;tr.append(td);}frag.append(tr);}
    body.replaceChildren(frag);
  }
  function download(filename,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  function exportCSV(){if(!state.result)return;const rows=[['Mese','Rata senza spese','Spese rata','Quota interessi','Quota capitale','Debito residuo'],...state.result.schedule.map(s=>[s.month,s.payment,s.fee,s.interest,s.principal,s.balance])];
    const csv='\uFEFF'+rows.map(r=>r.map(v=>typeof v==='number'?String(Math.round(v*100)/100).replace('.',','):v).map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
    download('piano-ammortamento.csv',csv,'text/csv;charset=utf-8');toast('Piano di ammortamento esportato.');}
  function newId(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);}
  function saveCurrent(name){syncCurrent();const record={id:newId(),name:name||'Simulazione '+new Date().toLocaleDateString('it-IT'),created:new Date().toISOString(),type:state.type,inputs:structuredClone(state.typeInputs[state.type]),advanced:state.advanced,solution:state.solution,
    summary:{monthlyOutlay:state.result.monthlyOutlay,annualRate:state.result.annualRate,months:state.result.months,principal:state.result.principal,totalCashOut:state.result.totalCashOut,totalInterest:state.result.totalInterest,upfrontCash:state.result.upfrontCash}};
    state.saved.unshift(record);if(state.saved.length>500)state.saved.length=500;store();renderArchive();toast('Simulazione salvata nell’archivio.');}
  function loadRecord(id){const record=state.saved.find(s=>s.id===id);if(!record)return;const type=['mutuo','auto','prestito'].includes(record.type)?record.type:'mutuo';state.typeInputs[type]={...defaults[type],...record.inputs};state.advanced=Boolean(record.advanced);state.solution=record.solution==='budget'?'budget':'rata';state.type=type;document.body.dataset.financeType=type;applyTypeIdentity(type);
    restoreInputs(state.typeInputs[type]);document.querySelectorAll('.type-tab').forEach(b=>{const active=b.dataset.type===type;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
    $('downWrap').hidden=type==='prestito';$('priceLabel').textContent=type==='mutuo'?"Prezzo dell'immobile":type==='auto'?'Prezzo auto':'Importo da ricevere';$('mortgageAdvanced').hidden=type!=='mutuo';$('autoAdvanced').hidden=type!=='auto';$('resultTypeBadge').textContent=type.toUpperCase();
    setAdvanced(state.advanced);document.querySelectorAll('[data-solution]').forEach(b=>b.classList.toggle('active',b.dataset.solution===state.solution));$('budgetWrap').hidden=state.solution!=='budget';$('budgetExplanation').hidden=state.solution!=='budget';applyRateNotice();switchPage(type+'Page');update();toast('Simulazione caricata: '+record.name);}
  function deleteRecord(id){const record=state.saved.find(s=>s.id===id);if(!record)return;if(!confirm(`Eliminare “${record.name}”?`))return;state.saved=state.saved.filter(s=>s.id!==id);state.compared=state.compared.filter(x=>x!==id);store();renderArchive();toast('Simulazione eliminata.');}
  function el(tag,cl,txt){const n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=txt;return n;}
  function renderArchive(){const list=$('savedList');list.replaceChildren();
    if(!state.saved.length){const empty=el('div','empty-state');empty.append(el('strong','', 'Nessuna simulazione salvata'),el('span','', 'Calcola una rata e premi “Salva simulazione”.'));list.append(empty);}
    for(const item of state.saved){const card=el('article','saved-card'),data=el('div'),title=el('h3','',item.name),date=el('p','',`${(item.type||'').toUpperCase()} · ${new Date(item.created).toLocaleDateString('it-IT')} · ${item.summary?.months||'?'} mesi`),money=el('strong','',euro(item.summary?.monthlyOutlay||0)+' / mese'),actions=el('div','saved-actions');
      data.append(title,date,money);
      const load=el('button','','Apri'),del=el('button','danger-button','Elimina');load.type=del.type='button';load.onclick=()=>loadRecord(item.id);del.onclick=()=>deleteRecord(item.id);
      const checkWrap=el('label','saved-check'),check=document.createElement('input');check.type='checkbox';check.checked=state.compared.includes(item.id);check.onchange=()=>{if(check.checked){if(state.compared.length>=2){check.checked=false;toast('Puoi confrontare fino a 2 simulazioni.');return;}state.compared.push(item.id);}else state.compared=state.compared.filter(x=>x!==item.id);renderComparison();};checkWrap.append(check,document.createTextNode('Confronta'));
      actions.append(load,del,checkWrap);card.append(data,actions);list.append(card);}
    renderComparison();

  }
  function renderComparison(){const panel=$('comparePanel');panel.hidden=state.compared.length!==2;if(panel.hidden)return;
    const items=state.compared.map(id=>state.saved.find(s=>s.id===id));if(items.some(v=>!v)){panel.hidden=true;return;}
    const table=document.createElement('table');table.className='compare-panel';
    const rows=[['Voce',items[0].name,items[1].name],['Rata mensile',...items.map(s=>euro(s.summary?.monthlyOutlay||0))],['Capitale finanziato',...items.map(s=>euro(s.summary?.principal||0))],['Durata',...items.map(s=>String(s.summary?.months||0)+' mesi')],['Interessi totali',...items.map(s=>euro(s.summary?.totalInterest||0))],['Esborso complessivo',...items.map(s=>euro(s.summary?.totalCashOut||0))]];
    for(const [idx,row] of rows.entries()){const tr=document.createElement('tr');for(const value of row){const cell=document.createElement(idx===0?'th':'td');cell.textContent=value;tr.append(cell);}table.append(tr);}$('compareTable').replaceChildren(table);
  }
  function switchPage(page){
    const requested=page==='mutuoPage'?'mutuo':page==='autoPage'?'auto':page==='prestitoPage'?'prestito':null;
    if(requested&&requested!==state.type)showType(requested);
    const actual=requested?'calculatorPage':page;
    document.querySelectorAll('.page').forEach(node=>node.hidden=node.id!==actual);
    document.querySelectorAll('.nav-button').forEach(btn=>{
      const active=btn.dataset.page===page;
      btn.classList.toggle('active',active);
      if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
    });
    document.body.dataset.activePage=page;
    if(page==='archivePage'||page==='homePage')renderArchive();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function install(){
    for(const input of document.querySelectorAll('.entry-panel input,.entry-panel select'))input.addEventListener('input',()=>{if(input.id==='rateType')applyRateNotice();queueInputUpdate();});
    document.querySelectorAll('.type-tab').forEach(b=>b.addEventListener('click',()=>showType(b.dataset.type)));
    document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{setAdvanced(b.dataset.mode==='advanced');update();}));
    $('advancedToggle').addEventListener('click',()=>{setAdvanced(!state.advanced);update();});
    document.querySelectorAll('[data-down-mode]').forEach(b=>b.addEventListener('click',()=>{setDownMode(b.dataset.downMode,true);update();}));
    document.querySelectorAll('[data-solution]').forEach(b=>b.addEventListener('click',()=>setSolution(b.dataset.solution)));
    document.querySelectorAll('.nav-button').forEach(b=>b.addEventListener('click',()=>switchPage(b.dataset.page)));
    document.querySelectorAll('[data-open-type]').forEach(b=>b.addEventListener('click',()=>switchPage(b.dataset.openType+'Page')));
    $('backHome').addEventListener('click',()=>switchPage('homePage'));
    $('quickResult').addEventListener('click',()=>{
      if(!state.result)return;
      $('results').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    });
    $('openArchive').addEventListener('click',()=>switchPage('archivePage'));
    $('backFromArchive').addEventListener('click',()=>switchPage('homePage'));
    $('showSchedule').addEventListener('click',()=>{$('schedulePanel').hidden=!$('schedulePanel').hidden;if(!$('schedulePanel').hidden&&state.result){renderSchedule(state.result);$('schedulePanel').scrollIntoView({behavior:'smooth',block:'start'});} });
    $('csvButton').addEventListener('click',exportCSV);
    $('printSimulation').addEventListener('click',()=>{if(state.result)window.print();});
    $('saveSimulation').addEventListener('click',()=>{if(!state.result)return;$('simulationName').value='';$('saveDialog').showModal();$('simulationName').focus();});
    $('saveDialog').addEventListener('close',()=>{if($('saveDialog').returnValue==='save'&&state.result)saveCurrent($('simulationName').value.trim());});
    $('clearCompare').addEventListener('click',()=>{state.compared=[];renderArchive();});
    $('exportBackup').addEventListener('click',()=>{download('finance-calculator-backup.json',JSON.stringify({app:'finance-calculator',version:1,exported:new Date().toISOString(),records:state.saved},null,2),'application/json;charset=utf-8');toast('Backup scaricato.');});
    $('importBackup').addEventListener('click',()=>$('backupFile').click());
    $('backupFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;
      try{if(file.size>2_000_000)throw Error('Il backup supera i 2 MB.');const content=JSON.parse(await file.text());if(content.app!=='finance-calculator'||!Array.isArray(content.records))throw Error('Formato backup non riconosciuto.');
        const records=content.records.filter(s=>s&&typeof s.id==='string'&&s.inputs&&['mutuo','auto','prestito'].includes(s.type)&&s.summary).slice(0,500);
        const have=new Set(state.saved.map(s=>s.id));let count=0;for(const record of records)if(!have.has(record.id)){state.saved.push(record);have.add(record.id);count++;}
        state.saved=state.saved.slice(0,500);store();renderArchive();toast(`${count} simulazioni importate.`);
      }catch(err){toast('Importazione non riuscita: '+err.message);}finally{e.target.value='';}
    });
    window.addEventListener('online',()=>{$('connection').innerHTML='● <span>Solo sul dispositivo</span>';});
    window.addEventListener('offline',()=>{$('connection').innerHTML='● <span>Offline</span>';});
    if(!navigator.onLine)$('connection').innerHTML='● <span>Offline</span>';
    if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=7.0.0',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{}));
    restoreInputs(state.typeInputs.mutuo);setAdvanced(false);showType('mutuo');renderArchive();switchPage('homePage');
  }
  install();
})();