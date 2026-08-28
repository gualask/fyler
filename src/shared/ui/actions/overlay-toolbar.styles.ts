const overlayToolbarControlHoverClassName =
    'hover:bg-[var(--ui-overlay-control-hover)] focus-visible:bg-[var(--ui-overlay-control-hover)]';

const overlayToolbarControlFocusClassName =
    'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--ui-accent-muted)]';

export const overlayToolbarPanelGroupClassName =
    'pointer-events-auto flex h-11 items-center gap-0.5 rounded-xl border border-[color:var(--ui-overlay-border)] bg-[color:var(--ui-overlay-control-strong)] px-1 text-[var(--ui-overlay-text)] shadow-[0_12px_32px_var(--ui-overlay-shadow)] backdrop-blur-md';

export const overlayToolbarIconButtonClassName = `flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ui-overlay-text)] transition-[background-color,transform,color,opacity,box-shadow] ${overlayToolbarControlHoverClassName} ${overlayToolbarControlFocusClassName} active:scale-[0.97] disabled:cursor-wait disabled:opacity-40`;
