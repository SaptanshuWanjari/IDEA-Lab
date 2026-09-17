const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace colors
  content = content.replace(/#D7FF38/g, '#3B82F6');
  content = content.replace(/rgba\(215, 255, 56/g, 'rgba(59, 130, 246');
  content = content.replace(/rgba\(215,255,56/g, 'rgba(59,130,246');
  
  // App.tsx minWidth: 1200 -> remove or change to width: '100%'
  if (file.endsWith('App.tsx')) {
    content = content.replace(/minWidth: 1200/g, "width: '100%'");
    // Also remove the explicit height if it's there
  }

  // Replace maxWidth on main containers
  if (file.includes('/pages/')) {
    content = content.replace(/maxWidth: 1200/g, "width: '100%'");
    content = content.replace(/maxWidth: 1100/g, "width: '100%'");
    content = content.replace(/maxWidth: 1300/g, "width: '100%'");
    content = content.replace(/maxWidth: 900/g, "width: '100%'");
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
