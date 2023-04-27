# Prompts

Prompts are functions that produce a single LLM prompt. They can be parameterized in a number of ways in order to fit their problem as closely as possible.

## Prompt Functions

Currently there isn't much to the structure of these functions, and they're not currently tested.

Going forward, functions should output a structured representation whose contents can be validated. An obvious candidate for this representation is HTML.

The functions can generate HTML from their inputs and this structure can be transformed into text before sending to ChatGPT. This approach has many benefits. We can use all the tools available for working with HTML. The function outputs can be tested. All varieties of markup problems, like nested content, are trivially solved as well.

# Constants

Currently it's reasonable to keep the text fragments needed for building prompts in a single constants.js file. It's forseable that the number of text fragments will grow. At that point, it would make sense to maintain them with a CMS such as Strapi.
