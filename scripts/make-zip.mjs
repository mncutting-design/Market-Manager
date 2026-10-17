import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// CRC32 calculation
const makeCrcTable = () => {
  let c;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
};

const crcTable = makeCrcTable();
function calcCrc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipBuffer(files) {
  const parts = [];
  const centralDirParts = [];
  let offset = 0;

  for (const file of files) {
    const rawData = file.data;
    const compressedData = zlib.deflateRawSync(rawData, { level: 6 });
    const crc = calcCrc32(rawData);
    const nameBytes = Buffer.from(file.name.replace(/\\/g, "/"), "utf-8");

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4);         // version needed to extract (2.0)
    localHeader.writeUInt16LE(0, 6);          // general purpose bit flag
    localHeader.writeUInt16LE(8, 8);          // compression method (8 = deflate)
    localHeader.writeUInt16LE(0, 10);         // file last mod time
    localHeader.writeUInt16LE(0, 12);         // file last mod date
    localHeader.writeUInt32LE(crc, 14);       // crc-32
    localHeader.writeUInt32LE(compressedData.length, 18); // compressed size
    localHeader.writeUInt32LE(rawData.length, 22);        // uncompressed size
    localHeader.writeUInt16LE(nameBytes.length, 26);      // file name length
    localHeader.writeUInt16LE(0, 28);                     // extra field length
    nameBytes.copy(localHeader, 30);

    parts.push(localHeader, compressedData);

    // Central directory file header
    const cdHeader = Buffer.alloc(46 + nameBytes.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // central file header signature
    cdHeader.writeUInt16LE(20, 4);         // version made by
    cdHeader.writeUInt16LE(20, 6);         // version needed to extract
    cdHeader.writeUInt16LE(0, 8);          // general purpose bit flag
    cdHeader.writeUInt16LE(8, 10);         // compression method
    cdHeader.writeUInt16LE(0, 12);         // file last mod time
    cdHeader.writeUInt16LE(0, 14);         // file last mod date
    cdHeader.writeUInt32LE(crc, 16);       // crc-32
    cdHeader.writeUInt32LE(compressedData.length, 20); // compressed size
    cdHeader.writeUInt32LE(rawData.length, 24);        // uncompressed size
    cdHeader.writeUInt16LE(nameBytes.length, 28);      // file name length
    cdHeader.writeUInt16LE(0, 30);                     // extra field length
    cdHeader.writeUInt16LE(0, 32);                     // file comment length
    cdHeader.writeUInt16LE(0, 34);                     // disk number start
    cdHeader.writeUInt16LE(0, 36);                     // internal file attributes
    cdHeader.writeUInt32LE(0, 38);                     // external file attributes
    cdHeader.writeUInt32LE(offset, 42);                // relative offset of local header
    nameBytes.copy(cdHeader, 46);

    centralDirParts.push(cdHeader);
    offset += localHeader.length + compressedData.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const part of centralDirParts) {
    centralDirSize += part.length;
  }

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);                 // end of central dir signature
  eocd.writeUInt16LE(0, 4);                          // number of this disk
  eocd.writeUInt16LE(0, 6);                          // number of disk with start of central dir
  eocd.writeUInt16LE(files.length, 8);               // total entries in central dir on this disk
  eocd.writeUInt16LE(files.length, 10);              // total entries in central dir
  eocd.writeUInt32LE(centralDirSize, 12);            // size of central directory
  eocd.writeUInt32LE(centralDirOffset, 16);          // offset of start of central dir
  eocd.writeUInt16LE(0, 20);                         // .ZIP file comment length

  return Buffer.concat([...parts, ...centralDirParts, eocd]);
}

const ignoredDirs = new Set(["node_modules", ".next", ".git", "scratch", ".system_generated"]);
const ignoredFiles = new Set(["dev.db", "dev.db-journal", "market-manager.zip"]);

function collectFiles(dir, baseDir = "") {
  const result = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (ignoredDirs.has(entry.name) || ignoredFiles.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      const relPath = baseDir ? `${baseDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        result.push(...collectFiles(fullPath, relPath));
      } else if (entry.isFile()) {
        result.push({
          name: relPath,
          data: fs.readFileSync(fullPath),
        });
      }
    }
  } catch (err) {
    console.error("Error reading directory:", dir, err);
  }

  return result;
}

export function generateProjectZip(targetDir) {
  const root = targetDir || process.cwd();
  const files = collectFiles(root);
  return createZipBuffer(files);
}
