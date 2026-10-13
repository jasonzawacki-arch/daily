// Dependency-free single-file bundler: TypeScript -> CommonJS modules -> one inline <script>.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  console.error('The "typescript" package is required. Run `npm install` first.');
  process.exit(1);
}
const SRC = 'src', ENTRY = ['db.ts', 'cloud.ts', 'pdf.ts', 'voice.ts', 'shell.ts', 'protocol.ts', 'lift.ts'];
const mods = {};
const add = (name) => {
  if (mods[name]) return;
  const file = path.join(SRC, name);
  const text = fs.readFileSync(file, 'utf8');
  if (name.endsWith('.css')) { mods[name] = 'module.exports={__esModule:true,default:' + JSON.stringify(text) + '};'; return; }
  const out = ts.transpileModule(text, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  mods[name] = out.outputText;
  for (const m of out.outputText.matchAll(/require\("\.\/([^"]+)"\)/g)) add(m[1].replace(/^\.\//, '').replace(/\.js$/, '.ts'));
};
ENTRY.forEach(add);
let js = '(function(){var M={},C={};function R(n){if(C[n])return C[n].exports;var m=C[n]={exports:{}};M[n](m,m.exports,function(x){return R(x.replace(/^\\.\\//,"").replace(/\\.js$/,".ts"))});return m.exports}\n';
for (const [n, c] of Object.entries(mods)) js += 'M[' + JSON.stringify(n) + ']=function(module,exports,require){\n' + c + '\n};\n';
js += JSON.stringify(ENTRY) + '.forEach(R);})();';
js = js.replace(/<\/script/gi, '<\\/script');
const tpl = fs.readFileSync(path.join(SRC, 'index.template.html'), 'utf8');
const html = tpl.replace('/*CSS*/', () => fs.readFileSync(path.join(SRC, 'global.css'), 'utf8')).replace('/*JS*/', () => '\n' + js + '\n');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/daily.html', html);
console.log('dist/daily.html', html.length, 'bytes');
