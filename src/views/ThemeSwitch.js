/**
 * The theme switch in the letterhead — the design system's Toggle, standing
 * in for the theme prop on the source design. It reads the theme currently
 * in force, and clicking it swaps to the other one.
 *
 * The design system ships both token sets, and the whole page follows
 * data-cb-theme on <html>. Which one is showing is a browser preference
 * rather than register data, so it stays out of the Model and is written
 * to its own storage key.
 */

const STORAGE_KEY = "theme";

export default class ThemeSwitch {
	constructor() {
		this.input = document.querySelector("#theme");
		this.toggle = this.input.closest(".cb-toggle");
		this.mark = document.querySelector("#theme-label");
	}

	init() {
		// The inline script in <head> has already picked the theme; catch the
		// switch up with it.
		this.render(this.current());
		this.input.addEventListener("change", () => {
			this.apply(this.input.checked ? "dusk" : "day");
		});
	}

	/** @returns {"day"|"dusk"} */
	current() {
		return document.documentElement.dataset.cbTheme === "dusk" ? "dusk" : "day";
	}

	/** @param {"day"|"dusk"} theme */
	apply(theme) {
		document.documentElement.dataset.cbTheme = theme;
		this.render(theme);

		try {
			localStorage.setItem(STORAGE_KEY, theme);
		} catch (error) {
			// Private mode: the choice holds for this page, and no longer.
			console.warn(`Could not save "${STORAGE_KEY}" to localStorage.`, error);
		}
	}

	/**
	 * The Toggle carries its state on the label, so that has to be set
	 * alongside the input.
	 * @param {"day"|"dusk"} theme
	 */
	render(theme) {
		const dusk = theme === "dusk";

		this.input.checked = dusk;
		this.toggle.dataset.checked = String(dusk);
		this.mark.textContent = dusk ? "Dusk" : "Day";
	}
}
