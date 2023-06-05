import glob from 'glob';
import { readFile } from 'fs/promises';
import SummaryMap from '../../src/chains/summary-map/index.js';

// Define your glob pattern here or pass it as a command line argument
const globPattern = process.argv[2] || './src/**/*.js';

// Define your target tokens here or pass it as a command line argument
const targetTokens = process.argv[3] || 4097;

// Initialize the SummaryMap with the target tokens
const map = new SummaryMap({
    targetTokens: targetTokens
});

glob(globPattern, async (err, files) => {
    if (err) {
        console.error(err);
        return;
    }

    const filePromises = files.map(async (file) => {
        try {
            const content = await readFile(file, 'utf8');
            // Set each file content with its respective filepath as a key
            map.set(file, {
                key: file,
                value: content,
                weight: 1,
                type: 'code'
            });
        } catch (err) {
            console.error(`Error reading file ${file}:`, err);
        }
    });

    // When all file read operations complete
    await Promise.all(filePromises);
    const entries = Array.from(await map.entries());

    // Loop over each key/value and print it to stdout
    for (const [key, value] of entries) {
        console.log(`## ${key}\n`);
        console.log(`\`\`\`js\n${value}\n\`\`\``);
    }
});
