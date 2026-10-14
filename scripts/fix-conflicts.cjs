const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('<<<<<<< HEAD')) return;

  const lines = content.split('\n');
  const newLines = [];
  let keeping = true;
  let inConflict = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('<<<<<<< HEAD')) {
      inConflict = true;
      keeping = true; // we want the HEAD side
      continue;
    }
    if (line.startsWith('=======')) {
      if (inConflict) {
        keeping = false; // drop the incoming side
        continue;
      }
    }
    if (line.startsWith('>>>>>>>')) {
      if (inConflict) {
        inConflict = false;
        keeping = true;
        continue;
      }
    }
    
    if (keeping) {
      newLines.push(line);
    }
  }

  fs.writeFileSync(filePath, newLines.join('\n'));
  console.log('Fixed', filePath);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, '..', 'src'));
