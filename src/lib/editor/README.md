# editor

Interactive text editor integration for capturing user input.

## Purpose

The `editor` module opens the system's default text editor (or one specified via environment variable) to allow users to compose or edit text interactively. This is useful for capturing multi-line input, complex prompts, or when users need full editing capabilities.

## Usage

```javascript
import editor from '../lib/editor/index.js';

const userInput = await editor();
console.log('You entered:', userInput);
```

## API

### `editor()`

Opens a text editor and returns the content after the user saves and exits.

**Parameters:**
- None

**Returns:**
- `Promise<string>`: The text content entered by the user

## Configuration

The editor to use is determined by:
1. The `EDITOR` environment variable (if set)
2. Falls back to `nano` if not specified

```bash
# Use vim
EDITOR=vim node app.js

# Use VS Code
EDITOR=code node app.js

# Use default (nano)
node app.js
```

## Features

- **System Integration**: Uses the system's text editor via spawn
- **Temporary Files**: Creates temp files that are automatically cleaned up
- **Full Editor Features**: Users get syntax highlighting, multi-line editing, etc.
- **Shell Support**: Runs through shell to support complex editor commands
- **Inherit IO**: Editor runs in the same terminal with full interactivity

## Example

```javascript
import editor from '../lib/editor/index.js';

async function collectUserStory() {
  console.log('Opening editor for user story...');
  console.log('Please write your story. Save and exit when done.');
  
  const story = await editor();
  
  if (!story.trim()) {
    console.log('No story provided');
    return null;
  }
  
  console.log(`Story collected: ${story.length} characters`);
  return story;
}

const userStory = await collectUserStory();
```

## Notes

- Creates temporary files in the system temp directory
- Automatically cleans up temp files after reading
- Editor process inherits stdio for full terminal control
- Waits for editor to exit before reading the file
- Works with any editor that accepts a file path as argument

## Related Modules

- [transcribe](../transcribe) - Alternative input method via voice
- [prompt-cache](../prompt-cache) - Could cache editor input for reuse