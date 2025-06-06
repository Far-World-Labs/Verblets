# Library Helpers

The `lib` directory houses reusable utilities used by verblets and chains. Each subfolder contains a focused helper function or class.

Modules include:

<!-- commonly used utilities -->
- [chatgpt](./chatgpt) – wrapper around OpenAI's ChatGPT API.
- [prompt-cache](./prompt-cache) – cache prompts/responses locally.
- [retry](./retry) – generic async retry helper.
- [search-best-first](./search-best-first) – best-first tree search algorithm.
- [search-js-files](./search-js-files) – locate and analyze JavaScript files.
- [shorten-text](./shorten-text) – shorten text using an LLM.
- [bulk-map](./bulk-map) – map lists in retryable batches.
- [bulk-filter](./bulk-filter) – filter lists in retryable batches.
- [strip-numeric](./strip-numeric) – remove non-digit characters.
- [strip-response](./strip-response) – clean up model responses.
- [to-bool](./to-bool) – parse text into a boolean.
- [to-enum](./to-enum) – parse text into an enum value.
- [to-number](./to-number) – parse text into a number.
- [to-number-with-units](./to-number-with-units) – parse numbers that include units.
- [transcribe](./transcribe) – microphone transcription via Whisper.

These helpers are building blocks used throughout the rest of the project.
