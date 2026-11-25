import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/env";
import { DomainError } from "./errors";

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_TEMPLATE_BYTES = 5 * 1024 * 1024;

// Real type check via magic bytes (never trust the declared MIME type).
export function sniffImage(buffer: Buffer): "png" | "jpeg" | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }
  return null;
}

// xlsx = ZIP container; refuse .xlsm/macros, zip bombs, external links and OLE.
const MAX_ZIP_ENTRIES = 200;
const MAX_ZIP_UNCOMPRESSED = 50 * 1024 * 1024;

function zipEntries(buffer: Buffer): Array<{ name: string; size: number }> | null {
  let eocd = -1;
  const min = Math.max(0, buffer.length - 22 - 65536);
  for (let i = buffer.length - 22; i >= min; i -= 1) {
    if (
      buffer[i] === 0x50 &&
      buffer[i + 1] === 0x4b &&
      buffer[i + 2] === 0x05 &&
      buffer[i + 3] === 0x06
    ) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    return null;
  }
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries: Array<{ name: string; size: number }> = [];
  for (let n = 0; n < count; n += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      return null;
    }
    const size = buffer.readUInt32LE(offset + 24);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLen);
    entries.push({ name, size });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export function isXlsx(buffer: Buffer, filename: string): boolean {
  if (!filename.toLowerCase().endsWith(".xlsx")) {
    return false;
  }
  if (
    buffer.length < 4 ||
    buffer[0] !== 0x50 ||
    buffer[1] !== 0x4b ||
    buffer[2] !== 0x03 ||
    buffer[3] !== 0x04
  ) {
    return false;
  }
  if (buffer.includes(Buffer.from("vbaProject.bin"))) {
    return false;
  }
  const entries = zipEntries(buffer);
  if (!entries || entries.length === 0 || entries.length > MAX_ZIP_ENTRIES) {
    return false;
  }
  let total = 0;
  let hasContentTypes = false;
  let hasWorkbook = false;
  for (const entry of entries) {
    total += entry.size;
    if (total > MAX_ZIP_UNCOMPRESSED) {
      return false;
    }
    if (entry.name.startsWith("xl/externalLinks/") || entry.name.startsWith("xl/embeddings/")) {
      return false;
    }
    if (entry.name === "[Content_Types].xml") {
      hasContentTypes = true;
    }
    if (entry.name === "xl/workbook.xml") {
      hasWorkbook = true;
    }
  }
  return hasContentTypes && hasWorkbook;
}

// Bound image dimensions (defense against decompression bombs / huge payloads).
export function imageWithinLimits(buffer: Buffer): boolean {
  const kind = sniffImage(buffer);
  if (kind === "png") {
    if (buffer.length < 24) {
      return false;
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return width > 0 && height > 0 && width <= 2000 && height <= 2000;
  }
  if (kind === "jpeg") {
    let i = 2;
    while (i + 9 < buffer.length) {
      if (buffer[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buffer[i + 1];
      if (marker !== undefined && marker >= 0xc0 && marker <= 0xc3) {
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        return width > 0 && height > 0 && width <= 2000 && height <= 2000;
      }
      const length = buffer.readUInt16BE(i + 2);
      i += 2 + length;
    }
    return false;
  }
  return false;
}

export async function storeUpload(
  subdir: "logos" | "templates",
  buffer: Buffer,
  ext: string,
): Promise<string> {
  const dir = path.join(env.UPLOAD_DIR, subdir);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), buffer);
  return path.join(subdir, name);
}

export async function readUpload(relativePath: string): Promise<Buffer> {
  const base = path.resolve(env.UPLOAD_DIR);
  const full = path.resolve(base, relativePath);
  if (!full.startsWith(base + path.sep)) {
    throw new DomainError("FORBIDDEN", "Invalid upload path");
  }
  return readFile(full);
}

export async function deleteUpload(relativePath: string): Promise<void> {
  const base = path.resolve(env.UPLOAD_DIR);
  const full = path.resolve(base, relativePath);
  if (!full.startsWith(base + path.sep)) {
    return;
  }
  await unlink(full).catch(() => undefined);
}
