import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readdirSync, statSync } from "node:fs";

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(mjs|cjs|js)$/.test(name)) out.push(full);
  }
  return out;
}

const targets = [
  ".open-next/server-functions/default/handler.mjs",
  ".open-next/middleware/handler.mjs",
  ...walk(".open-next/server-functions/default/.next/server"),
  ...walk(".open-next/server-functions/default/node_modules/next/dist/compiled"),
  ...walk(".open-next/server-functions/default/node_modules/source-map-js"),
];

let replacements = 0;
for (const target of [...new Set(targets)]) {
  if (!existsSync(target)) continue;
  const before = readFileSync(target, "utf8");
  let after = before;
  for (const needle of ['Function("return this")()', "Function('return this')()", 'Function(`return this`)()']) {
    const count = after.split(needle).length - 1;
    if (count) {
      after = after.replaceAll(needle, "globalThis");
      replacements += count;
    }
  }
  if (after !== before) writeFileSync(target, after);
}
console.log(`Patched OpenNext Cloudflare bundle unsafe global lookup replacements: ${replacements}`);
