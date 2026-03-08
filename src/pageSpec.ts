export function parseSelectedPagesFromSpec(spec: string, total: number): { pages: number[]; error: null } | { pages: null; error: string } {
    if (!spec.trim()) {
        return {
            pages: Array.from({ length: total }, (_, i) => i + 1),
            error: null,
        };
    }

    const pages = new Set<number>();

    for (const rawToken of spec.split(',')) {
        const token = rawToken.trim();
        if (!token) {
            return { pages: null, error: 'Specifica pagine non valida: token vuoto.' };
        }

        const match = token.match(/^(\d+)(?:-(\d+))?$/);
        if (!match) {
            return { pages: null, error: `Specifica pagine non valida: "${token}".` };
        }

        const start = Number.parseInt(match[1], 10);
        const end = match[2] ? Number.parseInt(match[2], 10) : start;

        if (start === 0 || end === 0) {
            return { pages: null, error: 'Le pagine devono essere maggiori di 0.' };
        }

        if (start > end) {
            return { pages: null, error: `Range invertito: ${start}-${end}.` };
        }

        if (end > total) {
            return { pages: null, error: `Pagina ${end} fuori intervallo: il file ha ${total} pagine.` };
        }

        for (let pageNum = start; pageNum <= end; pageNum += 1) {
            pages.add(pageNum);
        }
    }

    return {
        pages: Array.from(pages).sort((a, b) => a - b),
        error: null,
    };
}
