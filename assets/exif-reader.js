(function () {
  const TAGS = {
    0x010f: "make",
    0x0110: "model",
    0x829a: "exposureTime",
    0x829d: "fNumber",
    0x8827: "iso",
    0x8769: "exifOffset",
    0x9003: "dateTimeOriginal",
    0x920a: "focalLength",
    0xa434: "lensModel"
  };

  const TYPE_SIZES = {
    1: 1,
    2: 1,
    3: 2,
    4: 4,
    5: 8,
    7: 1,
    9: 4,
    10: 8
  };

  function readAscii(view, start, count) {
    let text = "";
    for (let i = 0; i < count; i += 1) {
      const code = view.getUint8(start + i);
      if (code === 0) break;
      text += String.fromCharCode(code);
    }
    return text.trim();
  }

  function readRational(view, offset, littleEndian, signed) {
    const numerator = signed ? view.getInt32(offset, littleEndian) : view.getUint32(offset, littleEndian);
    const denominator = signed ? view.getInt32(offset + 4, littleEndian) : view.getUint32(offset + 4, littleEndian);
    if (!denominator) return null;
    return numerator / denominator;
  }

  function readValue(view, tiffStart, valueOffset, type, count, littleEndian) {
    const size = (TYPE_SIZES[type] || 0) * count;
    const dataOffset = size <= 4 ? valueOffset : tiffStart + view.getUint32(valueOffset, littleEndian);

    if (type === 2) return readAscii(view, dataOffset, count);
    if (type === 3) return view.getUint16(dataOffset, littleEndian);
    if (type === 4) return view.getUint32(dataOffset, littleEndian);
    if (type === 5) return readRational(view, dataOffset, littleEndian, false);
    if (type === 9) return view.getInt32(dataOffset, littleEndian);
    if (type === 10) return readRational(view, dataOffset, littleEndian, true);
    return null;
  }

  function readIfd(view, tiffStart, ifdOffset, littleEndian, output) {
    const start = tiffStart + ifdOffset;
    const entries = view.getUint16(start, littleEndian);

    for (let i = 0; i < entries; i += 1) {
      const entry = start + 2 + i * 12;
      const tag = view.getUint16(entry, littleEndian);
      const type = view.getUint16(entry + 2, littleEndian);
      const count = view.getUint32(entry + 4, littleEndian);
      const key = TAGS[tag];

      if (!key) continue;
      output[key] = readValue(view, tiffStart, entry + 8, type, count, littleEndian);
    }
  }

  function parseExif(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    if (view.getUint16(0) !== 0xffd8) return {};

    let offset = 2;
    while (offset < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      const segmentLength = view.getUint16(offset + 2);

      if (marker === 0xe1 && readAscii(view, offset + 4, 6) === "Exif") {
        const tiffStart = offset + 10;
        const byteOrder = view.getUint16(tiffStart);
        const littleEndian = byteOrder === 0x4949;
        const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
        const data = {};

        readIfd(view, tiffStart, firstIfdOffset, littleEndian, data);
        if (data.exifOffset) {
          readIfd(view, tiffStart, data.exifOffset, littleEndian, data);
          delete data.exifOffset;
        }
        return data;
      }

      offset += 2 + segmentLength;
    }

    return {};
  }

  function formatExposure(value) {
    if (!value) return "";
    if (value < 1) return `1/${Math.round(1 / value)}s`;
    return `${Number(value.toFixed(1))}s`;
  }

  function formatExif(data) {
    return {
      camera: [data.make, data.model].filter(Boolean).join(" "),
      lens: data.lensModel || "",
      aperture: data.fNumber ? `f/${Number(data.fNumber.toFixed(1))}` : "",
      shutter: formatExposure(data.exposureTime),
      iso: data.iso ? `ISO ${data.iso}` : "",
      focalLength: data.focalLength ? `${Number(data.focalLength.toFixed(1))}mm` : "",
      takenAt: data.dateTimeOriginal || ""
    };
  }

  window.readPhotoExif = async function readPhotoExif(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) return {};
      const buffer = await response.arrayBuffer();
      return formatExif(parseExif(buffer));
    } catch (error) {
      return {};
    }
  };
})();
