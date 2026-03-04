# Fyler - Tool desktop per unire PDF

## Documento di progetto

**Versione:** v0.1  
**Stato:** Draft (fonte di verità)  
**Tipo applicazione:** Desktop cross-platform  
**Tecnologie chiave:** Go, Wails, React, Mantine

---

## 1. Obiettivo

Realizzare un **tool desktop cross-platform** che consenta di generare un nuovo PDF tramite:

- import di uno o più PDF
- selezione delle pagine per ciascun PDF (opzionale)
- riordino dei documenti
- **concatenazione** (append) dei PDF nell'ordine indicato
- anteprima del PDF selezionato

L'applicazione è una **utility da ufficio** semplice e veloce, con particolare attenzione a performance su PDF di grandi dimensioni.

---

## 2. Scope MVP (v0.1)

### Incluso
- Solo **PDF** (niente immagini nel MVP)
- Merge come **concatenazione a livello documento** (non pagina)
- Selezione pagine con sintassi "stile stampa" (vedi 3.2)
- Drag & drop per riordinare i documenti
- Anteprima del **singolo documento selezionato**
- Export del PDF finale in una posizione scelta dall'utente

### Escluso (per ora)
- Immagini (JPG/PNG/BMP), preview del PDF finale, OCR, preset di compressione
- Gestione avanzata di: metadati, bookmark, form, password/protezione, ottimizzazioni
- Normalizzazione/gestione orientamento (prevista come estensione futura)

---

## 3. Requisiti funzionali

### 3.1 Importazione documenti
- Importazione di uno o più file PDF
- Ogni file è gestito come **unità riordinabile**

### 3.2 Selezione pagine PDF
Per ogni PDF è possibile:
- includere **tutte le pagine**
- includere **solo alcune pagine** usando una sintassi stile stampa:
  - range: `1-5`
  - elenco: `1,3,7`
  - combinazioni: `1-3,5,8`

Gestione errori:
- se la sintassi è invalida o le pagine richieste non sono selezionabili, l'operazione va in **errore** con messaggio chiaro (nessun "best effort").

### 3.3 Ordine dei documenti
- Lista dei documenti con **drag & drop**
- Riordino **solo a livello documento** (non di singola pagina)

### 3.4 Anteprima (preview)
- Visualizzazione anteprima del documento selezionato
- Navigazione pagine
- La preview non genera il PDF finale

### 3.5 Output
- Generazione di un nuovo file PDF come concatenazione dei documenti (e delle relative pagine selezionate) nell'ordine impostato
- Salvataggio in una posizione scelta dall'utente

---

## 4. Requisiti non funzionali

- Applicazione desktop cross-platform: Windows, macOS, Linux
- Buone performance anche con PDF di grandi dimensioni
- Librerie affidabili e mantenute (evitare dipendenze obsolete)
- Architettura estendibile (es. aggiunta immagini e gestione orientamento)

---

## 5. Architettura generale

```
Frontend (React + Mantine + PDF.js)
        |
      Wails
        |
Backend Go (PDF merge/page selection)
```

---

## 6. Stack tecnologico (proposto)

### Backend
- Go
- `pdfcpu` (merge e selezione pagine)

Nota: librerie per immagini (es. `imaging`) e generazione PDF "da zero" sono rimandate alle estensioni future.

### Frontend
- React
- Mantine
- dnd-kit
- PDF.js

---

## 7. Estensioni future

- Import immagini (JPG/PNG/BMP) e merge misto (PDF + immagini)
- Gestione orientamento/pagine (rotazioni, compatibilità layout)
- Preset di compressione
- OCR
- Preview del PDF finale (prima dell'export)
