const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:\\HRMS\\src\\app\\api');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('const payload = verifyToken(token);')) {
    content = content.replace(/const payload = verifyToken\(token\);/g, 'const payload = verifyToken(token) as { id: string } | null;');
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
