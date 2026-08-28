import type {
    CompositionCompressionPreset,
    CompositionJpegQuality,
    CompositionLayout,
    CompositionOutputFormat,
    CompositionRegionKey,
    CompositionSource,
    PageComposition,
    PageCompositionExportRequest,
    PreviewLayoutRequest,
    QuarterTurn,
} from './page-composition.types';

export const EMPTY_PAGE_COMPOSITION: PageComposition = {
    layout: 'a4-stacked-halves',
    regions: {
        top: { source: null, rotation: 0 },
        bottom: { source: null, rotation: 0 },
    },
};

export type PageCompositionAction =
    | { type: 'layoutChanged'; layout: CompositionLayout }
    | { type: 'assign'; region: CompositionRegionKey; source: CompositionSource }
    | { type: 'remove'; region: CompositionRegionKey }
    | { type: 'rotate'; region: CompositionRegionKey; direction: 'ccw' | 'cw' }
    | { type: 'swap' }
    | { type: 'reset' };

function rotate(value: QuarterTurn, direction: 'ccw' | 'cw'): QuarterTurn {
    return ((value + (direction === 'cw' ? 1 : 3)) % 4) as QuarterTurn;
}

export function pageCompositionReducer(
    state: PageComposition,
    action: PageCompositionAction,
): PageComposition {
    switch (action.type) {
        case 'layoutChanged':
            return { ...state, layout: action.layout };
        case 'assign':
            return {
                ...state,
                regions: {
                    ...state.regions,
                    [action.region]: { source: action.source, rotation: 0 },
                },
            };
        case 'remove':
            return {
                ...state,
                regions: {
                    ...state.regions,
                    [action.region]: { source: null, rotation: 0 },
                },
            };
        case 'rotate': {
            const region = state.regions[action.region];
            if (!region.source) return state;
            return {
                ...state,
                regions: {
                    ...state.regions,
                    [action.region]: {
                        ...region,
                        rotation: rotate(region.rotation, action.direction),
                    },
                },
            };
        }
        case 'swap':
            return {
                ...state,
                regions: { top: state.regions.bottom, bottom: state.regions.top },
            };
        case 'reset':
            return EMPTY_PAGE_COMPOSITION;
    }
}

function sourceFileIds(source: CompositionSource | null): string[] {
    if (!source) return [];
    return source.kind === 'image' ? [source.file.id] : [source.file.id, source.rasterFile.id];
}

export function ownedSourceIds(composition: PageComposition): string[] {
    return [
        ...new Set([
            ...sourceFileIds(composition.regions.top.source),
            ...sourceFileIds(composition.regions.bottom.source),
        ]),
    ];
}

export function releasedSourceIds(before: PageComposition, after: PageComposition): string[] {
    const retained = new Set(ownedSourceIds(after));
    return ownedSourceIds(before).filter((id) => !retained.has(id));
}

function imageReference(source: CompositionSource): string {
    return source.kind === 'image' ? source.file.id : source.rasterFile.id;
}

export function canExportComposition(composition: PageComposition): boolean {
    return Boolean(composition.regions.top.source && composition.regions.bottom.source);
}

export function toPreviewLayoutRequest(composition: PageComposition): PreviewLayoutRequest {
    const region = (key: CompositionRegionKey) => {
        const value = composition.regions[key];
        return {
            source: value.source
                ? {
                      fileId: imageReference(value.source),
                      kind:
                          value.source.kind === 'image'
                              ? ('image' as const)
                              : ('pdf-page-raster' as const),
                  }
                : null,
            rotation: value.rotation,
        };
    };
    return {
        layout: composition.layout,
        regions: { top: region('top'), bottom: region('bottom') },
    };
}

export function toExportRequest(
    composition: PageComposition,
    outputPath: string,
    outputFormat: CompositionOutputFormat,
    optimizationPreset: CompositionCompressionPreset,
    jpegQuality: CompositionJpegQuality,
): PageCompositionExportRequest {
    if (!canExportComposition(composition)) {
        throw new Error('Both composition regions are required');
    }
    const top = composition.regions.top;
    const bottom = composition.regions.bottom;
    if (!top.source || !bottom.source) throw new Error('Both composition regions are required');
    return {
        outputPath,
        outputFormat,
        layout: composition.layout,
        regions: {
            top: { fileId: imageReference(top.source), rotation: top.rotation },
            bottom: { fileId: imageReference(bottom.source), rotation: bottom.rotation },
        },
        optimization: { preset: optimizationPreset, jpegQuality },
    };
}
