const module = {};
self.require = name => {
  if (name === 'fs') {
    return {
      accessSync: () => true,
      readFileSync() {
        return Buffer.from(self.require.file);
      }
    };
  }
  else if (name === 'jgeoip') {
    return module.exports;
  }
  else {
    throw Error('no module', name);
  }
};

class CUint8Array extends Uint8Array {
  readUInt8(offset) {
    return new DataView(this.buffer, offset, 8).getUint8(0);
  }
  toString(encoding, start, end) {
    const uint8array = new DataView(this.buffer, start, end - start);
    return new TextDecoder(encoding).decode(uint8array);
  }
}
const Buffer = {
  from(a, b) {
    if (b === 'hex') {
      return new CUint8Array(a.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
    }
    return new CUint8Array(a);
  }
};
