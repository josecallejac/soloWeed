const fs = require('fs');

function refactorPageTsx() {
  const file = 'E:/soloWeed/src/app/page.tsx';
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace calls
  content = content.replace(/hasCatalogIntersection/g, 'hasIntersection');
  content = content.replace(/hasAnyCatalogToken/g, 'hasAnyToken');
  content = content.replace(/hasCatalogCompatibleSize/g, 'hasCompatibleSize');
  content = content.replace(/hasCatalogScaleConflict/g, 'hasScaleConflict');
  content = content.replace(/getCatalogScaleKeys/g, 'getScaleKeys');
  content = content.replace(/hasCatalogHardModelConflict/g, 'hasHardModelConflict');
  content = content.replace(/getCatalogHardModelTokens/g, 'getHardModelTokens');
  content = content.replace(/getCatalogAccessoryKind/g, 'getAccessoryKind');
  content = content.replace(/getCatalogRawTrayModel/g, 'getRawTrayModel');

  // Replace hasCatalogDistinctiveConflict body
  content = content.replace(
    /function hasCatalogDistinctiveConflict\(first: Set<string>, second: Set<string>\) \{\s*if \(first.size === 0 && second.size === 0\) \{\s*return false;\s*\}\s*return !hasIntersection\(first, second\);\s*\}/g,
    'function hasCatalogDistinctiveConflict(first: Set<string>, second: Set<string>) { return first.size > 0 || second.size > 0 ? !hasIntersection(first, second) : false; }'
  );

  // 1. hasAnyToken
  content = content.replace(/function hasAnyToken\(tokens: Set<string>, values: string\[\]\) \{\s*return values\.some\(\(value\) => tokens\.has\(value\)\);\s*\}/g, '');

  // 2. hasIntersection
  content = content.replace(/function hasIntersection\(first: Set<string>, second: Set<string>\) \{\s*for \(const value of first\) \{\s*if \(second\.has\(value\)\) \{\s*return true;\s*\}\s*\}\s*return false;\s*\}/g, '');

  // 3. hasCompatibleSize
  content = content.replace(/function hasCompatibleSize\(first: Set<string>, second: Set<string>\) \{\s*if \(hasIntersection\(first, second\)\) \{\s*return true;\s*\}\s*for \(const firstSize of first\) \{\s*const firstMillimeters = getMillimeters\(firstSize\);\s*if \(firstMillimeters === undefined\) \{\s*continue;\s*\}\s*for \(const secondSize of second\) \{\s*const secondMillimeters = getMillimeters\(secondSize\);\s*if \(secondMillimeters !== undefined && Math\.abs\(firstMillimeters - secondMillimeters\) <= 4\) \{\s*return true;\s*\}\s*\}\s*\}\s*return false;\s*\}/g, '');

  // 4. hasScaleConflict
  content = content.replace(/function hasScaleConflict\(first: Set<string>, second: Set<string>\) \{\s*const firstScale = getScaleKeys\(first\);\s*const secondScale = getScaleKeys\(second\);\s*return firstScale\.size > 0 && secondScale\.size > 0 && !hasIntersection\(firstScale, secondScale\);\s*\}/g, '');

  // 5. getAccessoryKind
  content = content.replace(/function getAccessoryKind\(tokens: Set<string>\) \{\s*if \(hasAnyToken\(tokens, \["tapa", "magnetica", "magnetico", "cover", "lid"\]\)\) \{\s*return "cover";\s*\}\s*if \(hasAnyToken\(tokens, \["cenicero", "ceniceros", "ashtray"\]\)\) \{\s*return "ashtray";\s*\}\s*if \(hasAnyToken\(tokens, \["bandeja", "bandejas", "tray", "rolling"\]\)\) \{\s*return "tray";\s*\}\s*return null;\s*\}/g, '');

  // 6. getRawTrayModel
  content = content.replace(/function getRawTrayModel\(profile: CatalogProfile\) \{\s*if \(profile\.tokens\.has\("brazilian"\)\) \{\s*return "brazilian-girl";\s*\}\s*if \(profile\.tokens\.has\("prepare"\) && profile\.tokens\.has\("flight"\)\) \{\s*return "prepare-flight";\s*\}\s*if \(profile\.tokens\.has\("emerald"\)\) \{\s*return "emerald";\s*\}\s*if \(profile\.tokens\.has\("girl"\)\) \{\s*return "girl";\s*\}\s*if \(profile\.tokens\.has\("classic"\) \|\| profile\.tokens\.has\("clasica"\) \|\| profile\.tokens\.has\("clasico"\)\) \{\s*return "classic";\s*\}\s*return null;\s*\}/g, '');

  // 7. hasHardModelConflict
  content = content.replace(/function hasHardModelConflict\(first: Set<string>, second: Set<string>\) \{\s*const firstModel = getHardModelTokens\(first\);\s*const secondModel = getHardModelTokens\(second\);\s*return \(firstModel\.size > 0 \|\| secondModel\.size > 0\) && !hasIntersection\(firstModel, secondModel\);\s*\}/g, '');

  // 8. getHardModelTokens
  content = content.replace(/function getHardModelTokens\(tokens: Set<string>\) \{\s*const hardTokens = new Set<string>\(\);\s*for \(const token of tokens\) \{\s*if \(CATALOG_HARD_MODEL_TOKENS\.has\(token\)\) \{\s*hardTokens\.add\(token\);\s*\}\s*\}\s*return hardTokens;\s*\}/g, '');

  // 9. getScaleKeys
  content = content.replace(/function getScaleKeys\(tokens: Set<string>\) \{\s*const keys = new Set<string>\(\);\s*for \(const token of tokens\) \{\s*const key = CATALOG_SCALE_KEYS\.get\(token\);\s*if \(key\) \{\s*keys\.add\(key\);\s*\}\s*\}\s*return keys;\s*\}/g, '');
  
  // Refactor hasCatalogAccessoryKindConflict
  content = content.replace(
    /function hasCatalogAccessoryKindConflict\(first: CatalogProfile, second: CatalogProfile\) \{\s*if \(first\.category !== "bandejas y ceniceros" \|\| second\.category !== "bandejas y ceniceros"\) \{\s*return false;\s*\}\s*return Boolean\(first\.accessoryKind && second\.accessoryKind && first\.accessoryKind !== second\.accessoryKind\);\s*\}/g,
    'function hasCatalogAccessoryKindConflict(first: CatalogProfile, second: CatalogProfile) { return hasAccessoryKindConflict(first.category, first.accessoryKind, second.category, second.accessoryKind); }'
  );

  // Refactor hasCatalogRawTrayModelConflict
  content = content.replace(
    /function hasCatalogRawTrayModelConflict\(first: CatalogProfile, second: CatalogProfile\) \{\s*if \(first\.category !== "bandejas y ceniceros" \|\| second\.category !== "bandejas y ceniceros"\) \{\s*return false;\s*\}\s*if \(!first\.brandTokens\.has\("raw"\) \|\| !second\.brandTokens\.has\("raw"\)\) \{\s*return false;\s*\}\s*const firstModel = getRawTrayModel\(first\);\s*const secondModel = getRawTrayModel\(second\);\s*if \(firstModel && secondModel\) \{\s*return firstModel !== secondModel;\s*\}\s*const model = firstModel \?\? secondModel;\s*return Boolean\(model && model !== "classic"\);\s*\}/g,
    'function hasCatalogRawTrayModelConflict(first: CatalogProfile, second: CatalogProfile) { return hasRawTrayModelConflict(first.category, first.brandTokens, first.tokens, second.category, second.brandTokens, second.tokens); }'
  );

  content = content.replace(
    /import \{\s*countIntersection,\s*getMillimeters,\s*hasIntersection,\s*\} from "@\/lib\/matching-utils";/g,
    `import {\n  countIntersection,\n  getAccessoryKind,\n  getHardModelTokens,\n  getMillimeters,\n  getRawTrayModel,\n  getScaleKeys,\n  hasAccessoryKindConflict,\n  hasAnyToken,\n  hasCompatibleSize,\n  hasHardModelConflict,\n  hasIntersection,\n  hasRawTrayModelConflict,\n  hasScaleConflict,\n} from "@/lib/matching-utils";`
  );

  fs.writeFileSync(file, content);
}

function refactorProductPageTsx() {
  const file = 'E:/soloWeed/src/app/productos/[...slug]/page.tsx';
  let content = fs.readFileSync(file, 'utf-8');

  // Replace hasAccessoryKindConflict body
  content = content.replace(
    /function hasAccessoryKindConflict\(seed: ComparableProfile, candidate: ComparableProfile\) \{\s*if \(seed\.category !== "bandejas y ceniceros" \|\| candidate\.category !== "bandejas y ceniceros"\) \{\s*return false;\s*\}\s*return Boolean\(seed\.accessoryKind && candidate\.accessoryKind && seed\.accessoryKind !== candidate\.accessoryKind\);\s*\}/g,
    'function hasAccessoryKindConflictLocal(seed: ComparableProfile, candidate: ComparableProfile) { return hasAccessoryKindConflict(seed.category, seed.accessoryKind, candidate.category, candidate.accessoryKind); }'
  );
  // change calls to hasAccessoryKindConflictLocal
  content = content.replace(/hasAccessoryKindConflict\(/g, 'hasAccessoryKindConflictLocal(');
  
  // Replace hasRawTrayModelConflict body
  content = content.replace(
    /function hasRawTrayModelConflict\(seed: ComparableProfile, candidate: ComparableProfile\) \{\s*if \(seed\.category !== "bandejas y ceniceros" \|\| candidate\.category !== "bandejas y ceniceros"\) \{\s*return false;\s*\}\s*if \(!seed\.brandTokens\.has\("raw"\) \|\| !candidate\.brandTokens\.has\("raw"\)\) \{\s*return false;\s*\}\s*const seedModel = getRawTrayModel\(seed\);\s*const candidateModel = getRawTrayModel\(candidate\);\s*if \(seedModel && candidateModel\) \{\s*return seedModel !== candidateModel;\s*\}\s*const model = seedModel \?\? candidateModel;\s*return Boolean\(model && model !== "classic"\);\s*\}/g,
    'function hasRawTrayModelConflictLocal(seed: ComparableProfile, candidate: ComparableProfile) { return hasRawTrayModelConflict(seed.category, seed.brandTokens, seed.tokens, candidate.category, candidate.brandTokens, candidate.tokens); }'
  );
  // change calls
  content = content.replace(/hasRawTrayModelConflict\(/g, 'hasRawTrayModelConflictLocal(');

  // Remove redundant functions
  content = content.replace(/function getRawTrayModel\(profile: ComparableProfile\) \{\s*if \(profile\.tokens\.has\("brazilian"\)\) \{\s*return "brazilian-girl";\s*\}\s*if \(profile\.tokens\.has\("prepare"\) && profile\.tokens\.has\("flight"\)\) \{\s*return "prepare-flight";\s*\}\s*if \(profile\.tokens\.has\("emerald"\)\) \{\s*return "emerald";\s*\}\s*if \(profile\.tokens\.has\("girl"\)\) \{\s*return "girl";\s*\}\s*if \(profile\.tokens\.has\("classic"\) \|\| profile\.tokens\.has\("clasica"\) \|\| profile\.tokens\.has\("clasico"\)\) \{\s*return "classic";\s*\}\s*return null;\s*\}/g, '');
  content = content.replace(/function hasIntersection\(first: Set<string>, second: Set<string>\) \{\s*for \(const value of first\) \{\s*if \(second\.has\(value\)\) \{\s*return true;\s*\}\s*\}\s*return false;\s*\}/g, '');
  content = content.replace(/function hasCompatibleSize\(first: Set<string>, second: Set<string>\) \{\s*if \(hasIntersection\(first, second\)\) \{\s*return true;\s*\}\s*for \(const firstSize of first\) \{\s*const firstMillimeters = getMillimeters\(firstSize\);\s*if \(firstMillimeters === undefined\) \{\s*continue;\s*\}\s*for \(const secondSize of second\) \{\s*const secondMillimeters = getMillimeters\(secondSize\);\s*if \(secondMillimeters !== undefined && Math\.abs\(firstMillimeters - secondMillimeters\) <= 4\) \{\s*return true;\s*\}\s*\}\s*\}\s*return false;\s*\}/g, '');
  content = content.replace(/function hasHardModelConflict\(first: Set<string>, second: Set<string>\) \{\s*const firstModel = getHardModelTokens\(first\);\s*const secondModel = getHardModelTokens\(second\);\s*return \(firstModel\.size > 0 \|\| secondModel\.size > 0\) && !hasIntersection\(firstModel, secondModel\);\s*\}/g, '');
  content = content.replace(/function getHardModelTokens\(tokens: Set<string>\) \{\s*const hardTokens = new Set<string>\(\);\s*for \(const token of tokens\) \{\s*if \(HARD_MODEL_TOKENS\.has\(token\)\) \{\s*hardTokens\.add\(token\);\s*\}\s*\}\s*return hardTokens;\s*\}/g, '');
  content = content.replace(/function getAccessoryKind\(tokens: Set<string>\) \{\s*if \(hasAnyToken\(tokens, \["tapa", "magnetica", "magnetico", "cover", "lid"\]\)\) \{\s*return "cover";\s*\}\s*if \(hasAnyToken\(tokens, \["cenicero", "ceniceros", "ashtray"\]\)\) \{\s*return "ashtray";\s*\}\s*if \(hasAnyToken\(tokens, \["bandeja", "bandejas", "tray", "rolling"\]\)\) \{\s*return "tray";\s*\}\s*return null;\s*\}/g, '');
  content = content.replace(/function hasAnyToken\(tokens: Set<string>, values: string\[\]\) \{\s*return values\.some\(\(value\) => tokens\.has\(value\)\);\s*\}/g, '');

  // Add imports
  content = content.replace(
    /import \{\s*getMillimeters,\s*\} from "@\/lib\/matching-utils";/g,
    `import {\n  getAccessoryKind,\n  getHardModelTokens,\n  getMillimeters,\n  getRawTrayModel,\n  hasAccessoryKindConflict,\n  hasAnyToken,\n  hasCompatibleSize,\n  hasHardModelConflict,\n  hasIntersection,\n  hasRawTrayModelConflict,\n} from "@/lib/matching-utils";`
  );

  fs.writeFileSync(file, content);
}

refactorPageTsx();
refactorProductPageTsx();
console.log("Refactoring complete");
