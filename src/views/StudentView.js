/**
 * VIEW
 * Owns the DOM: caches elements, renders cards, reports what the user typed,
 * and hands interaction back to the Controller through bound callbacks.
 * Knows nothing about localStorage.
 */

const TOAST_DURATION = 7000;

export default class StudentView {
	constructor() {
		this.form = document.querySelector("#student-form");
		this.formHeading = document.querySelector("#intake-heading");
		this.saveButton = document.querySelector("#save-student");
		this.cancelButton = document.querySelector("#cancel-edit");
		this.error = document.querySelector("#form-error");

		this.showButton = document.querySelector("#show-students");
		this.tools = document.querySelector("#roster-tools");
		this.search = document.querySelector("#search");
		this.sort = document.querySelector("#sort");
		this.list = document.querySelector("#student-list");
		this.count = document.querySelector("#student-count");

		this.toast = document.querySelector("#toast");
		this.toastMessage = document.querySelector("#toast-message");
		this.undoButton = document.querySelector("#toast-undo");
		this.toastTimer = null;

		this.inputs = {
			name: document.querySelector("#name"),
			age: document.querySelector("#age"),
			phone: document.querySelector("#phone"),
			email: document.querySelector("#email"),
			classes: document.querySelector("#classes"),
		};
	}

	/* -----------------------------------------------------------
	   Event binding — the Controller supplies the handlers
	   ----------------------------------------------------------- */

	/** Form submit, which adds a student or saves an edit. @param {(data: Object) => void} handler */
	bindSaveStudent(handler) {
		this.form.addEventListener("submit", (event) => {
			event.preventDefault();
			handler(this.getFormData());
		});
	}

	/** @param {() => void} handler */
	bindShowStudents(handler) {
		this.showButton.addEventListener("click", () => handler());
	}

	/** @param {(query: string) => void} handler */
	bindSearch(handler) {
		this.search.addEventListener("input", () => handler(this.search.value.trim()));
	}

	/** @param {(sort: string) => void} handler */
	bindSort(handler) {
		this.sort.addEventListener("change", () => handler(this.sort.value));
	}

	/** Edit and Remove live on the cards, so listen once on the grid. @param {(action: string, id: string) => void} handler */
	bindCardAction(handler) {
		this.list.addEventListener("click", (event) => {
			const button = event.target.closest("[data-action]");
			if (button) {
				handler(button.dataset.action, button.dataset.id);
			}
		});
	}

	/** @param {() => void} handler */
	bindCancelEdit(handler) {
		this.cancelButton.addEventListener("click", () => handler());

		// Escape backs out of an edit the same way the button does.
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && !this.cancelButton.hidden) {
				handler();
			}
		});
	}

	/** @param {() => void} handler */
	bindUndo(handler) {
		this.undoButton.addEventListener("click", () => handler());
	}

	/* -----------------------------------------------------------
	   Reading the form
	   ----------------------------------------------------------- */

	/**
	 * @returns {{name: string, age: string, phone: string, email: string, classes: string[]}}
	 */
	getFormData() {
		return {
			name: this.inputs.name.value.trim(),
			age: this.inputs.age.value.trim(),
			phone: this.inputs.phone.value.trim(),
			email: this.inputs.email.value.trim(),
			classes: this.parseClasses(this.inputs.classes.value),
		};
	}

	/**
	 * Turn "N215, N220 , N423" into ["N215", "N220", "N423"].
	 * @param {string} value
	 * @returns {string[]}
	 */
	parseClasses(value) {
		return String(value)
			.split(",")
			.map((code) => code.trim())
			.filter((code) => code.length > 0);
	}

	clearForm() {
		this.form.reset();
		this.clearErrors();
	}

	/* -----------------------------------------------------------
	   Add mode vs. edit mode — one slip does both jobs
	   ----------------------------------------------------------- */

	/** @param {Object} student */
	setEditing(student) {
		this.inputs.name.value = student.name ?? "";
		this.inputs.age.value = student.age ?? "";
		this.inputs.phone.value = student.phone ?? "";
		this.inputs.email.value = student.email ?? "";
		this.inputs.classes.value = (student.classes ?? []).join(", ");

		this.formHeading.textContent = `Edit ${student.name}`;
		this.saveButton.textContent = "Save changes";
		this.cancelButton.hidden = false;
		this.clearErrors();

		this.form.scrollIntoView({ behavior: "smooth", block: "nearest" });
		this.inputs.name.focus();
	}

	setCreating() {
		this.clearForm();
		this.formHeading.textContent = "Add a student";
		this.saveButton.textContent = "Add student";
		this.cancelButton.hidden = true;
	}

	showTools() {
		this.tools.hidden = false;
	}

	/* -----------------------------------------------------------
	   Validation feedback
	   ----------------------------------------------------------- */

	/**
	 * @param {string} message shown above the submit button
	 * @param {string[]} [fields] field keys to mark, e.g. ["email"]
	 */
	showError(message, fields = []) {
		this.clearErrors();

		this.error.textContent = message;
		this.error.hidden = false;

		fields.forEach((field) => {
			const input = this.inputs[field];
			if (input) {
				input.classList.add("is-invalid");
				input.setAttribute("aria-invalid", "true");
			}
		});

		if (fields.length > 0 && this.inputs[fields[0]]) {
			this.inputs[fields[0]].focus();
		}
	}

	clearErrors() {
		this.error.hidden = true;
		this.error.textContent = "";

		Object.values(this.inputs).forEach((input) => {
			input.classList.remove("is-invalid");
			input.removeAttribute("aria-invalid");
		});
	}

	/* -----------------------------------------------------------
	   Status line
	   ----------------------------------------------------------- */

	/**
	 * @param {string} message
	 * @param {{undo?: boolean}} [options] show an Undo button alongside the message
	 */
	showToast(message, { undo = false } = {}) {
		window.clearTimeout(this.toastTimer);

		this.toastMessage.textContent = message;
		this.undoButton.hidden = !undo;
		this.toast.hidden = false;

		this.toastTimer = window.setTimeout(() => this.hideToast(), TOAST_DURATION);
	}

	hideToast() {
		window.clearTimeout(this.toastTimer);
		this.toast.hidden = true;
		this.undoButton.hidden = true;
	}

	/* -----------------------------------------------------------
	   Rendering
	   ----------------------------------------------------------- */

	/**
	 * First paint, before anything has been read out of storage.
	 * The roster appears once the user loads it or adds someone.
	 */
	renderStart() {
		this.count.textContent = "Roster not loaded";
		this.list.innerHTML = `
			<div class="empty">
				<p class="empty__title">Nothing on the board yet</p>
				<p class="empty__body">Load the saved students to see who is already stored in this browser, or add someone on the slip.</p>
			</div>`;
	}

	/**
	 * Paint the roster grid.
	 * @param {Array<Object>} students the students to show, already filtered and sorted
	 * @param {{highlightId?: string, total?: number, query?: string}} [options]
	 *   total is the whole roster size, so the count can read "2 of 5 students"
	 */
	renderStudents(students, { highlightId = null, total = students.length, query = "" } = {}) {
		this.count.textContent =
			students.length === total
				? this.countLabel(total)
				: `${students.length} of ${this.countLabel(total)}`;

		if (total === 0) {
			this.list.innerHTML = `
				<div class="empty">
					<p class="empty__title">No students on the roster</p>
					<p class="empty__body">Fill in the slip to add the first one.</p>
				</div>`;
			return;
		}

		if (students.length === 0) {
			this.list.innerHTML = `
				<div class="empty">
					<p class="empty__title">Nothing matches ${this.escape(query)}</p>
					<p class="empty__body">Try a name, an email address, or a course code such as N423.</p>
				</div>`;
			return;
		}

		this.list.innerHTML = students
			.map((student) => this.studentCard(student, student.id === highlightId))
			.join("");
	}

	/**
	 * @param {Object} student
	 * @param {boolean} isHighlighted
	 * @returns {string} card markup
	 */
	studentCard(student, isHighlighted) {
		const name = this.escape(student.name);
		const email = this.escape(student.email);
		const phone = this.escape(student.phone);
		const id = this.escape(student.id);
		const classes = Array.isArray(student.classes) ? student.classes : [];

		const badges = classes
			.map((code) => `<span class="class-badge">${this.escape(code)}</span>`)
			.join("");

		return `
			<article class="student-card${isHighlighted ? " student-card--new" : ""}">
				<span class="student-card__monogram" aria-hidden="true">${this.escape(this.monogram(student.name))}</span>
				<div class="student-card__actions">
					<button class="text-button" type="button" data-action="edit" data-id="${id}" aria-label="Edit ${name}">Edit</button>
					<button class="text-button text-button--danger" type="button" data-action="remove" data-id="${id}" aria-label="Remove ${name}">Remove</button>
				</div>
				<h3 class="student-card__name">${name}</h3>
				<p class="student-card__age">Age ${this.escape(String(student.age))}</p>
				<div class="student-card__contact">
					<span><a href="mailto:${encodeURI(student.email || "")}">${email}</a></span>
					<span><a href="tel:${encodeURI(student.phone || "")}">${phone}</a></span>
				</div>
				<div class="student-card__classes">${badges}</div>
			</article>`;
	}

	/**
	 * "Jane Doe" becomes "JD".
	 * @param {string} name
	 * @returns {string}
	 */
	monogram(name) {
		const initials = String(name)
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0].toUpperCase())
			.join("");

		return initials || "?";
	}

	/**
	 * @param {number} total
	 * @returns {string}
	 */
	countLabel(total) {
		if (total === 0) return "No students saved";
		if (total === 1) return "1 student";
		return `${total} students`;
	}

	/**
	 * Values come from user input, so escape before they reach innerHTML.
	 * @param {string} value
	 * @returns {string}
	 */
	escape(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}
}
