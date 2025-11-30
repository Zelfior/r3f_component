esbuild src/app.js --bundle --format=esm --minify --outfile=ReactThreeFiber.bundle.js --loader:.js=jsx
python .\app.py