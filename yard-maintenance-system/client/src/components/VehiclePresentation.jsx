import React, { useMemo, useState } from "react";
import pptxgen from "pptxgenjs";
import { Download, Loader2, Search, Truck } from "lucide-react";

export default function VehiclePresentation({
  equipment = [],
  jobs = [],
  inwardRecords = [],
}) {
  const [query, setQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const filteredVehicles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return equipment;

    return equipment.filter((vehicle) =>
      [
        vehicle.technicalObjectNumber,
        vehicle.vehicleNumber,
        vehicle.equipmentName,
        vehicle.equipmentType,
        vehicle.make,
        vehicle.model,
        vehicle.remarks,
        vehicle.gatepassNumber,
      ].some((value) => String(value || "").toLowerCase().includes(q))
    );
  }, [equipment, query]);

  const getVehicleJobs = (vehicle) => {
    if (!vehicle) return [];
    return jobs.filter((job) => {
      const equipmentId =
        typeof job.equipment === "object" ? job.equipment?._id : job.equipment;

      return (
        String(equipmentId || "") === String(vehicle._id) ||
        (vehicle.technicalObjectNumber &&
          String(job.technicalObjectNumber || "") ===
            String(vehicle.technicalObjectNumber || ""))
      );
    });
  };

  const getVehicleInward = (vehicle) => {
    if (!vehicle || !inwardRecords.length) return null;

    const matched = inwardRecords.filter((record) => {
      const equipmentId =
        typeof record.equipment === "object"
          ? record.equipment?._id
          : record.equipment;

      return (
        String(equipmentId || "") === String(vehicle._id) ||
        (vehicle.technicalObjectNumber &&
          String(record.technicalObjectNumber || "") ===
            String(vehicle.technicalObjectNumber || ""))
      );
    });

    if (!matched.length) return null;

    // Pick the most recent inward record if multiple exist
    return matched.sort(
      (a, b) =>
        new Date(b.createdAt || b.inDate || b.entryDate || 0) -
        new Date(a.createdAt || a.inDate || a.entryDate || 0)
    )[0];
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "—";
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  // Convert the existing free-text partsChanged field into readable rows.
  // Each non-empty line is kept intact so part descriptions are not split accidentally.
  const getPartsUsed = (vehicleJobs) =>
    vehicleJobs.flatMap((job) => {
      const value = String(job.partsChanged || "").trim();
      if (!value) return [];
      return value
        .split(/\r?\n/)
        .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter(Boolean)
        .map((partName) => ({
          jobCardNumber: job.jobCardNumber || "—",
          partName,
        }));
    });

  // Show parts recorded in procurement lots as plain parts details only.
  // PO/PR identifiers and procurement references are intentionally excluded.
  const getPartsDetails = (vehicleJobs) =>
    vehicleJobs.flatMap((job) =>
      (Array.isArray(job.partsLots) ? job.partsLots : []).flatMap((lot) =>
        (Array.isArray(lot.parts) ? lot.parts : [])
          .filter((part) => !part.deletionIndicator)
          .map((part) => ({
            jobCardNumber: job.jobCardNumber || "—",
            materialCode: part.materialCode || "—",
            partName: part.partName || part.shortText || "Unnamed part",
            quantity: Number(part.quantityOrdered || part.quantityRequested || 0),
          }))
      )
    );

  async function downloadPresentation() {
    if (!filteredVehicles.length || isExporting) return;

    try {
      setIsExporting(true);

      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 inches
      pptx.author = "JMD YardCare";
      pptx.subject = "Vehicle Fleet Overview";
      pptx.title = "YardCare Vehicle Fleet";
      pptx.company = "JMD YardCare";
      pptx.theme = {
        headFontFace: "Aptos Display",
        bodyFontFace: "Aptos",
        lang: "en-IN",
      };

      const navy = "062B5B";
      const blue = "2563EB";
      const grey = "64748B";
      const borderSlate = "CBD5E1";
      const cardBg = "F8FAFC";
      const textDark = "1E293B";

      // -----------------------------------------------------------------------
      // 1. Cover Slide
      // -----------------------------------------------------------------------
      {
        const slide = pptx.addSlide();
        slide.background = { color: "F8FAFC" };

        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: 13.333,
          h: 0.28,
          line: { color: navy },
          fill: { color: navy },
        });

        slide.addText("JMD-YARDCARE", {
          x: 0.8,
          y: 1.8,
          w: 11.7,
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: blue,
          charSpacing: 3,
        });

        slide.addText("Vehicle Fleet Presentation", {
          x: 0.8,
          y: 2.5,
          w: 11.7,
          h: 1.0,
          fontSize: 34,
          bold: true,
          color: navy,
        });

        slide.addText(
          ` Overall-Fleet overview · ${filteredVehicles.length} vehicle(s) · ${new Date().toLocaleDateString()}`,
          {
            x: 0.8,
            y: 3.65,
            w: 11.7,
            h: 0.45,
            fontSize: 17,
            color: grey,
          }
        );
      }

      // -----------------------------------------------------------------------
      // 2. Summary Slide
      // -----------------------------------------------------------------------
      {
        const slide = pptx.addSlide();
        slide.background = { color: "FFFFFF" };

        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: 13.333,
          h: 0.22,
          line: { color: navy },
          fill: { color: navy },
        });

        slide.addText("Fleet Summary", {
          x: 0.8,
          y: 0.6,
          w: 11.7,
          h: 0.6,
          fontSize: 28,
          bold: true,
          color: navy,
        });

        const typeCounts = {};
        filteredVehicles.forEach((vehicle) => {
          const type = vehicle.equipmentType || "Unspecified";
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        slide.addText(`Total vehicles: ${filteredVehicles.length}`, {
          x: 0.8,
          y: 1.45,
          w: 5.5,
          h: 0.55,
          fontSize: 22,
          bold: true,
          color: blue,
        });

        const summaryRows = [
          [
            { text: "Equipment Type", options: { bold: true, fill: "F1F5F9" } },
            { text: "Count", options: { bold: true, fill: "F1F5F9", align: "right" } },
          ],
          ...Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => [
              { text: type },
              { text: String(count), options: { align: "right" } },
            ]),
        ];

        slide.addTable(summaryRows, {
          x: 0.8,
          y: 2.2,
          w: 7.5,
          rowH: 0.38,
          border: { type: "solid", color: borderSlate, pt: 1 },
          fill: "FFFFFF",
          color: textDark,
          fontSize: 14,
          margin: 0.08,
          colW: [5.5, 2.0],
        });
      }

      // -----------------------------------------------------------------------
      // 3. Vehicle Slides (Two-column layout: Specs Left, Remarks Card Right)
      // -----------------------------------------------------------------------
      filteredVehicles.forEach((vehicle, index) => {
        const slide = pptx.addSlide();
        const inward = getVehicleInward(vehicle);
        const vehicleJobs = getVehicleJobs(vehicle);
        const activeJobs = vehicleJobs.filter((job) => job.status !== "Exited");

        // Resolve gatepass & in-date across vehicle, inward, and job records
        const gatepassNumber =
          vehicle.gatepassNumber ||
          inward?.gatepassNumber ||
          inward?.gatePassNumber ||
          vehicleJobs.find((job) => job.gatepassNumber)?.gatepassNumber ||
          "—";

        const rawInDate =
          vehicle.inDate ||
          inward?.inDate ||
          inward?.entryDate ||
          vehicleJobs.find((job) => job.inDate)?.inDate ||
          "";

        const inDate = formatDate(rawInDate);
        const remarks = String(vehicle.remarks || "").trim();

        slide.background = { color: "FFFFFF" };

        // Top accent line
        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: 13.333,
          h: 0.22,
          line: { color: navy },
          fill: { color: navy },
        });

        // Header: Vehicle Title
        slide.addText(
          vehicle.vehicleNumber || vehicle.equipmentName || `Vehicle ${index + 1}`,
          {
            x: 0.7,
            y: 0.55,
            w: 11.8,
            h: 0.6,
            fontSize: 26,
            bold: true,
            color: navy,
          }
        );

        // Subheader: Technical Object & Equipment Type
        slide.addText(
          `Technical Object: ${vehicle.technicalObjectNumber || "—"}   |   Type: ${
            vehicle.equipmentType || "Unspecified"
          }`,
          {
            x: 0.7,
            y: 1.25,
            w: 11.8,
            h: 0.35,
            fontSize: 15,
            bold: true,
            color: blue,
          }
        );

        // Left Column: Metadata Specs Table
        const details = [
          ["Equipment Type", vehicle.equipmentType],
          ["Make", vehicle.make],
          ["Model", vehicle.model],
          ["Equipment Name", vehicle.equipmentName],
          ["Gatepass Number", gatepassNumber],
          ["In Date", inDate],
          ["Total Job Cards", String(vehicleJobs.length)],
          ["Active Jobs", String(activeJobs.length)],
        ];

        const detailsTableHeight = 4.4; // 8 rows * 0.55

        slide.addTable(
          details.map(([label, value]) => [
            { text: label, options: { bold: true, color: grey } },
            { text: value || "—" },
          ]),
          {
            x: 0.7,
            y: 1.8,
            w: 5.7,
            rowH: 0.55,
            border: { type: "solid", color: borderSlate, pt: 1 },
            fontSize: 13,
            color: textDark,
            margin: 0.1,
            colW: [2.2, 3.5],
          }
        );

        // Right Column: Remarks Card Container
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 6.8,
          y: 1.8,
          w: 5.8,
          h: detailsTableHeight,
          rectRadius: 0.08,
          line: { color: borderSlate },
          fill: { color: cardBg },
        });

        slide.addText("REMARKS & WORK DESCRIPTION", {
          x: 7.05,
          y: 2.0,
          w: 5.3,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: blue,
        });

        slide.addText(remarks || "No remarks or work description recorded for this vehicle.", {
          x: 7.05,
          y: 2.35,
          w: 5.3,
          h: detailsTableHeight - 0.7,
          fontSize: 12,
          color: remarks ? textDark : grey,
          italic: !remarks,
          valign: "top",
          wrap: true,
          fit: "shrink",
        });

        // Slide Counter Footer
        slide.addText(`${index + 1} / ${filteredVehicles.length}`, {
          x: 11.5,
          y: 7.0,
          w: 1.1,
          h: 0.25,
          fontSize: 10,
          color: grey,
          align: "right",
        });

        // Parts are placed on separate, consistently-sized detail slides so
        // the existing vehicle overview slide never becomes cramped or distorted.
        const partsUsed = getPartsUsed(vehicleJobs);
        const partsDetails = getPartsDetails(vehicleJobs);
        const pageSize = 8;
        const partsPageCount = Math.max(
          1,
          Math.ceil(partsUsed.length / pageSize),
          Math.ceil(partsDetails.length / pageSize)
        );

        for (let page = 0; page < partsPageCount; page += 1) {
          const usedRows = partsUsed.slice(page * pageSize, (page + 1) * pageSize);
          const detailRows = partsDetails.slice(page * pageSize, (page + 1) * pageSize);
          if (!partsUsed.length && !partsDetails.length) break;

          const partsSlide = pptx.addSlide();
          partsSlide.background = { color: "FFFFFF" };
          partsSlide.addShape(pptx.ShapeType.rect, {
            x: 0, y: 0, w: 13.333, h: 0.22,
            line: { color: navy }, fill: { color: navy },
          });
          partsSlide.addText(
            `${vehicle.vehicleNumber || vehicle.equipmentName || `Vehicle ${index + 1}`} – Parts Details`,
            {
              x: 0.65, y: 0.48, w: 12.0, h: 0.48,
              fontSize: 23, bold: true, color: navy,
            }
          );
          partsSlide.addText(
            `Technical Object: ${vehicle.technicalObjectNumber || "—"}   |   Job Cards: ${vehicleJobs.length}`,
            {
              x: 0.68, y: 1.02, w: 12.0, h: 0.28,
              fontSize: 11, color: grey,
            }
          );

          // Two balanced columns keep both sections readable without stretching the slide.
          const leftX = 0.65;
          const rightX = 6.85;
          const colW = 5.83;
          const tableY = 1.72;
          const titleOpts = { fontSize: 13, bold: true, color: blue, margin: 0.04 };
          partsSlide.addText("PARTS USED / CHANGED", {
            x: leftX, y: 1.42, w: colW, h: 0.24, ...titleOpts,
          });
          partsSlide.addText("PARTS DETAILS", {
            x: rightX, y: 1.42, w: colW, h: 0.24, ...titleOpts,
          });

          const usedTable = [
            [
              { text: "Part description", options: { bold: true, fill: "EAF1F8" } },
              { text: "Job Card", options: { bold: true, fill: "EAF1F8" } },
            ],
            ...(usedRows.length
              ? usedRows.map((part) => [
                  { text: part.partName },
                  { text: part.jobCardNumber },
                ])
              : [[{ text: "No parts used recorded", options: { color: grey, italic: true }, colSpan: 2 }]]),
          ];
          partsSlide.addTable(usedTable, {
            x: leftX, y: tableY, w: colW,
            colW: [4.0, 1.83], rowH: 0.48,
            border: { type: "solid", color: borderSlate, pt: 0.8 },
            fontSize: 9, color: textDark, margin: 0.06,
            valign: "mid", autoFit: false,
          });

          const detailsTable = [
            [
              { text: "Part name / Material code", options: { bold: true, fill: "EAF1F8" } },
              { text: "Quantity", options: { bold: true, fill: "EAF1F8", align: "center" } },
            ],
            ...(detailRows.length
              ? detailRows.map((part) => [
                  { text: `${part.partName}\n${part.materialCode} · Job Card: ${part.jobCardNumber}` },
                  { text: String(part.quantity || "—"), options: { align: "center" } },
                ])
              : [[{ text: "No additional parts details recorded", options: { color: grey, italic: true }, colSpan: 2 }]]),
          ];
          partsSlide.addTable(detailsTable, {
            x: rightX, y: tableY, w: colW,
            colW: [4.55, 1.28], rowH: 0.48,
            border: { type: "solid", color: borderSlate, pt: 0.8 },
            fontSize: 8, color: textDark, margin: 0.05,
            valign: "mid", autoFit: false,
          });

          partsSlide.addText(
            `Vehicle ${index + 1} of ${filteredVehicles.length}  ·  Parts page ${page + 1} of ${partsPageCount}`,
            {
              x: 8.4, y: 7.0, w: 4.2, h: 0.22,
              fontSize: 9, color: grey, align: "right",
            }
          );
        }
      });

      await pptx.writeFile({
        fileName: `YardCare-Vehicle-Fleet-${new Date().toISOString().slice(0, 10)}.pptx`,
      });
    } catch (err) {
      console.error("Failed to generate PowerPoint:", err);
      alert("An error occurred while generating the presentation. Please check the console for details.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="panel vehicle-presentation">
      <div className="panel-header">
        <div>
          <h2>Vehicle Presentation</h2>
          <p className="muted">
            {filteredVehicles.length} of {equipment.length} vehicles
          </p>
        </div>
        <button
          className="btn primary"
          type="button"
          onClick={downloadPresentation}
          disabled={!filteredVehicles.length || isExporting}
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {isExporting ? "Generating..." : "Download PowerPoint"}
        </button>
      </div>

      <div className="toolbar">
        <div className="searchbox" style={{ flex: 1 }}>
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vehicle, technical object, type, make or model..."
          />
        </div>
      </div>

      <div className="vehicle-presentation-grid">
        {filteredVehicles.map((vehicle) => (
          <article className="vehicle-presentation-card" key={vehicle._id}>
            <div className="vehicle-presentation-icon">
              <Truck size={24} />
            </div>
            <h3>
              {vehicle.vehicleNumber ||
                vehicle.equipmentName ||
                vehicle.equipmentType ||
                "Vehicle"}
            </h3>
            <p className="mono">{vehicle.technicalObjectNumber || "—"}</p>
            <div className="vehicle-presentation-details">
              <span>{vehicle.equipmentType || "Type unspecified"}</span>
              <span>
                {[vehicle.make, vehicle.model].filter(Boolean).join(" · ") ||
                  "Make/model unspecified"}
              </span>
            </div>
          </article>
        ))}
      </div>

      {!filteredVehicles.length && (
        <p className="muted">No vehicles match your search.</p>
      )}
    </section>
  );
}