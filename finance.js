/* Finance Calculator: motore di ammortamento a rate mensili */
(function(root,factory){if(typeof module!=="undefined"&&module.exports)module.exports=factory();else root.Finance=factory();})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const num=v=>Number.isFinite(Number(v))?Number(v):0;
function payment(principal,annualRate,periods,balloon=0){
 const p=num(principal),r=num(annualRate)/1200,n=Math.round(num(periods)),b=num(balloon);
 if(!(p>0&&n>0)||b<0||b>p||annualRate<0)throw Error("Parametri del finanziamento non validi.");
 if(r===0)return(p-b)/n;
 const discount=Math.pow(1+r,-n);return(p-b*discount)*r/(1-discount);
}
function annualEffectiveRate(proceeds,schedule){
 if(proceeds<=0||!schedule.length)return null;
 const pv=r=>schedule.reduce((a,s)=>a+(s.payment+s.fee)/Math.pow(1+r,s.month),0);
 let lo=0,hi=1;if(pv(lo)<proceeds)return null;
 while(pv(hi)>proceeds&&hi<100)hi*=2;
 for(let k=0;k<85;k++){const mid=(lo+hi)/2;if(pv(mid)>proceeds)lo=mid;else hi=mid;}
 return(Math.pow(1+(lo+hi)/2,12)-1)*100;
}
function calculate(input){
 const type=input.type||"mutuo",price=num(input.price),cashDown=type==="prestito"?0:num(input.cashDown),
 discount=type==="auto"?num(input.discount):0,tradeIn=type==="auto"?num(input.tradeIn):0,
 financedFees=num(input.financedFees),upfrontCreditFees=num(input.upfrontCreditFees),
 otherUpfrontFees=num(input.otherUpfrontFees),monthlyFees=num(input.monthlyFees),
 balloon=type==="auto"?num(input.balloon):0,annualRate=num(input.annualRate),months=Math.round(num(input.months));
 const vals=[price,cashDown,discount,tradeIn,financedFees,upfrontCreditFees,otherUpfrontFees,monthlyFees,balloon,annualRate];
 if(vals.some(v=>!Number.isFinite(v)||v<0))throw Error("Inserisci soltanto importi e tassi positivi.");
 if(price<=0)throw Error("Inserisci un importo maggiore di zero.");
 if(months<1||months>600)throw Error("La durata deve essere compresa tra 1 e 600 mesi.");
 if(annualRate>30)throw Error("Il TAN deve essere compreso tra 0% e 30%.");
 const baseLoan=price-cashDown-tradeIn-discount;
 if(baseLoan<=0)throw Error("L'anticipo, la permuta e gli sconti coprono già tutto il prezzo.");
 const principal=baseLoan+financedFees;
 if(balloon>principal)throw Error("La maxi rata finale non può superare il capitale finanziato.");
 const regular=payment(principal,annualRate,months,balloon),r=annualRate/1200;
 let balance=principal,totalPrincipal=0,totalInterest=0,totalPayments=0;const schedule=[];
 for(let month=1;month<=months;month++){
  const interest=balance*r;
  const capitalPaid=month===months?balance:Math.max(0,regular-interest);
  const installment=month===months?capitalPaid+interest:regular;
  balance=Math.max(0,balance-capitalPaid);
  totalPrincipal+=capitalPaid;totalInterest+=interest;totalPayments+=installment+monthlyFees;
  schedule.push({month,payment:installment,fee:monthlyFees,interest,principal:capitalPaid,balance});
 }
 const annualEffectiveRateValue=annualEffectiveRate(baseLoan-upfrontCreditFees,schedule);
 const upfrontCash=cashDown+upfrontCreditFees+otherUpfrontFees;
 return{type,price,cashDown,tradeIn,discount,financedFees,upfrontCreditFees,otherUpfrontFees,monthlyFees,balloon,annualRate,months,baseLoan,principal,regular,
 monthlyOutlay:regular+monthlyFees,totalPrincipal,totalInterest,totalPayments,totalCreditCost:totalPayments+upfrontCreditFees-baseLoan,
 totalCashOut:upfrontCash+totalPayments,upfrontCash,annualEffectiveRate:annualEffectiveRateValue,schedule,financedShare:principal/price*100};
}
function affordablePrincipal(monthlyBudget,annualRate,months,balloon=0,monthlyFees=0){
 const b=Math.max(0,num(monthlyBudget)-num(monthlyFees)),r=num(annualRate)/1200,n=Math.round(num(months));
 if(n<=0||annualRate<0||annualRate>30)return 0;
 if(r===0)return b*n+num(balloon);
 const d=Math.pow(1+r,-n);return b*(1-d)/r+num(balloon)*d;
}
function sanitizeInput(s){const copy={...s};for(const k of ["price","cashDown","discount","tradeIn","financedFees","upfrontCreditFees","otherUpfrontFees","monthlyFees","balloon","annualRate","months","appraisal","targetMonthly"])copy[k]=num(copy[k]);return copy;}
return{payment,calculate,affordablePrincipal,sanitizeInput,roundCents:n=>Math.round((n+Number.EPSILON)*100)/100};
});