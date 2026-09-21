/**
 * VIEW
 * Owns the DOM: caches elements, renders cards, reports what the user typed,
 * and hands interaction back to the Controller through bound callbacks.
 * Knows nothing about localStorage.
 */
export default class StudentView {
	constructor() {
		this.form = document.querySelector("#student-form");
		this.showButton = document.querySelector("#show-students");
		this.list = document.querySelector("#student-list");
		this.count = document.querySelector("#student-count");
		this.error = document.querySelector("#form-error");

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

	/** @param {(student: Object) => void} handler */
	bindAddStudent(handler) {
		this.form.addEventListener("submit", (event) => {
			event.preventDefault();
			handler(this.getFormData());
		});
	}

	/** @param {() => void} handler */
	bindShowStudents(handler) {
		this.showButton.addEventListener("click", () => handler());
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
		this.inputs.name.focus();
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
	 * @param {Array<Object>} students
	 * @param {string} [newStudentId] id of a just-added student, which gets the stamp-in
	 */
	renderStudents(students, newStudentId) {
		this.count.textContent = this.countLabel(students.length);

		if (students.length === 0) {
			this.list.innerHTML = `
				<div class="empty">
					<p class="empty__title">No students on the roster</p>
					<p class="empty__body">Fill in the slip to add the first one, or load what is already saved in this browser.</p>
				</div>`;
			return;
		}

		this.list.innerHTML = students
			.map((student) => this.studentCard(student, student.id === newStudentId))
			.join("");
	}

	/**
	 * @param {Object} student
	 * @param {boolean} isNew
	 * @returns {string} card markup
	 */
	studentCard(student, isNew) {
		const name = this.escape(student.name);
		const email = this.escape(student.email);
		const phone = this.escape(student.phone);
		const classes = Array.isArray(student.classes) ? student.classes : [];

		const badges = classes
			.map((code) => `<span class="class-badge">${this.escape(code)}</span>`)
			.join("");

		return `
			<article class="student-card${isNew ? " student-card--new" : ""}">
				<span class="student-card__monogram" aria-hidden="true">${this.escape(this.monogram(student.name))}</span>
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
