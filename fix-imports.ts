import fs from 'fs';
import path from 'path';

function fixImports(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixImports(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const newContent = content.replace(/import\s+{([^}]+)}\s+from\s+['"]([^'"]*types[^'"]*)['"]/g, 'import type { $1 } from \'$2\'');
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf-8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

fixImports('./src');
