const fs = require('fs');

function refactorMatchingTs() {
  const file = 'E:/soloWeed/src/lib/matching.ts';
  let content = fs.readFileSync(file, 'utf-8');

  // Replace hasIntersection body
  content = content.replace(/export function hasIntersection\(first: Set<string>, second: Set<string>\) \{\s*for \(const value of first\) \{\s*if \(second\.has\(value\)\) \{\s*return true;\s*\}\s*\}\s*return false;\s*\}/g, '');

  content = content.replace(
    /import \{\s*BRAND_ALIASES,\s*CATEGORY_COMPATIBILITY_MATRIX,/g,
    `import {\n  hasIntersection,\n} from "./matching-utils";\n\nimport {\n  BRAND_ALIASES,\n  CATEGORY_COMPATIBILITY_MATRIX,`
  );

  fs.writeFileSync(file, content);
}

refactorMatchingTs();
console.log("matching.ts refactored");
