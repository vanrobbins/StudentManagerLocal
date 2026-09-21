/**
 * VIEW
 * Owns the DOM: caches elements, renders the register, reports what the user
 * typed, and hands interaction back to the Controller through bound callbacks.
 * Knows nothing about localStorage.
 */

const FIELDS = ["name", "age", "phone", "email", "classes"];

export default class StudentView {
	constructor() {
		this.form = document.querySelector("#student-form");
		this.slipTitle = document.querySelector("#slip-title");
		this.slipFolio = document.querySelector("#slip-folio");
		this.editingFlag = document.querySelector("#editing-flag");
		this.saveButton = document.querySelector("#save-student");
		this.resetButton = document.querySelector("#reset-form");
		this.classPreview = document.querySelector("#class-preview");

		this.countValue = document.querySelector("#count-value");
		this.countUnit = document.querySelector("#count-unit");

		this.search = document.querySelector("#search");
		this.sort = document.querySelector("#sort");
		this.reloadButton = document.querySelector("#reload");
		this.clearButton = document.querySelector("#clear-all");
		this.list = document.querySelector("#student-list");
		this.tally = document.querySelector("#register-tally");
		this.stamp = document.querySelector("#register-stamp");
		this.foot = document.querySelector("#register-foot");

		this.undoButton = document.querySelector("#undo");

		this.inputs = {
			name: document.querySelector("#name"),
			age: document.querySelector("#age"),
			phone: document.querySelector("#phone"),
			email: document.querySelector("#email"),
			classes: document.querySelector("#classes"),
		};

		// Each field is a cb-frame that carries the error state, with the
		// message underneath it.
		this.frames = {};
		this.messages = {};

		FIELDS.forEach((field) => {
			this.frames[field] = document.querySelector(`.cb-field[data-field="${field}"] .cb-frame`);
			this.messages[field] = document.querySelector(`#${field}-msg`);
		});

		// Age is a text box so it sits on the DS rule like the others, which
		// means the digits-only rule is ours to keep.
		this.inputs.age.addEventListener("input", () => {
			this.inputs.age.value = this.inputs.age.value.replace(/[^0-9]/g, "").slice(0, 3);
		});
	}

	/* -----------------------------------------------------------
	   Event binding — the Controller supplies the handlers
	   ----------------------------------------------------------- */

	/** Form submit, which writes a new entry or saves an amendment. @param {(data: Object) => void} handler */
	bindSaveStudent(handler) {
		this.form.addEventListener("submit", (event) => {
			event.preventDefault();
			handler(this.getFormData());
		});
	}

	/** @param {() => void} handler */
	bindReload(handler) {
		this.reloadButton.addEventListener("click", () => handler());
	}

	/** @param {() => void} handler */
	bindClearAll(handler) {
		this.clearButton.addEventListener("click", () => handler());
	}

	/** @param {(query: string) => void} handler */
	bindSearch(handler) {
		this.search.addEventListener("input", () => handler(this.search.value.trim()));
	}

	/** @param {(sort: string) => void} handler */
	bindSort(handler) {
		this.sort.addEventListener("change", () => handler(this.sort.value));
	}

	/** Edit and Remove live on the rows, so listen once on the list. @param {(action: string, id: string) => void} handler */
	bindRowAction(handler) {
		this.list.addEventListener("click", (event) => {
			const button = event.target.closest("[data-action]");
			if (button) {
				handler(button.dataset.action, button.dataset.id);
			}
		});
	}

	/** Clear form, which also backs out of an amendment. @param {() => void} handler */
	bindResetForm(handler) {
		this.resetButton.addEventListener("click", () => handler());

		// Escape backs out of an amendment the same way the button does.
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && !this.editingFlag.hidden) {
				handler();
			}
		});
	}

	/** @param {() => void} handler */
	bindUndo(handler) {
		this.undoButton.addEventListener("click", () => handler());
	}

	/**
	 * The classes box echoes its comma list back as badges while it is typed.
	 * @param {(classes: string[]) => void} handler
	 */
	bindClassesInput(handler) {
		this.inputs.classes.addEventListener("input", () => {
			handler(this.parseClasses(this.inputs.classes.value));
		});
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
		this.renderClassPreview([]);
	}

	/* -----------------------------------------------------------
	   New entry vs. amendment — one slip does both jobs
	   ----------------------------------------------------------- */

	/** @param {Object} student */
	setEditing(student) {
		this.inputs.name.value = student.name ?? "";
		this.inputs.age.value = student.age ?? "";
		this.inputs.phone.value = student.phone ?? "";
		this.inputs.email.value = student.email ?? "";
		this.inputs.classes.value = (student.classes ?? []).join(", ");

		this.slipTitle.textContent = "Amend entry";
		this.slipFolio.textContent = "Amend";
		this.saveButton.querySelector(".cb-btn-label").textContent = "Save changes";
		this.resetButton.querySelector(".cb-btn-label").textContent = "Cancel";
		this.editingFlag.hidden = false;

		this.clearErrors();
		this.renderClassPreview(student.classes ?? []);

		this.form.scrollIntoView({ behavior: "smooth", block: "nearest" });
		this.inputs.name.focus();
	}

	setCreating() {
		this.clearForm();

		this.slipTitle.textContent = "New entry";
		this.slipFolio.textContent = "Form 01";
		this.saveButton.querySelector(".cb-btn-label").textContent = "Add student";
		this.resetButton.querySelector(".cb-btn-label").textContent = "Clear form";
		this.editingFlag.hidden = true;
	}

	/**
	 * The badges under the classes box, so the comma list is legible
	 * before it is saved.
	 * @param {string[]} classes
	 */
	renderClassPreview(classes) {
		this.classPreview.innerHTML = classes
			.map((code) => `<span class="cb-badge cb-badge--info">${this.escape(code)}</span>`)
			.join("");

		this.classPreview.hidden = classes.length === 0;
	}

	/* -----------------------------------------------------------
	   Validation feedback — one message per field, in its own frame
	   ----------------------------------------------------------- */

	/**
	 * @param {Object<string, string>} errors field key to message, e.g. {email: "…"}
	 */
	showErrors(errors) {
		this.clearErrors();

		FIELDS.forEach((field) => {
			const message = errors[field];
			if (!message) return;

			this.frames[field].dataset.state = "error";
			this.inputs[field].setAttribute("aria-invalid", "true");
			this.messages[field].textContent = message;
			this.messages[field].hidden = false;
		});

		const first = FIELDS.find((field) => errors[field]);
		if (first) {
			this.inputs[first].focus();
		}
	}

	clearErrors() {
		FIELDS.forEach((field) => {
			this.frames[field].dataset.state = "open";
			this.inputs[field].removeAttribute("aria-invalid");
			this.messages[field].textContent = "";
			this.messages[field].hidden = true;
		});
	}

	/* -----------------------------------------------------------
	   The register's own status: the undo, and the loaded stamp
	   ----------------------------------------------------------- */

	/**
	 * Put the undo up in the register's toolbar. Nothing announces what
	 * happened — the register redraws, which says it.
	 * @param {string} label what it puts back, e.g. "Undo remove"
	 */
	offerUndo(label) {
		this.undoButton.querySelector(".cb-btn-label").textContent = label;
		this.undoButton.hidden = false;
	}

	clearUndo() {
		this.undoButton.hidden = true;
	}

	/** Stamp the register as read out of storage. */
	markLoaded() {
		this.stamp.hidden = false;
	}

	/* -----------------------------------------------------------
	   Rendering
	   ----------------------------------------------------------- */

	/**
	 * First paint, before anything has been read out of storage.
	 * The register appears once it is reloaded or someone is added.
	 */
	renderStart() {
		this.countValue.textContent = "——";
		this.countUnit.textContent = "Records on file";
		this.tally.textContent = "Not loaded";
		this.stamp.hidden = true;
		this.foot.hidden = true;

		this.list.innerHTML = `
			<div class="register__empty">
				<p class="register__empty-title">The register is not open</p>
				<p class="register__empty-body">Reload to read what is already held in this browser, or write the first entry on the slip.</p>
			</div>`;
	}

	/**
	 * Paint the register.
	 * @param {Array<Object>} students the students to show, already filtered and sorted
	 * @param {{editingId?: string, freshId?: string, total?: number, query?: string}} [options]
	 *   total is the whole register, so the tally can read "2 of 5 shown"
	 */
	renderStudents(students, { editingId = null, freshId = null, total = students.length, query = "" } = {}) {
		this.countValue.textContent = String(total).padStart(2, "0");
		this.countUnit.textContent = total === 1 ? "Record on file" : "Records on file";

		this.tally.textContent =
			students.length === total ? this.tallyLabel(total) : `${students.length} of ${total} shown`;

		this.foot.hidden = students.length === 0;

		if (total === 0) {
			this.list.innerHTML = `
				<div class="register__empty">
					<p class="register__empty-title">No entries on file</p>
					<p class="register__empty-body">Fill in the slip to write the first one.</p>
				</div>`;
			return;
		}

		if (students.length === 0) {
			this.list.innerHTML = `
				<div class="register__empty">
					<p class="register__empty-title">No entries match ${this.escape(query)}</p>
					<p class="register__empty-body">Try a name, an email address, or a course code such as N423.</p>
				</div>`;
			return;
		}

		this.list.innerHTML = students
			.map((student, index) =>
				this.studentRow(student, {
					folio: String(index + 1).padStart(2, "0"),
					editing: student.id === editingId,
					fresh: student.id === freshId,
				}),
			)
			.join("");
	}

	/**
	 * @param {Object} student
	 * @param {{folio: string, editing: boolean, fresh: boolean}} options
	 * @returns {string} row markup
	 */
	studentRow(student, { folio, editing, fresh }) {
		const name = this.escape(student.name);
		const email = this.escape(student.email);
		const phone = this.escape(student.phone);
		const id = this.escape(student.id);
		const classes = Array.isArray(student.classes) ? student.classes : [];

		const badges = classes
			.map((code) => `<span class="cb-badge cb-badge--quiet">${this.escape(code)}</span>`)
			.join("");

		// The ochre flag repeats what the slip's banner says, so a long
		// register still shows which record is open.
		const flag = editing ? `<span class="cb-badge cb-badge--caution">Amending</span>` : "";

		return `
			<div class="entry" data-editing="${editing}" data-fresh="${fresh}">
				<span class="entry__folio">${folio}</span>
				<div class="entry__body">
					<div class="entry__ident">
						<span class="entry__heading"><span class="entry__name">${name}</span>${flag}</span>
						<a class="entry__email" href="mailto:${encodeURI(student.email || "")}">${email}</a>
					</div>
					<div class="entry__meta">
						<a href="tel:${encodeURI(student.phone || "")}">${phone}</a>
						<span>Age ${this.escape(String(student.age))}</span>
					</div>
					<div class="entry__classes">${badges}</div>
				</div>
				<div class="entry__actions">
					<button class="cb-btn cb-btn--ghost cb-btn--sm" type="button" data-action="edit" data-id="${id}" aria-label="Amend ${name}">
						<span class="cb-btn-label">Edit</span>
					</button>
					<button class="cb-btn cb-btn--ghost cb-btn--sm" type="button" data-action="remove" data-id="${id}" aria-label="Remove ${name}">
						<span class="cb-btn-label">Remove</span>
					</button>
				</div>
			</div>`;
	}

	/**
	 * @param {number} total
	 * @returns {string}
	 */
	tallyLabel(total) {
		if (total === 0) return "No entries";
		if (total === 1) return "1 entry";
		return `${total} entries`;
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
