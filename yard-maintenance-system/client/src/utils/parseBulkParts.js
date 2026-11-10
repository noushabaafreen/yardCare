function parseCsvRow(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function splitRow(line) {
  if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim());
  if (line.includes("|")) return line.split("|").map((cell) => cell.trim());
  if (line.includes(",")) return parseCsvRow(line);
  return line.trim().split(/\s{2,}/).map((cell) => cell.trim());
}

function getHeaderIndexes(cells) {
  const normalize = (value) => value.toLowerCase().replace(/[^a-z]/g, "");
  const headers = cells.map(normalize);
  const materialCode = headers.findIndex((value) =>
    /^(materialcode|partnumber|partno|itemcode|itemnumber|itemno)$/.test(value)
  );
  const partName = headers.findIndex((value) =>
    /^(partname|description|materialdescription|itemname)$/.test(value)
  );
  const quantity = headers.findIndex((value) =>
    /^(quantity|qty|orderedquantity|quantityordered|orderedqty|qtyordered)$/.test(value)
  );

  return materialCode >= 0 && partName >= 0 && quantity >= 0
    ? { materialCode, partName, quantity }
    : null;
}

export default function parseBulkParts(text) {
  const rows = String(text || "")
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, cells: splitRow(line) }))
    .filter(({ cells }) => cells.some(Boolean));

  if (!rows.length) return { parts: [], invalidLines: [] };

  const headerIndexes = getHeaderIndexes(rows[0].cells);
  const dataRows = headerIndexes ? rows.slice(1) : rows;
  const indexes = headerIndexes || {
    materialCode: 0,
    partName: -2,
    quantity: -1
  };
  const parts = [];
  const invalidLines = [];

  for (const row of dataRows) {
    const { cells, line } = row;
    const codeIndex = indexes.materialCode;
    const nameIndex = indexes.partName < 0
      ? cells.length + indexes.partName
      : indexes.partName;
    const quantityIndex = indexes.quantity < 0
      ? cells.length + indexes.quantity
      : indexes.quantity;
    const materialCode = cells[codeIndex] || "";
    const partName = headerIndexes
      ? cells[nameIndex] || ""
      : cells.slice(1, -1).join(" ").trim();
    const quantityText = cells[quantityIndex] || "";
    const quantityOrdered = Number(quantityText);

    if (
      !materialCode ||
      !partName ||
      !quantityText ||
      !Number.isFinite(quantityOrdered) ||
      quantityOrdered < 0
    ) {
      invalidLines.push(line);
      continue;
    }

    parts.push({
      materialCode,
      partName,
      shortText: "",
      quantityRequested: 0,
      quantityOrdered
    });
  }

  return { parts, invalidLines };
}
