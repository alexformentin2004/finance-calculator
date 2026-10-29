# Finance Calculator — PWA

Prima versione di un simulatore finanziario privato, in italiano, utilizzabile offline e installabile sulla schermata Home dell'iPhone (compreso iPhone 17 Pro).

## Funzioni incluse

- Mutui, finanziamenti auto e prestiti personali.
- Importi, anticipo in euro/percentuale, TAN e durata (fino a 50 anni).
- Modalità base e avanzata con spese finanziate, spese iniziali del credito, costi per rata, spese di acquisto, sconto auto, permuta, maxi rata, perizia e indicazione di tasso variabile (scenario a TAN costante).
- Rata-obiettivo: stima del capitale/prezzo finanziabile entro un budget mensile.
- Rata, totale interessi, esborso totale, TAEG **stimato**, debito residuo, piano mensile, esportazione CSV.
- Salvataggio locale simulazioni, confronto di due scenari, backup/importazione JSON.
- Stampa / PDF con la funzione di stampa del browser.
- Nessun server applicativo e nessun account: **localStorage del dispositivo**, non sincronizzato.

## Installazione tramite GitHub Pages

1. Crea una repository GitHub, ad esempio `finance-calculator`.
2. Carica **il contenuto della cartella** (non la cartella esterna): `index.html`, `app.js`, `finance.js`, `style.css`, `manifest.webmanifest`, `service-worker.js`, `icons/` e `.nojekyll`.
3. Vai in **Settings → Pages → Build and deployment** e scegli **Deploy from a branch**, branch `main`, cartella `/(root)`, poi **Save**.
4. Quando la pagina è pubblicata, apri l'indirizzo `https://TUO-UTENTE.github.io/finance-calculator/` in **Safari** su iPhone.
5. Tocca **Condividi → Aggiungi alla schermata Home**, attiva **Apri come app web** e premi **Aggiungi**.
6. Apri la nuova icona dalla Home. La prima visita online serve a installare e memorizzare i file offline.

Le modifiche alla PWA si pubblicano aggiornando la repository. Quando si aggiornano file statici, incrementare il valore `CACHE` in `service-worker.js` per evitare vecchi file in cache. Il funzionamento offline richiede l'apertura online almeno una volta e dipende dalla gestione della memoria da parte di iOS.

## Precisione e limiti

- Ammortamento a rata costante (metodo francese) con TAN nominale e capitalizzazione mensile (`TAN/12`), e optional maxi rata finale nel finanziamento auto.
- Il TAEG mostrato è un'approssimazione su flussi mensili e costi inseriti; **non sostituisce il TAEG contrattuale** dei documenti informativi di banca/finanziaria.
- Nel mutuo variabile il TAN viene tenuto costante a scopo illustrativo: nessuna previsione futura dei tassi.
- LTV indicativo calcolato sul minore fra prezzo dell'immobile e valore di perizia, quando indicati.
- Il confronto registra i parametri e i risultati calcolati al momento del salvataggio.
- Le agevolazioni, le imposte e le spese notarili dipendono dalla situazione: vanno inserite manualmente e **non sono stimate automaticamente**.
- Finanziamenti con periodi promozionali, preammortamento, tassi a scalini, piani non mensili, rimborsi anticipati e opzioni di restituzione auto sono da sviluppare in versioni successive.
- Con maxi rata finale: la rata indicata **non** include la maxi rata; la somma di quest'ultima è conteggiata nel pagamento finale e nel totale.

## Test rapidi

Da una shell con Node.js:

```bash
node tests.js
```

## Privacy e backup

I dati sono salvati soltanto nel browser del dispositivo. Se elimini i dati dei siti web, perdi l'archivio. Prima di cancellare dati Safari o cambiare iPhone esporta un backup JSON, poi importalo nell'altra installazione. La repository può essere pubblica senza pubblicare i dati delle simulazioni: vengono salvati localmente, non nel codice.