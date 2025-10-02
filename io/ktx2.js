const KTX2_IDENTIFIER = new Uint8Array([0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A]);

export function encodeRGBAtoKTX2({ width, height, data, srgb = true }) {
  const pixelData = data instanceof Uint8Array ? data : new Uint8Array(data.buffer ? data.buffer : data);
  const dfd = createDFD(srgb);
  const headerSize = 68;
  const levelIndexSize = 24;
  const dfdOffset = headerSize;
  const levelIndexOffset = dfdOffset + dfd.byteLength;
  const levelDataOffset = levelIndexOffset + levelIndexSize;
  const totalSize = levelDataOffset + pixelData.byteLength;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  for (let i = 0; i < KTX2_IDENTIFIER.length; i++) {
    view.setUint8(offset++, KTX2_IDENTIFIER[i]);
  }

  view.setUint32(offset, srgb ? 0x0000002B : 0x00000025, true); offset += 4; // vkFormat
  view.setUint32(offset, 1, true); offset += 4; // typeSize
  view.setUint32(offset, width, true); offset += 4;
  view.setUint32(offset, height, true); offset += 4;
  view.setUint32(offset, 0, true); offset += 4; // pixelDepth
  view.setUint32(offset, 0, true); offset += 4; // layerCount
  view.setUint32(offset, 1, true); offset += 4; // faceCount
  view.setUint32(offset, 1, true); offset += 4; // levelCount
  view.setUint32(offset, 0, true); offset += 4; // supercompressionScheme
  view.setUint32(offset, dfdOffset, true); offset += 4; // dfd offset
  view.setUint32(offset, dfd.byteLength, true); offset += 4; // dfd length
  view.setUint32(offset, levelIndexOffset, true); offset += 4; // kvd offset (no kv data)
  view.setUint32(offset, 0, true); offset += 4; // kvd length
  view.setBigUint64(offset, BigInt(0), true); offset += 8; // sgd offset
  view.setBigUint64(offset, BigInt(0), true); offset += 8; // sgd length

  new Uint8Array(buffer, dfdOffset, dfd.byteLength).set(new Uint8Array(dfd));

  const levelIndexView = new DataView(buffer, levelIndexOffset, levelIndexSize);
  levelIndexView.setBigUint64(0, BigInt(levelDataOffset), true);
  levelIndexView.setBigUint64(8, BigInt(pixelData.byteLength), true);
  levelIndexView.setBigUint64(16, BigInt(pixelData.byteLength), true);

  new Uint8Array(buffer, levelDataOffset, pixelData.byteLength).set(pixelData);

  return buffer;
}

function createDFD(srgb) {
  const dfd = new ArrayBuffer(48);
  const view = new DataView(dfd);
  const colorModel = 0; // KHR_DF_MODEL_RGBSDA
  const transfer = srgb ? 2 : 1; // KHR_DF_TRANSFER_SRGB or LINEAR
  const flags = 0;
  const texelBlockDimension0 = 0;
  const texelBlockDimension1 = 0;
  const texelBlockDimension2 = 0;
  const texelBlockDimension3 = 0;
  const bytesPlane0 = 4;

  view.setUint32(0, 48, true); // total size
  view.setUint32(4, 0, true); // vendorId + descriptorType
  view.setUint32(8, 0x02000000, true); // version + descriptorBlockSize
  view.setUint32(12, colorModel, true);
  view.setUint32(16, (transfer << 8) | flags, true);
  view.setUint32(20, (texelBlockDimension3 << 24) | (texelBlockDimension2 << 16) | (texelBlockDimension1 << 8) | texelBlockDimension0, true);
  view.setUint32(24, bytesPlane0, true);

  // channel 0 (R)
  view.setUint32(28, 0x00000000, true);
  // channel 1 (G)
  view.setUint32(32, 0x00010001, true);
  // channel 2 (B)
  view.setUint32(36, 0x00020002, true);
  view.setUint32(40, 0x00030003, true);
  view.setUint32(44, 0, true);

  return dfd;
}
