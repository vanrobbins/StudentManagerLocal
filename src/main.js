/**
 * Entry point: wire the Model, View, and Controller together.
 */
import "./styles/cityboy.css";
import "./styles/main.css";

import StudentModel from "./models/StudentModel.js";
import StudentView from "./views/StudentView.js";
import StudentController from "./controllers/StudentController.js";
import ThemeSwitch from "./views/ThemeSwitch.js";

const app = new StudentController(new StudentModel(), new StudentView());
app.init();

// Page chrome, independent of the register.
new ThemeSwitch().init();
