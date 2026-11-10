export default function parseBulkParts(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let columns;
      if (line.includes("\t")) columns = line.split("\t");
      else if (line.includes("|")) columns = line.split("|");
      else if (line.includes(",")) columns = line.split(",");
      else columns = line.split(/\s{2,}/);

      if (columns.length < 2) {
        const match = line.match(/^(\S+)\s+(.+)$/);
        if (match) columns = [match[1], match[2]];
      }

      const materialCode = String(columns[0] || "").trim();
      const partName = columns.slice(1).join(" ").trim();
      if (!materialCode || !partName) return null;
      if (/^(material\s*code|materialcode)$/i.test(materialCode) &&
        /^(part\s*name|description)$/i.test(partName)) return null;

      return {
        materialCode,
        partName,
        shortText: "",
        quantityRequested: 0,
        quantityOrdered: 0
      };
    })
    .filter(Boolean);
}
