# Student Manager

Student Manager is a browser-based student roster application built with Vite and vanilla JavaScript. It uses an explicit Model-View-Controller (MVC) structure and stores roster data in the browser's `localStorage`, so no server-side database is required.

**[Web4](https://in-info-web4.luddy.indianapolis.iu.edu/~vanrobbi/N423/StudentManagerLocal/)**

## Features

- Add students with a name, age, telephone number, email address, and classes
- Edit or remove existing students
- Undo the most recent removal or clear operation
- Search the register by name, email, or class
- Sort students by name or age
- Reload the roster from browser storage
- Switch between day and dusk themes
- Preview class entries as they are typed
- Validate form values before saving

## Technology

- [Vite](https://vite.dev/)
- Vanilla JavaScript using ES modules
- HTML and CSS
- Browser `localStorage`

## Project structure

```text
.
├── index.html
├── package.json
└── src
    ├── controllers
    │   └── StudentController.js
    ├── models
    │   └── StudentModel.js
    ├── styles
    │   ├── cityboy.css
    │   └── main.css
    ├── views
    │   ├── StudentView.js
    │   └── ThemeSwitch.js
    └── main.js
```

- **Model:** `StudentModel` reads and writes the roster in `localStorage`.
- **View:** `StudentView` owns the form and register UI.
- **Controller:** `StudentController` connects user actions to model updates and view rendering.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open the local URL shown by Vite.

## Build for production

```bash
npm run build
```

The production files are generated in the `dist` directory. To preview the production build locally:

```bash
npm run preview
```

## Data storage

Student records are saved under the `students` key in the browser's `localStorage`. Theme preference is saved separately under the `theme` key. Data is local to the browser and device, so it is not shared across browsers or users.
