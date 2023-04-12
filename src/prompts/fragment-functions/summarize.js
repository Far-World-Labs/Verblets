export default (text, {
  minWords=5,
  maxWords=20,
}) => {
  return `Summarize the following text:
\`\`\`
${text}
\`\`\`

Use between ${minWords} and ${maxWords} words in the summary.
`
}
