#!/usr/bin/env node
// IIFE 模块化打包: 每个文件包裹成独立作用域,通过 __modules 表共享 export
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const ASSETS_SRC = path.join(ROOT, 'assets');
const ASSETS_DIST = path.join(DIST, 'assets');

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

// 模块顺序: 数据 -> 引擎 -> 渲染 -> 系统 -> 场景 -> main
const moduleOrder = [
  'src/config.js',
  'src/utils.js',
  'src/engine/input.js',
  'src/engine/audio.js',
  'src/engine/tween.js',
  'src/engine/particles.js',
  'src/engine/transition.js',
  'src/engine/assets.js',
  'src/rendering/draw.js',
  'src/rendering/background.js',
  'src/rendering/sprites.js',
  'src/rendering/atmosphere.js',
  'src/data/star-types.js',
  'src/data/npc-data.js',
  'src/data/cd-data.js',
  'src/data/radio-data.js',
  'src/data/planet-lines.js',
  'src/data/item-unlock-dialogs.js',
  'src/data/home-ending-lines.js',
  'src/data/bad-npc-lines.js',
  'src/data/game-state.js',
  'src/data/galaxy-generator.js',
  'src/systems/dialog.js',
  'src/systems/credits.js',
  'src/systems/music-player.js',
  'src/systems/sound-effects.js',
  'src/systems/scene-manager.js',
  'src/systems/tutorial.js',
  'src/scenes/main-menu.js',
  'src/scenes/galaxy-map.js',
  'src/scenes/system-map.js',
  'src/scenes/flight.js',
  'src/scenes/planet-explore.js',
  'src/scenes/prologue.js',
  'src/scenes/home-ending.js',
  'src/scenes/ending.js',
  'src/main.js',
];

// 把相对路径(./x.js / ../x.js)解析为相对 ROOT 的模块 key,如 'src/config.js'
function resolveModuleKey(fromFile, importPath) {
  const fromDir = path.dirname(fromFile);
  const absolute = path.resolve(path.join(ROOT, fromDir), importPath);
  let key = path.relative(ROOT, absolute).replace(/\\/g, '/');
  if (!key.endsWith('.js')) key += '.js';
  return key;
}

// 解析单个 import 语句的具名列表
// 输入: "{ A, B as C, D }"
// 输出: [{ local: 'A', imported: 'A' }, { local: 'C', imported: 'B' }, ...]
function parseNamedImports(specifiers) {
  return specifiers
    .replace(/[{}]/g, '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const m = s.match(/^(\w+)\s+as\s+(\w+)$/);
      if (m) return { imported: m[1], local: m[2] };
      return { imported: s, local: s };
    });
}

// 转换单个 .js 模块为 IIFE 字符串
function transformModule(modPath, source) {
  // 统一行尾,避免 CRLF 让正则的 .* 和 $ 失配
  source = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = source.split('\n');
  const out = [];
  const exports = []; // { name, local? }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 跳过 import 语句 (单行 / 多行)
    if (/^import\s/.test(trimmed)) {
      // 收集完整 import 直到出现 from '...' 或者本身就是 side-effect import
      let buf = line;
      while (!/from\s+['"][^'"]+['"]\s*;?\s*$/.test(buf.trim()) &&
             !/^import\s+['"][^'"]+['"]\s*;?\s*$/.test(buf.trim())) {
        i++;
        if (i >= lines.length) break;
        buf += '\n' + lines[i];
      }
      // 解析 buf
      const sideEffectMatch = buf.trim().match(/^import\s+['"]([^'"]+)['"]\s*;?\s*$/);
      if (sideEffectMatch) {
        const target = resolveModuleKey(modPath, sideEffectMatch[1]);
        out.push(`  __require(${JSON.stringify(target)});`);
      } else {
        const m = buf.match(/^\s*import\s+([\s\S]+?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/m);
        if (m) {
          const specRaw = m[1].trim();
          const target = resolveModuleKey(modPath, m[2]);
          // 仅支持具名 import: { A, B as C }
          if (specRaw.startsWith('{')) {
            const named = parseNamedImports(specRaw);
            const destructure = named
              .map(n => n.imported === n.local ? n.imported : `${n.imported}: ${n.local}`)
              .join(', ');
            out.push(`  const { ${destructure} } = __require(${JSON.stringify(target)});`);
          } else {
            // 默认导入: import X from '...' (本项目当前未使用,但保留)
            out.push(`  const ${specRaw} = __require(${JSON.stringify(target)}).default;`);
          }
        } else {
          out.push(`  // [build] unparsed import: ${buf.replace(/\n/g, ' ')}`);
        }
      }
      i++;
      continue;
    }

    // export const X = ...   /   export let X = ...   /   export var X = ...
    let m;
    m = line.match(/^(\s*)export\s+(const|let|var)\s+(\w+)(\s*=.*)?$/);
    if (m) {
      const indent = m[1], kw = m[2], name = m[3], rest = m[4] || '';
      out.push(`${indent}${kw} ${name}${rest}`);
      exports.push({ name, local: name });
      i++;
      continue;
    }

    // export function f(...) { 或 export async function f(...) {
    m = line.match(/^(\s*)export\s+(async\s+)?function\s+(\w+)\s*\(/);
    if (m) {
      const indent = m[1], asyncKw = m[2] || '', name = m[3];
      out.push(line.replace(/^(\s*)export\s+/, '$1'));
      exports.push({ name, local: name });
      i++;
      continue;
    }

    // export default ...
    m = line.match(/^(\s*)export\s+default\s+/);
    if (m) {
      out.push(line.replace(/^(\s*)export\s+default\s+/, '$1const __default = '));
      exports.push({ name: 'default', local: '__default' });
      i++;
      continue;
    }

    out.push(line);
    i++;
  }

  // 拼装 IIFE
  const body = out.join('\n');
  const exportLines = exports.map(e => `    ${e.name}: ${e.local}`).join(',\n');
  return `// === ${modPath} ===
__modules[${JSON.stringify(modPath)}] = (function(){
${body}
  return {
${exportLines}
  };
})();`;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 扫描一个模块的 import 依赖列表(返回模块 key 数组)
function scanDeps(modPath, source) {
  source = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const deps = [];
  // 匹配跨行 import 的所有形式
  const re = /^\s*import\s+(?:[\s\S]+?\s+from\s+)?['"]([^'"]+)['"]\s*;?\s*$/gm;
  let m;
  while ((m = re.exec(source)) !== null) {
    deps.push(resolveModuleKey(modPath, m[1]));
  }
  return deps;
}

// 拓扑排序: 依赖在前,被依赖者在后
function topoSort(modules) {
  // modules: { path => { deps: [paths] } }
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(p) {
    if (visited.has(p)) return;
    if (visiting.has(p)) {
      console.warn(`[build] circular dependency detected, breaking at: ${p}`);
      return;
    }
    visiting.add(p);
    const info = modules[p];
    if (info) {
      for (const d of info.deps) {
        if (modules[d]) visit(d);
      }
    }
    visiting.delete(p);
    visited.add(p);
    sorted.push(p);
  }

  for (const p of Object.keys(modules)) visit(p);
  return sorted;
}

function build() {
  console.log('Building Star Drifter (IIFE module bundler)...');

  // 1. 读取所有声明的模块
  const modules = {};
  for (const modPath of moduleOrder) {
    const fullPath = path.join(ROOT, modPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: ${modPath} not found, skipping`);
      continue;
    }
    const code = fs.readFileSync(fullPath, 'utf-8');
    modules[modPath] = { code, deps: scanDeps(modPath, code) };
  }

  // 2. 拓扑排序,确保依赖先注册
  const sortedOrder = topoSort(modules);
  console.log('Resolved load order:');
  sortedOrder.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

  // 3. 转换并拼接
  let bundledJS = '';
  for (const modPath of sortedOrder) {
    bundledJS += transformModule(modPath, modules[modPath].code) + '\n\n';
  }

  // 4. 内联文本资源(避免 file:// 协议 fetch 限制)
  const txtDir = path.join(ASSETS_SRC, 'txt');
  const inlinedTxt = {};
  if (fs.existsSync(txtDir)) {
    for (const f of fs.readdirSync(txtDir)) {
      if (f.endsWith('.txt')) {
        inlinedTxt[`assets/txt/${f}`] = fs.readFileSync(path.join(txtDir, f), 'utf-8');
      }
    }
  }
  const inlinedTxtJSON = JSON.stringify(inlinedTxt);
  console.log(`Inlined ${Object.keys(inlinedTxt).length} txt asset(s)`);

  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>银河友人 - Star Drifter</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
canvas { display: block; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); image-rendering: auto; }
#loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #aad; font-family: monospace; font-size: 18px; }
</style>
</head>
<body>
<div id="loading">Loading...</div>
<canvas id="gameCanvas"></canvas>
<script>
'use strict';
(function(){
  const __modules = {};
  function __require(p) {
    if (!(p in __modules)) {
      throw new Error('[build] module not found: ' + p);
    }
    return __modules[p];
  }

  // 内联文本资源,绕过 file:// fetch 限制
  window.__inlinedTxt = ${inlinedTxtJSON};

${bundledJS}
})();
</script>
</body>
</html>`;

  const outPath = path.join(DIST, 'game.html');
  fs.writeFileSync(outPath, html, 'utf-8');

  console.log('Copying assets...');
  copyDir(ASSETS_SRC, ASSETS_DIST);

  const sizeKB = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
  console.log(`Built: ${outPath} (${sizeKB} KB)`);
  console.log(`Assets copied to: ${ASSETS_DIST}`);
  console.log('Done!');
}

build();
