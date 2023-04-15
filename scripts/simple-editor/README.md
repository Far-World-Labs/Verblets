# Simple Prompt Editor

This is a simple command-line tool that allows you to interact with the ChatGPT library using your system's default text editor or nano if none is defined.

## Usage

To run the simple ChatGPT editor, use the following command:

```bash
npm run script -- simple-editor
```

It will open your system's default text editor or nano if none is defined. The editor allows you to enter your input text, which is then processed by the ChatGPT library. The script performs intent detection to match your request with one of the supported library commands. By default, it does ordinary ChatGPT completion.


## Adding Support for New Commands

To add support for new commands, you need to modify the operations array in the provided code. Each command should be an object with the following properties:

 - name: A unique identifier for the command.
 - parameters: An array of parameter names that the command accepts.
 - operation: A function that takes an object with the parameters as keys and returns the result of the command.

To add a new command, simply append a new object to the operations array with the required properties. For example, to add a sum command that takes two numbers and returns their sum, you would add the following object:

```javascript
{
  name: 'sum',
  parameters: ['number1', 'number2'],
  operation: ({ number1, number2 }) => Number(number1) + Number(number2),
}
```

After adding the new command, the intent detection function will be able to match the user's input with the new command, and the script will execute the corresponding operation.
