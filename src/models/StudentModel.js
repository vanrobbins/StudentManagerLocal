/**
 * MODEL
 * Owns the student data and every localStorage read/write.
 * Knows nothing about the DOM.
 */

const STORAGE_KEY = "students";

export default class StudentModel {
	/**
	 * Read the roster out of localStorage.
	 * @returns {Array<Object>} the saved students, or [] when nothing is stored.
	 */
	getStudents() {
		const stored = localStorage.getItem(STORAGE_KEY);

		if (stored === null) {
			return [];
		}

		try {
			const students = JSON.parse(stored);
			return Array.isArray(students) ? students : [];
		} catch (error) {
			// Someone hand-edited the key, or another app wrote over it.
			console.warn(`Could not parse "${STORAGE_KEY}" from localStorage.`, error);
			return [];
		}
	}

	/**
	 * @param {string} id
	 * @returns {Object|undefined}
	 */
	getStudent(id) {
		return this.getStudents().find((student) => student.id === id);
	}

	/**
	 * Append one student to the roster and save it back.
	 * @param {{name: string, age: number|string, phone: string, email: string, classes: string[]}} studentData
	 * @returns {Object} the stored student, including its generated id.
	 */
	addStudent(studentData) {
		const students = this.getStudents();
		const student = { id: this.createId(), ...this.normalize(studentData) };

		students.push(student);
		this.saveStudents(students);

		return student;
	}

	/**
	 * Overwrite one student's details, keeping its id and position.
	 * @param {string} id
	 * @param {Object} studentData
	 * @returns {Object|null} the updated student, or null when the id is unknown.
	 */
	updateStudent(id, studentData) {
		const students = this.getStudents();
		const index = students.findIndex((student) => student.id === id);

		if (index === -1) {
			return null;
		}

		students[index] = { id, ...this.normalize(studentData) };
		this.saveStudents(students);

		return students[index];
	}

	/**
	 * Remove one student, reporting where it was so it can be put back.
	 * @param {string} id
	 * @returns {{student: Object, index: number}|null}
	 */
	deleteStudent(id) {
		const students = this.getStudents();
		const index = students.findIndex((student) => student.id === id);

		if (index === -1) {
			return null;
		}

		const [student] = students.splice(index, 1);
		this.saveStudents(students);

		return { student, index };
	}

	/**
	 * Put a removed student back where it was. Backs the undo.
	 * @param {Object} student
	 * @param {number} index
	 * @returns {Object} the restored student
	 */
	insertStudent(student, index) {
		const students = this.getStudents();

		students.splice(Math.min(index, students.length), 0, student);
		this.saveStudents(students);

		return student;
	}

	/**
	 * Write the whole roster to localStorage.
	 * @param {Array<Object>} students
	 */
	saveStudents(students) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
	}

	/**
	 * Coerce form values into the stored schema.
	 * @param {Object} studentData
	 * @returns {{name: string, age: number, phone: string, email: string, classes: string[]}}
	 */
	normalize({ name, age, phone, email, classes }) {
		return {
			name,
			age: Number(age),
			phone,
			email,
			classes: Array.isArray(classes) ? classes : [],
		};
	}

	/**
	 * Unique id: a UUID where the browser offers one, timestamp otherwise.
	 * @returns {string}
	 */
	createId() {
		if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
			return crypto.randomUUID();
		}

		return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}
}
