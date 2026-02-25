const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/controllers');
const files = fs.readdirSync(dir).filter(f => f.startsWith('admin') && f.endsWith('.js'));

let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Pattern 1:
  // id: report.id.toString(),
  // id: report.id.toString(),
  const regex1 = /id:\s*([a-zA-Z0-9_]+)\.id\.toString\(\),\s*id:\s*\1\.id\.toString\(\),/g;
  if (regex1.test(content)) {
    const original = content;
    content = content.replace(regex1, 'id: $1.id.toString(),\n                _id: $1.id.toString(),');
    if (content !== original) {
      console.log(`Fixed duplicate id mapping in ${file}`);
      totalFixed++;
    }
  }

  // Pattern 2: (when it's part of an object spread without a line break in between)
  // ...report, id: report.id.toString(),
  // id: report.id.toString(),
  const regex2 = /\.\.\.([a-zA-Z0-9_]+),\s*id:\s*\1\.id\.toString\(\),\s*id:\s*\1\.id\.toString\(\),/g;
  if (regex2.test(content)) {
    const original = content;
    content = content.replace(regex2, '...$1,\n                id: $1.id.toString(),\n                _id: $1.id.toString(),');
    if (content !== original) {
      console.log(`Fixed spread duplicate id mapping in ${file}`);
      totalFixed++;
    }
  }
  
  fs.writeFileSync(filePath, content);
}

console.log(`Done! Fixed issues in ${totalFixed} files.`);
