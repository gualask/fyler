import { createContext, useContext } from 'react';

export type ThumbnailCacheContextType = {
    requestThumbnails: (url: string, pageCount: number) => void;
    getThumbnail: (url: string, pageNum: number) => string | undefined;
    renderPageLarge: (url: string, pageNum: number) => Promise<string | null>;
};

export const ThumbnailCacheContext = createContext<ThumbnailCacheContextType | null>(null);

export function useThumbnailCache(): ThumbnailCacheContextType {
    const ctx = useContext(ThumbnailCacheContext);
    if (!ctx) throw new Error('useThumbnailCache must be used within ThumbnailCacheProvider');
    return ctx;
}
