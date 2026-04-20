export const toolbarFloatingRailClassName =
    'absolute inset-x-0 top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-start gap-3 px-5 py-4 pointer-events-none';

export const toolbarPanelClassName =
    'pointer-events-auto flex h-11 items-center rounded-xl border border-white/8 bg-[color:var(--ui-overlay-control-strong)] text-[var(--ui-overlay-text)] shadow-[0_12px_32px_rgba(15,23,42,0.28)] backdrop-blur-md';

export const toolbarIconButtonClassName =
    'flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ui-overlay-text)] transition-[background-color,transform,color,opacity] hover:bg-[var(--ui-overlay-control-hover)] active:scale-[0.97] disabled:cursor-wait disabled:opacity-40';

export const toolbarTextButtonClassName =
    'min-h-9 rounded-lg px-3 text-[13px] font-medium text-[var(--ui-overlay-text)] transition-[background-color,transform,color,opacity] hover:bg-[var(--ui-overlay-control-hover)] active:scale-[0.97] disabled:cursor-wait disabled:opacity-40';

export const toolbarCounterClassName =
    'inline-flex h-11 items-center rounded-xl border border-white/8 bg-[color:var(--ui-overlay-control-strong)] px-4 text-sm font-medium tracking-[0.01em] text-[var(--ui-overlay-text-muted)] shadow-[0_12px_32px_rgba(15,23,42,0.24)] backdrop-blur-md';

export const toolbarValueClassName =
    'min-w-[3.25rem] text-center text-[12px] font-semibold tabular-nums text-[var(--ui-overlay-text-muted)]';

export const toolbarSelectWrapperClassName =
    'pointer-events-auto relative flex h-11 items-center rounded-xl border border-white/8 bg-[color:var(--ui-overlay-control-strong)] text-[var(--ui-overlay-text)] shadow-[0_12px_32px_rgba(15,23,42,0.28)] backdrop-blur-md';

export const toolbarSelectClassName =
    'h-full min-w-[8.25rem] appearance-none rounded-xl bg-transparent py-1 pl-3 pr-10 text-[13px] font-medium text-[var(--ui-overlay-text)] outline-none';
