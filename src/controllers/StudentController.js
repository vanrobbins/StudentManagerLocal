/**
 * CONTROLLER
 * The bridge: validates input, asks the Model to store it, tells the View to redraw.
 */
export default class StudentController {
	/**
	 * @param {import("../models/StudentModel.js").default} model
	 * @param {import("../views/StudentView.js").default} view
	 */
	constructor(model, view) {
		this.model = model;
		this.view = view;

		this.handleAddStudent = this.handleAddStudent.bind(this);
		this.handleShowStudents = this.handleShowStudents.bind(this);
	}

	init() {
		this.view.bindAddStudent(this.handleAddStudent);
		this.view.bindShowStudents(this.handleShowStudents);

		// Nothing is read from storage until "Load saved students" is used.
		this.view.renderStart();
	}

	/**
	 * Validate, save, clear the slip, redraw the roster.
	 * @param {{name: string, age: string, phone: string, email: string, classes: string[]}} formData
	 */
	handleAddStudent(formData) {
		const problem = this.validate(formData);

		if (problem) {
			this.view.showError(problem.message, problem.fields);
			return;
		}

		const student = this.model.addStudent(formData);

		this.view.clearForm();
		this.view.renderStudents(this.model.getStudents(), student.id);
	}

	/** Read the roster back out of localStorage and render it. */
	handleShowStudents() {
		this.view.renderStudents(this.model.getStudents());
	}

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

		if (classes.length === 0) {
			return { message: "List at least one class, separated by commas.", fields: ["classes"] };
		}

		return null;
	}
}
