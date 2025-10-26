# Default instructions

To compile and run your React Three Fiber web app, follow these steps:

1. Install Dependencies


Open a terminal in your project folder and run:
```
npm install
npm install -g esbuild
```
This will install all the dependencies listed in your package.json.

2. Check Your Scripts
Open your package.json and look for the "scripts" section. You should see something like:

```json
"scripts": {
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
}
```
If you’re using Vite or another bundler, the commands may differ.

3. Run the Development Server
To start the app in development mode, run:

```sh
npm start
```

This will compile your app and open it in your default browser, usually at http://localhost:3000.

4. Build for Production
To create a production build, run:
```
npm run build
```
This will generate optimized files in the build folder.

5. Serve the Production Build
If you want to serve the production build locally, you can use a simple server like serve:
```
npx serve -s build
```
This will serve your app at http://localhost:5000.

Note:

Make sure you have Node.js installed (v16 or later recommended).
If you encounter errors, check your package.json for custom scripts or missing dependencies.

# Panel instructions

https://panel.holoviz.org/how_to/custom_components/esm/build.html#manual-compilation

## Build

Once you have set up these three files you have to install the packages with npm:

```
npm install
```

This will fetch the packages and install them into the local node_modules directory. Once that is complete we can run the bundling:

```
esbuild confetti.js --bundle --format=esm --minify --outfile=ConfettiButton.bundle.js
```

This will create a new file called **ConfettiButton.bundle.js**, which includes all the dependencies (even CSS, image files and other static assets if you have imported them).

##  Use in panel

```python
import panel as pn

from panel.custom import JSComponent

pn.extension()

class ConfettiButton(JSComponent):

    _esm = 'confetti.js'

ConfettiButton().servable()
```
