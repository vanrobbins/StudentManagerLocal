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
	 * Append one student to the roster and save it back.
	 * @param {{name: string, age: number|string, phone: string, email: string, classes: string[]}} studentData
	 * @returns {Object} the stored student, including its generated id.
	 */
	addStudent(studentData) {
		const students = this.getStudents();

		const student = {
			id: this.createId(),
			name: studentData.name,
			age: Number(studentData.age),
			phone: studentData.phone,
			email: studentData.email,
			classes: Array.isArray(studentData.classes) ? studentData.classes : [],
		};

		students.push(student);
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
