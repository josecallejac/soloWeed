const fs = require('fs');

function cleanPageTsx() {
  const file = 'E:/soloWeed/src/app/page.tsx';
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  let newLines = [];
  let inImports = false;
  let inFuzzy = false;
  let inProfile = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Remove matching-constants and matching-utils imports
    if (line.includes('from "@/lib/matching-constants"')) {
      // Remove previous lines until 'import {'
      while (newLines.length > 0 && !newLines[newLines.length - 1].startsWith('import {')) {
        newLines.pop();
      }
      if (newLines.length > 0 && newLines[newLines.length - 1].startsWith('import {')) {
        newLines.pop();
      }
      continue;
    }
    if (line.includes('from "@/lib/matching-utils"')) {
      while (newLines.length > 0 && !newLines[newLines.length - 1].startsWith('import {')) {
        newLines.pop();
      }
      if (newLines.length > 0 && newLines[newLines.length - 1].startsWith('import {')) {
        newLines.pop();
      }
      continue;
    }

    // Remove groupKey
    if (line.trim() === 'groupKey: string;') continue;
    if (line.trim() === 'groupKey: getCatalogGroupKey(representative),') continue;

    // Remove Constants & Profile block
    if (line.startsWith('const CATALOG_GENERIC_TOKENS')) {
      inProfile = true;
      continue;
    }
    if (inProfile) {
      if (line.startsWith('const catalogProfileCache =')) {
        inProfile = false;
      }
      continue;
    }

    // Remove everything from areCatalogEquivalent to EOF
    if (line.startsWith('function areCatalogEquivalent(')) {
      inFuzzy = true;
      break; // Everything below is deleted
    }

    newLines.push(line);
  }

  fs.writeFileSync(file, newLines.join('\n'));
}

cleanPageTsx();
console.log("Cleanup script completed.");
