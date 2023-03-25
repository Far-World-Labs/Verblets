# Verblet Generator

This is a Node script that generates a new "verblet" module and test file in a specific directory structure.

## Usage

To use this script, run the following command:

```
npm run script -- generate-verblet [verblet-name]
```

Replace `[verblet-name]` with the name of your new verblet. The script will create a new directory called `./src/verblets/[verblet-name]` and generate an `index.js` file and a test file inside that directory.

The generated `index.js` file exports a single default async function that you can implement to define the behavior of the verblet.

The generated test file is located at `./src/verblets/[verblet-name]/[verblet-name].spec.js`. It contains a sample test that you can modify to test your verblet implementation.
