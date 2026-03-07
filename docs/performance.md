# Ottimizzazioni di performance in Fyler

Panoramica delle ottimizzazioni significative applicate nel backend Rust e nel frontend React.

---

## Backend (Rust / Tauri)

### 1. Parallelismo con `rayon`

`rayon` viene importato in tre moduli (`commands.rs`, `optimize.rs`, `pdf.rs`) tramite `use rayon::prelude::*`.

#### Apertura file in parallelo — `commands.rs:files_from_paths`

```rust
paths
    .into_iter()
    .collect::<Vec<_>>()
    .into_par_iter()   // <-- rayon
    .filter_map(|path| match path_to_file(path) { ... })
    .collect()
```

`path_to_file` esegue I/O su disco (`PdfDoc::load` per contare le pagine) per ciascun file. Con `into_par_iter()` tutti i file vengono aperti concorrentemente sui core disponibili. Ordine preservato: `Vec::into_par_iter()` è un indexed iterator, rayon garantisce ordering nel `collect`.

#### Preparazione documenti in parallelo — `commands.rs:merge_pdfs_inner`

```rust
let docs = req.inputs.par_iter()
    .map(|input| prepare_doc(&input.path, &input.page_spec, image_fit))
    .collect::<anyhow::Result<Vec<_>>>()?;
```

`prepare_doc` carica un PDF o converte un'immagine in `PdfDoc` in memoria. Con N file da unire, le N letture+decodifiche avvengono in parallelo. Il comportamento d'errore è identico al sequenziale: il primo errore vince.

#### Encoding immagini in parallelo — `optimize.rs:optimize_images`

```rust
let entries: Vec<&mut Object> = doc.objects
    .iter_mut()
    .filter_map(|(_, obj)| is_rgb_image_stream(obj).then_some(obj))
    .collect();

entries.into_par_iter().try_for_each(|obj| -> Result<()> {
    // resize Lanczos3 + JPEG encode per ogni immagine
})?;
```

Resize con `FilterType::Lanczos3` e re-encoding JPEG sono le operazioni più CPU-bound dell'intera app. Raccogliendo `&mut Object` in un `Vec` e passando a `into_par_iter()`, ogni immagine viene processata su un thread separato. Le referenze mutabili a oggetti distinti della `BTreeMap` sono sicure da accedere in parallelo perché non si sovrappongono.

#### Rinumerazione oggetti in parallelo — `pdf.rs:merge_pdf_documents`

```rust
// Pre-calcola offset cumulativi (sequenziale: O(N))
let mut offset = base.max_id + 1;
let offsets: Vec<u32> = docs.iter().map(|d| {
    let o = offset;
    offset += d.max_id + 1;
    o
}).collect();

// Rinumera tutti i doc in parallelo
docs.par_iter_mut()
    .zip(offsets.par_iter())
    .for_each(|(doc, &off)| doc.renumber_objects_with(off));
```

`renumber_objects_with` itera su tutti gli oggetti di un documento per aggiornare i riferimenti interni — O(M) per documento. Con N file da unire l'operazione totale è O(N×M); pre-calcolando gli offset in anticipo si elimina la dipendenza sequenziale e le N rinumerazioni vengono eseguite in parallelo.

---

### 2. Pre-scan con early exit prima della decompressione — `optimize.rs:optimize_images`

```rust
if !doc.objects.values().any(is_rgb_image_stream) {
    return Ok(());
}
doc.decompress();
```

`doc.decompress()` è costosa (decomprime tutti gli stream FlateDecode del documento). La pre-scansione controlla i soli dizionari (non decomprime nulla) e restituisce immediatamente se non ci sono immagini RGB, evitando il costo di decompressione+ricompressione su PDF che non contengono immagini.

---

### 3. Selezione pagine in memoria — `pdf.rs:load_pdf_with_pages`

```rust
fn load_pdf_with_pages(path: &str, page_spec: &str) -> Result<PdfDoc> {
    let mut doc = PdfDoc::load(path)?;
    // ...
    doc.delete_pages(&to_delete);
    Ok(doc)
}
```

La selezione delle pagine avviene direttamente sul `PdfDoc` in memoria tramite `delete_pages`, senza scrivere file temporanei su disco. Tutto il pipeline di merge (selezione → rinumerazione → unione) opera esclusivamente in RAM.

---

### 4. Ottimizzazione immagini — `optimize.rs`

Tre parametri configurabili applicati durante il merge:

| Parametro | Effetto |
|---|---|
| `max_px` | Resize dell'immagine con `FilterType::Lanczos3` se il lato lungo supera la soglia |
| `jpeg_quality` | Re-encoding lossy in JPEG (`high`=90, `medium`=75, `low`=55) |
| `image_fit` | Modalità resa in pagina (`fit` / `contain` / `cover`) |

Il resize usa Lanczos3 (filtro di alta qualità con anti-aliasing) e lo skip è selettivo: se né resize né JPEG si applicano a una data immagine, quella viene saltata senza toccarla.

---

## Frontend (React / TypeScript)

### 5. Thumbnail cache a due livelli — `useThumbnailCache.tsx`

```
cacheRef      → Map<url, Map<pageNum, dataUrl>>   // thumbnail 100px, JPEG 0.8
largeCacheRef → Map<url, Map<pageNum, dataUrl>>   // anteprima large 900px, JPEG 0.92
```

Entrambe le cache sono `useRef` (non state) per evitare re-render durante il popolamento. Il rendering thumbnail avviene progressivamente: ogni pagina viene aggiunta alla cache appena pronta, triggerando un singolo `setCacheVersion` per aggiornare la UI senza attendere il completamento di tutte le pagine.

**Guard di deduplicazione**: `requestedRef: Set<string>` impedisce il doppio avvio del rendering per lo stesso PDF se `requestThumbnails` viene chiamato più volte (es. scroll veloce o re-mount).

---

### 6. Rendering PDF in Web Worker — `useThumbnailCache.tsx`

```ts
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;  // importato con ?url (Vite)
```

`pdfjs-dist` esegue il rendering delle pagine in un Web Worker dedicato, separato dal thread UI. Zoom, drag&drop e interazioni restano fluidi anche durante il rendering di PDF con molte pagine.

La qualità è differenziata per contesto: `0.8` per i thumbnail nella sidebar (priorità dimensione), `0.92` per la preview large nel modal (priorità qualità).

---

### 7. Lazy loading con IntersectionObserver — `PreviewModal.tsx:PageSlot`

```ts
const io = new IntersectionObserver(
    ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();  // one-shot: non osserva più dopo il primo trigger
        void renderPageLarge(getPreviewUrl(file.path), fp.pageNum).then(setSrc);
    },
    { rootMargin: '300px' },  // pre-carica 300px prima dell'entrata nel viewport
);
```

Le pagine del modal non vengono caricate all'apertura ma solo quando stanno per diventare visibili (con 300px di anticipo per eliminare il flash di caricamento). Ogni observer è one-shot: dopo il primo trigger si disconnette, senza polling continuo.

---

### 8. Memoizzazione selettiva — `FinalDocument.tsx`, `PreviewModal.tsx`, `FileList.tsx`

| Punto | Tecnica | Scopo |
|---|---|---|
| `FinalPageRow` | `React.memo` | Evita re-render di tutte le righe durante drag&drop |
| `fileMap` | `useMemo` | Lookup O(1) per id file, ricalcolato solo al cambio di `files` |
| `sortableItems` | `useMemo` | Evita nuovi array ad ogni render nel contesto dnd-kit |
| `pageCountByFile` | `useMemo` | Conteggio pagine per file, ricalcolato solo al cambio di `finalPages` |
| `handleDragEnd`, `handleVisible` | `useCallback` | Referenze stabili per evitare re-subscription in hook dipendenti |
