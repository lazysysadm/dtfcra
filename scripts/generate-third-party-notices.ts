// Generates THIRD-PARTY-NOTICES from the production dependency licenses.
// Usage: node --import tsx scripts/generate-third-party-notices.ts
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface Pkg {
  name: string;
  versions: string[];
  paths: string[];
  license: string;
  author?: string;
}

const LICENSE_FILES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENCE",
  "LICENCE.md",
  "LICENCE.txt",
  "license",
  "license.md",
];

function copyrightOf(pkg: Pkg): string {
  const dir = pkg.paths[0];
  if (dir) {
    for (const file of LICENSE_FILES) {
      const full = path.join(dir, file);
      if (existsSync(full)) {
        const text = readFileSync(full, "utf8");
        const lines = [
          ...new Set(
            text
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => /^(copyright\b(?! notice)|\(c\)|©)/i.test(line))
              .map((line) =>
                line
                  .replace(/<[^>]*>|&lt;.*?&gt;|\([^)]*@[^)]*\)/g, "") // drop author emails
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 120),
              )
              .filter((line) => line.length > 0),
          ),
        ].slice(0, 2);
        if (lines.length > 0) {
          return lines.join("; ");
        }
      }
    }
  }
  return pkg.author ? `Copyright ${pkg.author}` : "Copyright the respective authors";
}

const MIT_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const ISC_TEXT = `Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.`;

function main() {
  const raw = execSync("pnpm licenses list --prod --json", {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const groups = JSON.parse(raw) as Record<string, Pkg[]>;

  const out: string[] = [];
  out.push("# THIRD-PARTY NOTICES");
  out.push("");
  out.push("dtfcra is licensed under the MIT License (see LICENSE).");
  out.push("This file aggregates the licenses of the production dependencies.");
  out.push(
    `Generated: ${new Date().toISOString().slice(0, 10)} via \`scripts/generate-third-party-notices.ts\`.`,
  );
  out.push("");
  out.push("This is provided for attribution/compliance convenience and is not legal advice.");
  out.push("");

  const sorted = Object.keys(groups).sort(
    (a, b) => (groups[b]?.length ?? 0) - (groups[a]?.length ?? 0),
  );
  let total = 0;
  for (const license of sorted) {
    const packages = groups[license] ?? [];
    total += packages.length;
    out.push(`## ${license} (${packages.length} package(s))`);
    out.push("");
    if (license === "MIT" || license === "MIT/X11") {
      out.push("```");
      out.push(MIT_TEXT);
      out.push("```");
      out.push("");
    } else if (license === "ISC") {
      out.push("```");
      out.push(ISC_TEXT);
      out.push("```");
      out.push("");
    } else if (license === "Apache-2.0") {
      out.push("Licensed under the Apache License, Version 2.0. You may obtain a copy at");
      out.push("http://www.apache.org/licenses/LICENSE-2.0. Required notices are retained in");
      out.push("each package's LICENSE/NOTICE file in node_modules.");
      out.push("");
    } else if (license === "LGPL-3.0-or-later") {
      out.push("GNU Lesser General Public License v3.0 or later. This applies to the native");
      out.push("libvips binary bundled by sharp (optional Next.js image optimization). It is");
      out.push("dynamically linked; the LGPL library remains replaceable. License text:");
      out.push(
        "https://www.gnu.org/licenses/lgpl-3.0.html. Source: https://github.com/libvips/libvips.",
      );
      out.push("");
    } else if (license === "CC-BY-4.0") {
      out.push("Creative Commons Attribution 4.0 International (data only, build-time).");
      out.push(
        "Attribution: caniuse-lite data © Alexis Deveria & contributors (https://caniuse.com).",
      );
      out.push("License: https://creativecommons.org/licenses/by/4.0/.");
      out.push("");
    } else if (license === "(MIT OR GPL-3.0-or-later)") {
      out.push("Dual-licensed; the MIT option is chosen for this project.");
      out.push("");
    } else if (license === "Unknown") {
      out.push("License not declared in package metadata. Verify upstream before redistribution.");
      out.push("");
    }
    for (const pkg of packages.sort((a, b) => a.name.localeCompare(b.name))) {
      out.push(`- ${pkg.name}@${pkg.versions.join(", ")} — ${copyrightOf(pkg)}`);
    }
    out.push("");
  }

  out.push(`---`);
  out.push(`Total production packages: ${total}.`);
  writeFileSync("THIRD-PARTY-NOTICES.md", out.join("\n"));
  console.log(`THIRD-PARTY-NOTICES.md généré (${total} paquets, ${sorted.length} licences).`);
}

main();
