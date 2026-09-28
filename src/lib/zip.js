import zlib from 'node:zlib';

// Minimal streaming ZIP writer. Audio is already compressed, so entries are stored
// as-is (method 0); names are flagged UTF-8.
export function createZipWriter(write) {
  const entries = [];
  let offset = 0;

  const push = async (buf) => {
    await write(buf);
    offset += buf.length;
  };

  return {
    async add(name, data, date = new Date()) {
      const nameBuf = Buffer.from(name, 'utf8');
      const crc = zlib.crc32(data);
      const { time, day } = dosDateTime(date);

      const header = Buffer.alloc(30);
      header.writeUInt32LE(0x04034b50, 0);
      header.writeUInt16LE(20, 4); // version needed
      header.writeUInt16LE(0x0800, 6); // UTF-8 names
      header.writeUInt16LE(0, 8); // stored
      header.writeUInt16LE(time, 10);
      header.writeUInt16LE(day, 12);
      header.writeUInt32LE(crc, 14);
      header.writeUInt32LE(data.length, 18);
      header.writeUInt32LE(data.length, 22);
      header.writeUInt16LE(nameBuf.length, 26);
      header.writeUInt16LE(0, 28);

      entries.push({ nameBuf, crc, size: data.length, offset, time, day });
      await push(header);
      await push(nameBuf);
      await push(data);
    },

    async finish() {
      const start = offset;
      for (const e of entries) {
        const c = Buffer.alloc(46);
        c.writeUInt32LE(0x02014b50, 0);
        c.writeUInt16LE(20, 4); // version made by
        c.writeUInt16LE(20, 6); // version needed
        c.writeUInt16LE(0x0800, 8);
        c.writeUInt16LE(0, 10);
        c.writeUInt16LE(e.time, 12);
        c.writeUInt16LE(e.day, 14);
        c.writeUInt32LE(e.crc, 16);
        c.writeUInt32LE(e.size, 20);
        c.writeUInt32LE(e.size, 24);
        c.writeUInt16LE(e.nameBuf.length, 28);
        c.writeUInt32LE(e.offset, 42); // bytes 30–41 (extra, comment, disk, attrs) stay zero
        await push(c);
        await push(e.nameBuf);
      }
      const end = Buffer.alloc(22);
      end.writeUInt32LE(0x06054b50, 0);
      end.writeUInt16LE(entries.length, 8);
      end.writeUInt16LE(entries.length, 10);
      end.writeUInt32LE(offset - start, 12);
      end.writeUInt32LE(start, 16);
      await push(end);
    },
  };
}

function dosDateTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    day: ((Math.max(d.getFullYear(), 1980) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}
