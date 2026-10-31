/**
 * Loading-state memory for the current app run.
 *
 * Each tab screen shows its skeleton the FIRST time it loads. Tab screens
 * are remounted on every tab switch, so their own useState(true) would replay
 * the skeleton each time. These flags live at module level instead: they
 * survive screen unmounts and reset only when the app process restarts.
 */
const loaded: Record<string, boolean> = {};

export const hasLoaded = (key: string): boolean => loaded[key] === true;
export const markLoaded = (key: string): void => { loaded[key] = true; };
