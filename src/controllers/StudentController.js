/**
 * CONTROLLER
 * The bridge: validates input, asks the Model to store it, tells the View to
 * redraw. Also holds the view state that is not worth persisting — the search
 * text, the sort order, which entry is open for amendment, and whatever the
 * last undoable action was.
 */
export default class StudentController {
	/**
	 * @param {import("../models/StudentModel.js").default} model
	 * @param {import("../views/StudentView.js").default} view
	 */
	constructor(model, view) {
		this.model = model;
		this.view = view;

		this.query = "";
		this.sort = "added";
		this.editingId = null;
		this.loaded = false;

		/** @type {{label: string, restore: () => void}|null} */
		this.pendingUndo = null;

		this.handleSave = this.handleSave.bind(this);
		this.handleReload = this.handleReload.bind(this);
		this.handleClearAll = this.handleClearAll.bind(this);
		this.handleSearch = this.handleSearch.bind(this);
		this.handleSort = this.handleSort.bind(this);
		this.handleRowAction = this.handleRowAction.bind(this);
		this.handleResetForm = this.handleResetForm.bind(this);
		this.handleUndo = this.handleUndo.bind(this);
		this.handleClassesInput = this.handleClassesInput.bind(this);
	}

	init() {
		this.view.bindSaveStudent(this.handleSave);
		this.view.bindReload(this.handleReload);
		this.view.bindClearAll(this.handleClearAll);
		this.view.bindSearch(this.handleSearch);
		this.view.bindSort(this.handleSort);
		this.view.bindRowAction(this.handleRowAction);
		this.view.bindResetForm(this.handleResetForm);
		this.view.bindUndo(this.handleUndo);
		this.view.bindClassesInput(this.handleClassesInput);

		// Nothing is read from storage until the register is reloaded.
		this.view.renderStart();
	}

	/* -----------------------------------------------------------
	   Writing
	   ----------------------------------------------------------- */

	/**
	 * Validate, save, reset the slip, redraw the register.
	 * @param {{name: string, age: string, phone: string, email: string, classes: string[]}} formData
	 */
	handleSave(formData) {
		const errors = this.validate(formData);

		if (Object.keys(errors).length > 0) {
			this.view.showErrors(errors);
			return;
		}

		if (this.editingId) {
			const student = this.model.updateStudent(this.editingId, formData);
			this.editingId = null;
			this.view.setCreating();
			this.refresh(student.id);
			return;
		}

		const student = this.model.addStudent(formData);
		this.view.clearForm();
		this.view.inputs.name.focus();
		this.refresh(student.id);
	}

	/** Read the register back out of localStorage and render it. */
	handleReload() {
		this.pendingUndo = null;
		this.refresh();
		this.view.clearUndo();
		this.view.markLoaded();
	}

	/** Empty the register. The undo puts the whole thing back. */
	handleClearAll() {
		const previous = this.model.getStudents();
		if (previous.length === 0) return;

		this.model.clearStudents();

		if (this.editingId) {
			this.handleResetForm();
		}

		this.offerUndo("Undo clear", () => this.model.saveStudents(previous));
		this.refresh();
	}

	/**
	 * @param {string} action "edit" or "remove"
	 * @param {string} id
	 */
	handleRowAction(action, id) {
		if (action === "edit") {
			const student = this.model.getStudent(id);
			if (!student) return;

			this.editingId = id;
			this.view.setEditing(student);
			this.refresh();
			return;
		}

		if (action === "remove") {
			const removed = this.model.deleteStudent(id);
			if (!removed) return;

			// Nothing is confirmed up front; the undo is the safety net.
			const { student, index } = removed;

			if (this.editingId === id) {
				this.handleResetForm();
			}

			this.offerUndo("Undo remove", () => this.model.insertStudent(student, index));
			this.refresh();
		}
	}

	/** Clear the slip, which also backs out of an amendment. */
	handleResetForm() {
		const wasEditing = this.editingId !== null;

		this.editingId = null;
		this.view.setCreating();

		// The ochre marker in the register has to come off with it.
		if (wasEditing && this.loaded) {
			this.refresh();
		}
	}

	/**
	 * Arm the undo in the register's toolbar.
	 * @param {string} label
	 * @param {() => void} restore
	 */
	offerUndo(label, restore) {
		this.pendingUndo = { label, restore };
		this.view.offerUndo(label);
	}

	handleUndo() {
		if (!this.pendingUndo) return;

		const { restore } = this.pendingUndo;
		this.pendingUndo = null;

		restore();
		this.view.clearUndo();
		this.refresh();
	}

	/** @param {string[]} classes */
	handleClassesInput(classes) {
		this.view.renderClassPreview(classes);
	}

	/* -----------------------------------------------------------
	   Reading
	   ----------------------------------------------------------- */

	/** @param {string} query */
	handleSearch(query) {
		this.query = query;
		this.refresh();
	}

	/** @param {string} sort */
	handleSort(sort) {
		this.sort = sort;
		this.refresh();
	}

	/**
	 * Pull the register from the Model, apply search and sort, hand it to the View.
	 * @param {string} [freshId] an entry to mark, just after it was written or amended
	 */
	refresh(freshId) {
		const students = this.model.getStudents();
		const visible = this.sortStudents(this.filterStudents(students));

		this.loaded = true;

		this.view.renderStudents(visible, {
			editingId: this.editingId,
			freshId,
			total: students.length,
			query: this.query,
		});
	}

	/**
	 * Match on name, email, phone, or any course code.
	 * @param {Array<Object>} students
	 * @returns {Array<Object>}
	 */
	filterStudents(students) {
		if (!this.query) return students;

		const needle = this.query.toLowerCase();

		return students.filter((student) => {
			const haystack = [student.name, student.email, student.phone, ...(student.classes ?? [])]
				.join(" ")
				.toLowerCase();

			return haystack.includes(needle);
		});
	}

	/**
	 * @param {Array<Object>} students
	 * @returns {Array<Object>} a sorted copy; storage order is never disturbed
	 */
	sortStudents(students) {
		const sorted = [...students];

		switch (this.sort) {
			case "name":
				return sorted.sort((a, b) => String(a.name).localeCompare(String(b.name)));
			case "age":
				return sorted.sort((a, b) => Number(a.age) - Number(b.age));
			case "classes":
				return sorted.sort((a, b) => (b.classes?.length ?? 0) - (a.classes?.length ?? 0));
			default:
				return sorted;
		}
	}

	/* -----------------------------------------------------------
	   Validation — one message per field, the way the slip shows them
	   ----------------------------------------------------------- */

	/**
	 * @param {Object} formData
	 * @returns {Object<string, string>} field key to message; empty when the entry is good
	 */
	validate({ name, age, phone, email, classes }) {
		const errors = {};

		if (!name) {
			errors.name = "A name is required.";
		}

		const ageNumber = Number(age);
		if (!age) {
			errors.age = "Required.";
		} else if (!Number.isFinite(ageNumber) || ageNumber < 1 || ageNumber > 120) {
			errors.age = "Between 1 and 120.";
		}

		if (!phone) {
			errors.phone = "A contact number is required.";
		}

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.email = "That address does not look complete.";
		} else if (this.emailTaken(email)) {
			errors.email = "That address is already on the register.";
		}

		if (classes.length === 0) {
			errors.classes = "List at least one class.";
		}

		return errors;
	}

	/**
	 * @param {string} email
	 * @returns {boolean} true when another student already uses it
	 */
	emailTaken(email) {
		const needle = email.toLowerCase();

		return this.model
			.getStudents()
			.some((student) => student.id !== this.editingId && String(student.email).toLowerCase() === needle);
	}
}
