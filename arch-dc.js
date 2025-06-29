import { cruise } from 'dependency-cruiser';
import { asContext } from './src/chains/ai-arch-expect/index.js';
import fs from 'fs';
import path from 'path';

// Dependency Cruiser integration for architectural assertions
// Provides repository structure understanding and dependency analysis

// Generate DC analysis for the codebase
export async function getDependencyAnalysis(options = {}) {
  const defaultOptions = {
    includeOnly: '^src/',
    exclude: {
      path: 'node_modules|\\.(spec|test|examples)\\.'
    },
    outputType: 'json',
    ...options
  };

  try {
    const result = await cruise(['src'], defaultOptions);
    return result.output ? JSON.parse(result.output) : result;
  } catch (error) {
    console.warn('Dependency cruiser analysis failed:', error.message);
    return { modules: [], summary: { error: error.message } };
  }
}

// Create context from DC analysis
export const asDCContext = {
  // Full dependency analysis as context
  analysis: async (name = 'dc-analysis') => {
    const analysis = await getDependencyAnalysis();
    return asContext.data(analysis, name);
  },
  
  // Just the module structure
  modules: async (name = 'modules') => {
    const analysis = await getDependencyAnalysis();
    return asContext.data(analysis.modules || [], name);
  },
  
  // Dependency violations only
  violations: async (name = 'violations') => {
    const analysis = await getDependencyAnalysis();
    const violations = analysis.modules?.filter(m => 
      m.dependencies?.some(d => d.valid === false)
    ) || [];
    return asContext.data(violations, name);
  },
  
  // Summary statistics
  summary: async (name = 'summary') => {
    const analysis = await getDependencyAnalysis();
    return asContext.data(analysis.summary || {}, name);
  }
};

// Generic DC rule runner - takes any DC rule configuration
export async function runDCRule(ruleConfig, options = {}) {
  const tempRules = {
    forbidden: [ruleConfig],
    ...options
  };
  
  try {
    const result = await cruise(['src'], {
      includeOnly: '^src/',
      exclude: { path: 'node_modules|\\.(spec|test|examples)\\.' },
      outputType: 'json',
      ruleSet: tempRules
    });
    
    const analysis = result.output ? JSON.parse(result.output) : result;
    const violations = analysis.summary?.violations || 0;
    
    // Throw if violations found (for use with expect)
    if (violations > 0) {
      const violationDetails = analysis.modules?.filter(m => 
        m.dependencies?.some(d => d.valid === false)
      ) || [];
      
      // Create detailed error message showing specific violations
      const errorLines = [`Rule "${ruleConfig.name}" violated (${violations} violations):`];
      
      violationDetails.slice(0, 10).forEach(module => {
        const badDeps = module.dependencies?.filter(d => d.valid === false) || [];
        badDeps.forEach(dep => {
          errorLines.push(`  ${module.source} → ${dep.resolved || dep.module}`);
          if (dep.rules && dep.rules.length > 0) {
            errorLines.push(`    Rule: ${dep.rules[0].name}`);
          }
        });
      });
      
      if (violationDetails.length > 10) {
        errorLines.push(`  ... and ${violationDetails.length - 10} more violations`);
      }
      
      throw new Error(errorLines.join('\n'));
    }
    
    return analysis;
  } catch (error) {
    if (error.message.includes('Rule "')) {
      throw error; // Re-throw our formatted error
    }
    throw new Error(`DC analysis failed: ${error.message}`);
  }
}

// Generic file structure checker
export async function checkFileStructure(expectedFiles = ['index.js'], options = {}) {
  const analysis = await getDependencyAnalysis();
  const violations = [];
  
  // Get unique directories from DC analysis
  const directories = new Set();
  analysis.modules?.forEach(module => {
    const dir = path.dirname(module.source);
    if (dir !== 'src' && dir.startsWith('src/')) {
      directories.add(dir);
    }
  });
  
  // Check each directory for expected files
  const missingByDir = {};
  for (const dir of directories) {
    for (const expectedFile of expectedFiles) {
      const filePath = path.join(dir, expectedFile);
      if (!fs.existsSync(filePath)) {
        violations.push(`${dir}/${expectedFile}`);
        if (!missingByDir[dir]) missingByDir[dir] = [];
        missingByDir[dir].push(expectedFile);
      }
    }
  }
  
  if (violations.length > 0) {
    const maxViolations = options.maxViolations || 0;
    if (violations.length > maxViolations) {
      // Create detailed error message showing which files are missing from which directories
      const errorLines = [`Missing ${violations.length} required files:`];
      
      const dirEntries = Object.entries(missingByDir).slice(0, 15);
      dirEntries.forEach(([dir, files]) => {
        errorLines.push(`  ${dir}/`);
        files.forEach(file => {
          errorLines.push(`    ✗ ${file}`);
        });
      });
      
      if (Object.keys(missingByDir).length > 15) {
        const remaining = Object.keys(missingByDir).length - 15;
        errorLines.push(`  ... and ${remaining} more directories`);
      }
      
      throw new Error(errorLines.join('\n'));
    }
  }
  
  return { directories: Array.from(directories), violations };
}

// Context group that includes DC analysis
export const dcContext = () => [
  asDCContext.analysis(),
  asDCContext.summary('dc-summary')
]; 