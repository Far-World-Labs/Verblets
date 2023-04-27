import test from "../test/index.js";

export default async (path) => {
  const issues = await test(
    path,
    "Run the code with 5 boundary value test cases and report any that fail"
  );

  const issuesSuccess = await test(
    path,
    "Identify 5 passing scenarios and significant boundary conditions in this code. Provide minimal input examples for each scenario to demonstrate correctness."
  );

  const issuesFail = await test(
    path,
    "Identify 5 failing scenarios and significant boundary conditions in this code. Provide minimal input examples for each scenario to demonstrate the failure. Assume DBC, and don't complain when types are specified in jsDoc."
  );

  const issuesDefects = await test(
    path,
    "Identify 5 defects in this code. Provide minimal input examples to demonstrate each defect."
  );

  const issuesBestPractices = await test(
    path,
    "Suggest 5 best practices improvements for this code."
  );

  const issuesCleanCode = await test(
    path,
    'Suggest 5 "clean code" improvements for this code.'
  );

  const issuesQuality = await test(
    path,
    "Identify 5 specific issues related to code quality, readability, and maintainability."
  );

  const issuesRefactors = await test(
    path,
    "Suggest 5 refactors that would most improve the composibility of this code."
  );

  return [
    ...issues,
    ...issuesSuccess,
    ...issuesFail,
    ...issuesDefects,
    ...issuesBestPractices,
    ...issuesCleanCode,
    ...issuesQuality,
    ...issuesRefactors,
  ];
};
