const fs = require('fs');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../frontend/script.js');
const indexPath = path.resolve(__dirname, '../frontend/index.html');

function searchFile(filePath, query) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    console.log(`\n--- Searching inside ${path.basename(filePath)} for "${query}" ---`);
    lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(query.toLowerCase())) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    });
}

searchFile(scriptPath, 'pincode');
searchFile(indexPath, 'pincode');
