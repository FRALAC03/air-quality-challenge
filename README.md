# Air Quality Dashboard

Dashboard full-stack per il monitoraggio e l'analisi della qualità dell'aria basata su dati ambientali ARPA.

Il progetto permette di:

- visualizzare indicatori sintetici relativi agli inquinanti;
- esplorare i dati per comune, inquinante e periodo;
- visualizzare serie temporali delle stazioni;
- analizzare i superamenti delle soglie normative;
- calcolare medie e confronti attraverso logica deterministica;
- interrogare i dati tramite un assistente AI locale;
- utilizzare una conversazione contestuale multi-turn;
- impedire al modello AI di inventare valori o calcoli ambientali.

L'obiettivo architetturale principale è separare nettamente:

**interpretazione linguistica**

da

**calcoli, dati e regole di dominio**.

Il modello AI interpreta quindi la richiesta dell'utente, mentre i valori numerici vengono sempre recuperati e calcolati dal sistema attraverso strumenti deterministici.

---

# Funzionalità

## Dashboard

La dashboard mostra una sintesi degli inquinanti supportati:

- PM10
- PM2.5
- NO2
- O3

Per ciascun inquinante vengono visualizzati i valori disponibili e, quando possibile, il confronto con il periodo precedente.

---

## Esplorazione dei dati

La sezione **Esplora i dati** permette di selezionare:

- inquinante;
- comune;
- data iniziale;
- data finale.

Il sistema restituisce le serie temporali delle stazioni disponibili nel periodo selezionato.

La visualizzazione comprende:

- grafico responsive;
- serie separate per stazione;
- unità di misura;
- numero di stazioni rilevate;
- riepilogo dei superamenti;
- gestione esplicita dell'assenza di dati.

---

# Assistente AI

La dashboard integra un assistente AI locale basato su:

- Ollama
- Qwen3 4B

Il modello utilizzato e verificato durante lo sviluppo è:

```text
qwen3:4b
```

L'assistente può rispondere a domande come:

```text
Qual è la soglia configurata per il PM10?
```

```text
Quanti giorni con almeno un superamento PM10
ci sono stati a Milano nel marzo 2026?
```

```text
Nel marzo 2026 la compliance PM2.5
a Milano è stata rispettata?
```

L'assistente supporta anche domande contestuali.

Esempio:

```text
Utente:
Quanti giorni con almeno un superamento PM10
ci sono stati a Milano nel marzo 2026?

Assistente:
11 giorni.

Utente:
E a Monza?

Assistente:
12 giorni.
```

La seconda richiesta mantiene automaticamente:

- PM10;
- marzo 2026;
- la metrica relativa ai giorni di superamento;

e modifica solamente il comune.

Il valore relativo a Monza viene comunque recuperato nuovamente attraverso i tool deterministici.

---

# Architettura AI

Il modello linguistico non è considerato una fonte affidabile per i dati ambientali.

La pipeline principale è:

```text
Utente
   |
   v
Chat UI
   |
   v
POST /api/chat
   |
   v
Conversation Context
   |
   v
Grounding Policy
   |
   v
AI Orchestrator
   |
   v
Ollama / Qwen3
   |
   v
Tool Call
   |
   v
Validazione del Tool
   |
   v
Domain Services
   |
   v
Repository
   |
   v
PostgreSQL
   |
   v
Risultato deterministico
   |
   v
Risposta AI
```

Il modello decide quale operazione richiedere, ma non esegue autonomamente i calcoli numerici.

---

# Grounding e sicurezza delle risposte AI

Le domande che richiedono dati reali devono necessariamente utilizzare almeno un tool.

Per esempio:

```text
Qual è la soglia PM10?
```

non può essere risolta utilizzando semplicemente la conoscenza interna del modello.

Il flusso corretto è:

```text
Domanda utente
      |
      v
get_threshold
      |
      v
Domain
      |
      v
50 µg/m³
      |
      v
Risposta AI
```

Se il modello tenta di fornire direttamente una risposta data-dependent senza utilizzare alcun tool, l'orchestrator blocca la risposta.

Viene quindi effettuato un nuovo tentativo con istruzioni di grounding più rigide.

Se anche i tentativi successivi non utilizzano correttamente i tool, il sistema termina con errore invece di restituire una risposta non verificata.

La strategia è quindi di tipo:

```text
fail closed
```

Una risposta non verificata è preferibile che venga rifiutata piuttosto che presentata all'utente come dato attendibile.

---

# Conversazione multi-turn

La memoria conversazionale non viene mantenuta tramite una sessione globale di Ollama.

Ogni richiesta HTTP utilizza una nuova istanza del provider.

Il frontend invia al backend:

- il messaggio corrente;
- una history limitata dei messaggi precedenti.

Esempio:

```json
{
  "message": "E a Monza?",
  "history": [
    {
      "role": "user",
      "content": "Quanti giorni con almeno un superamento PM10 ci sono stati a Milano nel marzo 2026?"
    },
    {
      "role": "assistant",
      "content": "A Milano ci sono stati 11 giorni."
    }
  ]
}
```

La history viene utilizzata solamente per risolvere riferimenti contestuali.

Le precedenti risposte dell'assistente non vengono considerate una fonte dei dati.

Se il nuovo messaggio richiede informazioni ambientali, il sistema deve recuperarle nuovamente tramite i tool.

---

# Sicurezza della history

Il boundary HTTP accetta nella history esclusivamente i ruoli:

```text
user
assistant
```

Non vengono accettati messaggi client con ruolo:

```text
system
tool
```

Questo impedisce al client di modificare direttamente le istruzioni interne del modello o simulare risultati dei tool.

La history è inoltre limitata per evitare una crescita incontrollata del contesto.

---

# Stati di dominio

Il sistema utilizza stati espliciti per descrivere il risultato delle operazioni.

## OK

La richiesta è valida e il risultato è stato calcolato correttamente.

---

## NO_DATA

Non sono disponibili dati per la combinazione richiesta di:

- comune;
- inquinante;
- periodo.

Il modello non deve inventare o stimare dati mancanti.

---

## INVALID_REQUEST

Uno o più parametri della richiesta non sono validi.

Il sistema non tenta di reinterpretare arbitrariamente una richiesta non valida come se fosse corretta.

---

## NOT_ASSESSABLE

La valutazione normativa richiesta non può essere effettuata con i dati disponibili.

Questo stato è intenzionalmente differente da:

```text
COMPLIANT
```

e:

```text
EXCEEDED
```

Un risultato `NOT_ASSESSABLE` significa quindi:

```text
la conformità non può essere valutata
```

e non:

```text
la soglia è stata rispettata
```

oppure:

```text
la soglia è stata superata
```

Un esempio è il PM2.5, la cui valutazione normativa può richiedere una base annuale non calcolabile sul dataset disponibile.

---

# Tool disponibili all'assistente

## get_threshold

Restituisce la soglia o regola normativa configurata per un inquinante.

Il risultato descrive solamente la soglia.

Non rappresenta una misurazione osservata e non può essere utilizzato da solo per dedurre conformità.

---

## get_period_average

Calcola deterministicamente la media di un inquinante per:

- comune;
- periodo.

---

## compare_periods

Confronta le medie di due periodi e restituisce il trend calcolato dal dominio.

---

## get_exceedances

Restituisce le metriche relative ai superamenti.

Le metriche supportate comprendono:

```text
STATION_EXCEEDANCE_EVENTS
MUNICIPALITY_EXCEEDANCE_DAYS
MUNICIPALITY_EXCEEDANCE_HOURS
```

---

## explore_data

Restituisce:

- serie temporali delle stazioni;
- informazioni sulle stazioni;
- risultato deterministico relativo ai superamenti.

---

## list_municipalities

Restituisce l'elenco dei comuni disponibili nel dataset.

---

# Stack tecnologico

## Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Recharts
- Lucide React

## Backend

- Next.js Route Handlers
- TypeScript
- Prisma ORM 7
- PostgreSQL
- `pg`
- Prisma PostgreSQL Adapter

## AI

- Ollama
- Qwen3 4B
- orchestrator AI personalizzato
- function/tool calling
- grounding deterministico
- adapter provider astratto

Il progetto contiene inoltre un adapter per OpenAI, ma la configurazione verificata e utilizzata per la soluzione finale è basata su **Ollama + Qwen3 4B**, eseguibile completamente in locale.

# Struttura principale del progetto

```text
src/
├── app/
│   └── api/
│       ├── air-quality/
│       ├── chat/
│       ├── dashboard/
│       └── data/
│
├── components/
│   └── dashboard/
│       ├── AirQualityChart.tsx
│       ├── ChatComposer.tsx
│       ├── ChatMessage.tsx
│       ├── ChatPanel.tsx
│       ├── ExploreFilters.tsx
│       ├── ExplorePanel.tsx
│       └── ...
│
└── lib/
    ├── ai/
    │   ├── providers/
    │   ├── conversation-context.ts
    │   ├── model-types.ts
    │   ├── orchestrator.ts
    │   ├── system-instructions.ts
    │   ├── tool-definitions.ts
    │   ├── tool-executor.ts
    │   ├── tool-requirement-policy.ts
    │   └── tool-types.ts
    │
    ├── domain/
    ├── frontend/
    ├── repositories/
    └── db/

scripts/
├── test-ai-orchestrator.ts
├── test-chat-api.ts
├── test-chat-frontend.ts
├── test-conversation-context.ts
├── test-ollama-provider.ts
└── ...
```

---

# Prerequisiti

Per eseguire il progetto sono necessari:

- Node.js
- npm
- PostgreSQL
- Ollama

---

# Configurazione di Ollama

Installare Ollama sul sistema.

Il modello utilizzato durante lo sviluppo è:

```text
qwen3:4b
```

Scaricare il modello con:

```bash
ollama pull qwen3:4b
```

Verificare i modelli installati con:

```bash
ollama list
```

Ollama deve essere raggiungibile normalmente tramite:

```text
http://localhost:11434
```

---

# Configurazione delle variabili d'ambiente

Creare un file:

```text
.env
```

nella root del progetto.

Esempio:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public"

OLLAMA_BASE_URL="http://localhost:11434"

OLLAMA_MODEL="qwen3:4b"
```

Il file `.env` contiene configurazioni sensibili e non deve essere incluso nel repository Git.

Non inserire password, credenziali o API key nel README.

---

# Installazione

## 1. Installare le dipendenze

Dalla root del progetto eseguire:

```bash
npm install
```

---

## 2. Configurare PostgreSQL

È necessario avere un'istanza PostgreSQL disponibile.

Configurare la stringa di connessione nel file `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public"
```

Il database deve contenere i dati ambientali richiesti dall'applicazione.

Per verificare che l'applicazione riesca a comunicare correttamente con il database è disponibile lo script:

```bash
npm run db:test
```

---

## 3. Configurare Ollama

Installare Ollama e scaricare il modello utilizzato dal progetto:

```bash
ollama pull qwen3:4b
```

Verificare che il modello sia installato:

```bash
ollama list
```

Nel file `.env` configurare:

```env
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen3:4b"
```

La configurazione principale del progetto utilizza Ollama in locale e non richiede crediti API.

---

## 4. Avviare l'applicazione

Eseguire:

```bash
npm run dev
```

Next.js mostrerà nel terminale l'indirizzo locale dell'applicazione.

Normalmente:

```text
http://localhost:3000
```

Se la porta `3000` è già occupata, Next.js può utilizzare automaticamente un'altra porta, ad esempio:

```text
http://localhost:3001
```

---

## 5. Build di produzione

Per verificare il progetto prima dell'esecuzione in produzione:

```bash
npm run lint
npm run build
```

Entrambi i comandi devono completarsi senza errori.

Per avviare una build di produzione già compilata:

```bash
npm run start
```

---

# Script npm

Gli script principali disponibili sono:

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia Next.js in modalità sviluppo |
| `npm run build` | Genera la build di produzione |
| `npm run start` | Avvia la build di produzione |
| `npm run lint` | Esegue ESLint |
| `npm run db:test` | Verifica l'accesso al database |

---


# API principali

Il progetto espone route tra cui:

```text
/api/air-quality/average
/api/air-quality/compare
/api/air-quality/exceedances
/api/air-quality/threshold

/api/dashboard/summary

/api/data/explore
/api/data/municipalities

/api/chat
```

---

# API Chat

Una richiesta semplice può essere inviata come:

```json
{
  "message": "Qual è la soglia configurata per il PM10?"
}
```

Una richiesta multi-turn può invece contenere:

```json
{
  "message": "E a Monza?",
  "history": [
    {
      "role": "user",
      "content": "Quanti giorni con almeno un superamento PM10 ci sono stati a Milano nel marzo 2026?"
    },
    {
      "role": "assistant",
      "content": "A Milano nel marzo 2026 ci sono stati 11 giorni di superamento."
    }
  ]
}
```

---

# Test automatici

Il progetto contiene diversi livelli di verifica.

## Database

Per verificare la connessione e l'accesso al database:

```bash
npm run db:test
```

Questo test richiede che PostgreSQL sia attivo e correttamente configurato tramite `DATABASE_URL`.

---


## Conversation Context

Eseguire:

```bash
npx tsx scripts/test-conversation-context.ts
```

Risultato verificato:

```text
7/7 PASSED
```

---

## Chat Frontend

Eseguire:

```bash
npx tsx scripts/test-chat-frontend.ts
```

Risultato verificato:

```text
8/8 PASSED
```

---

## AI Orchestrator

Eseguire:

```bash
npx tsx scripts/test-ai-orchestrator.ts
```

Risultato verificato:

```text
13/13 PASSED
```

---

## Provider Ollama

Ollama deve essere in esecuzione.

Eseguire:

```bash
npx tsx scripts/test-ollama-provider.ts
```

Risultato verificato:

```text
4/4 PASSED
```

---

## Chat API

Il server Next.js deve essere in esecuzione.

Eseguire:

```bash
npx tsx scripts/test-chat-api.ts
```

Risultato verificato:

```text
8/8 PASSED
```

---

# Risultati dei test

Stato verificato prima della consegna:

```text
Conversation Context       7/7
Chat Frontend              8/8
AI Orchestrator           13/13
Ollama Provider            4/4
Chat API                    8/8
                           -----
Totale                     40/40
```

Inoltre:

```text
npm run lint     PASS
npm run build    PASS
```

---

# Scenari multi-turn verificati

## Cambio di comune

```text
Utente:
Quanti giorni con almeno un superamento PM10
ci sono stati a Milano nel marzo 2026?

Assistente:
11 giorni.

Utente:
E a Monza?

Assistente:
12 giorni.
```

La seconda risposta effettua una nuova interrogazione deterministica dei dati.

---

## Cambio di inquinante

```text
Utente:
Qual è la soglia configurata per NO2?

Assistente:
200 µg/m³.

Utente:
E per PM10?

Assistente:
50 µg/m³.
```

Anche in questo caso il valore viene recuperato nuovamente attraverso il tool appropriato.

---

# Principali decisioni architetturali

## Calcoli deterministici

Il modello linguistico non esegue direttamente la business logic.

Medie, confronti, superamenti e soglie vengono gestiti dal dominio applicativo.

Questo permette di ottenere risultati:

- riproducibili;
- testabili;
- validabili;
- indipendenti dalla variabilità del modello AI.

---

## Validazione delle tool call

Le richieste generate dal modello vengono validate prima dell'esecuzione.

Vengono intercettati:

- nomi di tool non validi;
- argomenti mancanti;
- argomenti malformati;
- richieste non supportate.

---

## Grounding obbligatorio

Le domande data-dependent devono utilizzare tool deterministici.

Una risposta non grounded non viene considerata valida.

---

## Provider stateless tra richieste HTTP

Ogni richiesta crea una nuova istanza dell'adapter Ollama.

Lo stato non viene condiviso globalmente tra utenti o richieste indipendenti.

---

## History esplicita

Il contesto conversazionale viene inviato esplicitamente dal client.

La history viene utilizzata solamente per comprendere riferimenti linguistici e non come sostituto del database.

---

# Limitazioni attuali

La soluzione mantiene intenzionalmente alcune funzionalità semplici.

- La qualità e la velocità delle risposte AI dipendono dall'hardware sul quale viene eseguito Ollama.
- Qwen3 può variare occasionalmente la formulazione o la lingua della risposta.
- La cronologia della chat non viene ancora persistita nel database.
- Le conversazioni vengono perse al refresh della pagina.
- Le risposte AI non sono ancora trasmesse tramite streaming token-by-token.
- Il contesto conversazionale è intenzionalmente limitato.
- Le valutazioni normative dipendono dalla copertura effettiva del dataset disponibile.

---

# Possibili sviluppi futuri

Tra le possibili evoluzioni:

- persistenza delle conversazioni;
- streaming delle risposte AI;
- cancellazione delle richieste in corso;
- timeout lato frontend;
- gestione avanzata delle sessioni;
- ulteriori provider AI;
- aumento della copertura dei test;
- miglioramento della presentazione delle risposte normative;
- ulteriori metriche ambientali.

---

# Sicurezza

I dati sensibili devono rimanere fuori dal repository.

Non devono essere versionati:

```text
.env
API key
password database
credenziali provider
```

Il modello AI non dispone inoltre di accesso diretto al database.

Può interagire con il sistema solamente attraverso tool esplicitamente definiti e validati.

---

# Principio progettuale

L'idea centrale dell'architettura può essere riassunta in:

> Il modello comprende la domanda; l'applicazione possiede i fatti.

In questo modo è possibile offrire un'interfaccia conversazionale naturale senza delegare al modello linguistico i calcoli ambientali o la logica normativa.
