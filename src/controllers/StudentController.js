/**
 * CONTROLLER
 * The bridge: validates input, asks the Model to store it, tells the View to redraw.
 * Also holds the view state that is not worth persisting — the search text,
 * the sort order, and which student is currently open for editing.
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
		this.lastRemoved = null;

		this.handleSave = this.handleSave.bind(this);
		this.handleShowStudents = this.handleShowStudents.bind(this);
		this.handleSearch = this.handleSearch.bind(this);
		this.handleSort = this.handleSort.bind(this);
		this.handleCardAction = this.handleCardAction.bind(this);
		this.handleCancelEdit = this.handleCancelEdit.bind(this);
		this.handleUndo = this.handleUndo.bind(this);
	}

	init() {
		this.view.bindSaveStudent(this.handleSave);
		this.view.bindShowStudents(this.handleShowStudents);
		this.view.bindSearch(this.handleSearch);
		this.view.bindSort(this.handleSort);
		this.view.bindCardAction(this.handleCardAction);
		this.view.bindCancelEdit(this.handleCancelEdit);
		this.view.bindUndo(this.handleUndo);

		// Nothing is read from storage until "Load saved students" is used.
		this.view.renderStart();
	}

	/* -----------------------------------------------------------
	   Writing
	   ----------------------------------------------------------- */

	/**
	 * Validate, save, reset the slip, redraw the roster.
	 * @param {{name: string, age: string, phone: string, email: string, classes: string[]}} formData
	 */
	handleSave(formData) {
		const problem = this.validate(formData);

		if (problem) {
			this.view.showError(problem.message, problem.fields);
			return;
		}

		if (this.editingId) {
			const student = this.model.updateStudent(this.editingId, formData);
			this.editingId = null;
			this.view.setCreating();
			this.refresh(student.id);
			this.view.showToast(`Saved changes to ${student.name}.`);
			return;
		}

		const student = this.model.addStudent(formData);
		this.view.clearForm();
		this.view.inputs.name.focus();
		this.refresh(student.id);
		this.view.showToast(`Added ${student.name} to the roster.`);
	}

	/** Read the roster back out of localStorage and render it. */
	handleShowStudents() {
		this.refresh();
		this.view.hideToast();
	}

	/**
	 * @param {string} action "edit" or "remove"
	 * @param {string} id
	 */
	handleCardAction(action, id) {
		if (action === "edit") {
			const student = this.model.getStudent(id);
			if (student) {
				this.editingId = id;
				this.view.setEditing(student);
			}
			return;
		}

		if (action === "remove") {
			const removed = this.model.deleteStudent(id);
			if (!removed) return;

			// Nothing is confirmed up front; the undo is the safety net.
			this.lastRemoved = removed;

			if (this.editingId === id) {
				this.handleCancelEdit();
			}

			this.refresh();
			this.view.showToast(`Removed ${removed.student.name}.`, { undo: true });
		}
	}

	handleCancelEdit() {
		this.editingId = null;
		this.view.setCreating();
	}

	handleUndo() {
		if (!this.lastRemoved) return;

		const { student, index } = this.lastRemoved;
		this.lastRemoved = null;

		this.model.insertStudent(student, index);
		this.refresh(student.id);
		this.view.showToast(`${student.name} is back on the roster.`);
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
	 * Pull the roster from the Model, apply search and sort, hand it to the View.
	 * @param {string} [highlightId] a student to stamp in, after adding or editing
	 */
	refresh(highlightId) {
		const students = this.model.getStudents();
		const visible = this.sortStudents(this.filterStudents(students));

		if (!this.loaded) {
			this.loaded = true;
			this.view.showTools();
		}

		this.view.renderStudents(visible, {
			highlightId,
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
	   Validation
	   ----------------------------------------------------------- */

	/**
	 * @param {Object} formData
	 * @returns {{message: string, fields: string[]}|null} null when the entry is good
	 */
	validate({ name, age, phone, email, classes }) {
		if (!name) {
			return { message: "Enter the student's full name.", fields: ["name"] };
		}

		const ageNumber = Number(age);
		if (!age || !Number.isFinite(ageNumber) || ageNumber < 1 || ageNumber > 120) {
			return { message: "Enter an age between 1 and 120.", fields: ["age"] };
		}

		if (!phone) {
			return { message: "Enter a phone number, such as 555-0199.", fields: ["phone"] };
		}

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return { message: "Enter an email address, such as jane@example.com.", fields: ["email"] };
		}

		if (this.emailTaken(email)) {
			return { message: `${email} is already on the roster.`, fields: ["email"] };
		}

		if (classes.length === 0) {
			return { message: "List at least one class, separated by commas.", fields: ["classes"] };
		}

		return null;
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
