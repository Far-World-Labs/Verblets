import test from '../test/index.js';

const boundaryIssues = 'Run the code with 5 boundary value test cases and report any that fail';

const successIssues =
  'Identify 5 passing scenarios and significant boundary conditions in this code. Provide minimal input examples for each scenario to demonstrate correctness.';

const failureIssues =
  "Identify 5 failing scenarios and significant boundary conditions in this code. Provide minimal input examples for each scenario to demonstrate the failure. Assume DBC, and don't complain when types are specified in jsDoc.";

const defectIssues =
  'Identify 5 defects in this code. Provide minimal input examples to demonstrate each defect.';

const bestPracticesIssues = 'Suggest 5 best practices improvements for this code.';

const cleanCodeIssues = 'Suggest 5 "clean code" improvements for this code.';

const qualityIssues =
  'Identify 5 specific issues related to code quality, readability, and maintainability.';

const refactorIssues =
  'Suggest 5 refactors that would most improve the composibility of this code.';

export default async (path) => {
  return [
    ...(await test(path, boundaryIssues)),
    ...(await test(path, successIssues)),
    ...(await test(path, failureIssues)),
    ...(await test(path, defectIssues)),
    ...(await test(path, bestPracticesIssues)),
    ...(await test(path, cleanCodeIssues)),
    ...(await test(path, qualityIssues)),
    ...(await test(path, refactorIssues)),
  ];
};
