/**
 * Post-build script to copy individual CSS files to dist
 */

import fs from 'fs';
import path from 'path';

const srcCssDir = 'src/css';
const distDir = 'dist';

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copy individual CSS files
const cssFiles = ['editor.css', 'content-defaults.css', 'prism-theme.css'];

// style.css = chrome + structural only (prism and content-defaults are optional separate imports)
const styleCssFiles = ['editor.css'];
let combinedCss = '';

cssFiles.forEach(file => {
    const srcPath = path.join(srcCssDir, file);
    const destPath = path.join(distDir, file);
    
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file} to dist/`);
    }
});

// Build combined style.css from chrome/structural files only
styleCssFiles.forEach(file => {
    const srcPath = path.join(srcCssDir, file);
    if (fs.existsSync(srcPath)) {
        const content = fs.readFileSync(srcPath, 'utf8');
        combinedCss += `/* ${file} */\n${content}\n\n`;
    }
});

// Create combined CSS file
const styleCssPath = path.join(distDir, 'style.css');
fs.writeFileSync(styleCssPath, combinedCss);
console.log('Created combined style.css');

// Copy TypeScript definitions
const tsDefsPath = path.join('src', 'index.d.ts');
const distTsDefsPath = path.join(distDir, 'index.d.ts');
if (fs.existsSync(tsDefsPath)) {
    fs.copyFileSync(tsDefsPath, distTsDefsPath);
    console.log('Copied TypeScript definitions');
}

console.log('CSS files copied successfully!');
