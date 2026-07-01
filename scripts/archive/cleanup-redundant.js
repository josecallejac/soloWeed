const fs = require('fs');

function cleanupPageTsx() {
  const file = 'E:/soloWeed/src/app/page.tsx';
  let content = fs.readFileSync(file, 'utf-8');
  
  // Fix getRawTrayModel type error
  content = content.replace(/getRawTrayModel\(first\)/g, 'getRawTrayModel(first.tokens)');
  content = content.replace(/getRawTrayModel\(second\)/g, 'getRawTrayModel(second.tokens)');

  content = content.replace(/getMillimeters,\s*/g, '');
  content = content.replace(/getScaleKeys,\s*/g, '');
  content = content.replace(/getHardModelTokens,\s*/g, '');
  
  content = content.replace(/const CATALOG_SCALE_KEYS\s*=\s*new Map<string, string>\(\[\s*(?:\[[^\]]*\],\s*)*\]\);\s*/, '');
  content = content.replace(/const CATALOG_HARD_MODEL_TOKENS\s*=\s*new Set<string>\(\[\s*(?:"[^"]*",\s*)*\]\);\s*/, '');
  
  // Also remove unused MATERIAL_TOKENS if it was there? No, just the ones reported.

  fs.writeFileSync(file, content);
}

function cleanupProductPageTsx() {
  const file = 'E:/soloWeed/src/app/productos/[...slug]/page.tsx';
  let content = fs.readFileSync(file, 'utf-8');

  content = content.replace(/getMillimeters,\s*/g, '');
  content = content.replace(/getHardModelTokens,\s*/g, ''); // just in case
  
  content = content.replace(/const HARD_MODEL_TOKENS\s*=\s*new Set<string>\(\[\s*(?:"[^"]*",\s*)*\]\);\s*/, '');

  fs.writeFileSync(file, content);
}

cleanupPageTsx();
cleanupProductPageTsx();
console.log("Cleanup and fix complete");
