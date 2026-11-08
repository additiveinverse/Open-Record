export const READY_BEEP = "<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_tally_01'/>";
export const SAVED = "Record saved.";

export type Rng = () => number;

export function pick<T>(items: readonly T[], rng: Rng = Math.random): T {
	return items[Math.floor(rng() * items.length)];
}

