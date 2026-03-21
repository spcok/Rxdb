import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType,
  PageOrientation,
  Header,
  ImageRun,
  BorderStyle,
  HeightRule
} from 'docx';
import { Animal, LogEntry, LogType, InternalMovement, ExternalTransfer, Shift, ClinicalNote, MARChart, MaintenanceLog } from '../../../types';

interface ReportConfig {
  logoUrl?: string;
  reportName: string;
  startDate: string;
  endDate: string;
  generatedBy: string;
}

const getLocalLogo = async (): Promise<{ buffer: ArrayBuffer, extension: "jpg" | "png" } | null> => {
  try {
    // Determine your exact filename here (update to .png if necessary)
    const logoPath = '/koa-logo.jpg'; 
    const extension = logoPath.endsWith('.jpg') ? 'jpg' : 'png';

    // Fetch using a relative path from the app's own public folder
    const response = await fetch(logoPath);
    if (!response.ok) throw new Error("Local logo file not found");
    
    const buffer = await response.arrayBuffer();
    return { buffer, extension };
  } catch (e) {
    console.warn("Could not load local logo:", e);
    return null;
  }
};

const createDocumentHeader = async (config?: ReportConfig): Promise<Table> => {
  // Completely ignore any logo URL passed from the database config
  const logoData = await getLocalLogo();

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: logoData ? [
              new Paragraph({
                children: [
                  new ImageRun({
                    data: logoData.buffer,
                    transformation: { width: 200, height: 120 },
                    type: logoData.extension,
                  }),
                ],
              }),
            ] : [],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ text: "" }),
              new Paragraph({ children: [new TextRun({ text: config?.reportName || '', bold: true, size: 38 })], alignment: AlignmentType.RIGHT }),
              new Paragraph({ children: [new TextRun({ text: `Date: ${config?.startDate === config?.endDate ? config.startDate : config?.startDate + ' to ' + config?.endDate}`, size: 26, color: "666666" })], alignment: AlignmentType.RIGHT }),
              new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, size: 26, color: "666666" })], alignment: AlignmentType.RIGHT }),
              new Paragraph({ children: [new TextRun({ text: `Initials: ${config?.generatedBy || ''}`, size: 26, color: "666666" })], alignment: AlignmentType.RIGHT }),
            ],
          }),
        ],
      }),
    ],
  });
};

export const generateSection9Docx = async (
  tableData: string[][],
  config?: ReportConfig,
  orientation: 'portrait' | 'landscape' = 'landscape'
): Promise<Blob> => {
  const headerTable = await createDocumentHeader(config);

  const tableRows = tableData.map(row => {
    return new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: cell, size: 22 })] })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
      })),
    });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "F1F5F9" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "F1F5F9" },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Species", "Start Count", "Births", "Arrivals", "Deaths", "Departures", "End Count"].map(header => 
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true, size: 24, color: "475569" })] })],
            shading: { fill: "F8FAFC" },
            margins: { top: 150, bottom: 150, left: 100, right: 100 },
          })
        ),
      }),
      ...tableRows
    ],
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
          },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        headerTable,
        new Paragraph({ text: "", spacing: { after: 400 } }),
        table
      ],
    }],
  });

  return await Packer.toBlob(doc);
};

export const generateBirthCertificateDocx = async (
  animal: Animal,
  config?: ReportConfig
): Promise<Blob> => {
  const headerTable = await createDocumentHeader(config);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.PORTRAIT,
          },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        headerTable,
        new Paragraph({ text: "", spacing: { after: 800 } }),
        new Paragraph({
          children: [new TextRun({ text: "Birth Certificate", bold: true, size: 48 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Name: `, bold: true, size: 28 }), new TextRun({ text: animal.name || '--', size: 28 })],
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Species: `, bold: true, size: 28 }), new TextRun({ text: animal.species || '--', size: 28 })],
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Date of Birth: `, bold: true, size: 28 }), new TextRun({ text: animal.dob ? new Date(animal.dob).toLocaleDateString() : '--', size: 28 })],
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Sex: `, bold: true, size: 28 }), new TextRun({ text: animal.sex || '--', size: 28 })],
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Sire: `, bold: true, size: 28 }), new TextRun({ text: animal.sire_id || '--', size: 28 })],
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Dam: `, bold: true, size: 28 }), new TextRun({ text: animal.dam_id || '--', size: 28 })],
          spacing: { after: 400 }
        }),
      ],
    }],
  });

  return await Packer.toBlob(doc);
};

export const generateDeathCertificateDocx = async (
  animal: Animal,
  config?: ReportConfig
): Promise<Blob> => {
  const headerTable = await createDocumentHeader(config);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.PORTRAIT,
          },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        headerTable,
        new Paragraph({ text: "", spacing: { after: 800 } }),
        new Paragraph({
          children: [new TextRun({ text: "CERTIFICATE OF DEATH", bold: true, size: 48 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 }
        }),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true })] })] }), new TableCell({ children: [new Paragraph(animal.name)] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Species", bold: true })] })] }), new TableCell({ children: [new Paragraph(animal.species)] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Sex", bold: true })] })] }), new TableCell({ children: [new Paragraph(animal.sex || '--')] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Microchip/Ring Number", bold: true })] })] }), new TableCell({ children: [new Paragraph(animal.microchip_id || animal.ring_number || '--')] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Acquisition Date", bold: true })] })] }), new TableCell({ children: [new Paragraph(animal.acquisition_date ? new Date(animal.acquisition_date).toLocaleDateString() : '--')] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date of Death", bold: true })] })] }), new TableCell({ children: [new Paragraph(animal.archived_at ? new Date(animal.archived_at).toLocaleDateString() : '--')] })] }),
            ]
        })
      ],
    }],
  });

  return await Packer.toBlob(doc);
};
export const generateInternalMovementsDocx = async (
  movements: InternalMovement[],
  animals: Animal[],
  config?: ReportConfig
): Promise<Blob> => {
  const headerTable = await createDocumentHeader(config);

  const tableRows = movements.map(movement => {
    const animal = animals.find(a => a.id === movement.animal_id);
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(movement.log_date)] }),
        new TableCell({ children: [new Paragraph(animal?.name || movement.animal_name || '--')] }),
        new TableCell({ children: [new Paragraph(animal?.species || '--')] }),
        new TableCell({ children: [new Paragraph(movement.source_location || '--')] }),
        new TableCell({ children: [new Paragraph(movement.destination_location || '--')] }),
        new TableCell({ children: [new Paragraph(movement.notes || '--')] }),
        new TableCell({ children: [new Paragraph(movement.created_by || '--')] }),
      ],
    });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1500, 2000, 2000, 2000, 2000, 3000, 1000],
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Date", "Animal", "Species", "From", "To", "Reason/Notes", "Initials"].map(header => 
          new TableCell({
            shading: { fill: "F3F4F6" },
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })], alignment: AlignmentType.CENTER })],
          })
        ),
      }),
      ...tableRows
    ],
  });

  const doc = new Document({ 
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 24,
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
          },
        },
      },
      headers: {
        default: new Header({
          children: [headerTable]
        })
      },
      children: [
        new Paragraph({ text: "", spacing: { after: 400 } }),
        table
      ]
    }]
  });
  return await Packer.toBlob(doc);
};

export const generateExternalTransfersDocx = async (
  transfers: ExternalTransfer[],
  animals: Animal[],
  config?: ReportConfig
): Promise<Blob> => {
  const headerTable = await createDocumentHeader(config);

  const tableRows = transfers.map(transfer => {
    const animal = animals.find(a => a.id === transfer.animal_id);
    const count = animal?.entity_type === 'GROUP' ? (animal?.census_count || 0) : 1;
    const name = animal?.entity_type === 'GROUP' ? `${animal?.name || transfer.animal_name || '--'} (Count: ${count})` : (animal?.name || transfer.animal_name || '--');
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(transfer.date)] }),
        new TableCell({ children: [new Paragraph(name)] }),
        new TableCell({ children: [new Paragraph(animal?.species || '--')] }),
        new TableCell({ children: [new Paragraph(transfer.transfer_type || '--')] }),
        new TableCell({ children: [new Paragraph(transfer.institution || '--')] }),
        new TableCell({ children: [new Paragraph(transfer.notes || '--')] }),
        new TableCell({ children: [new Paragraph('--')] }), // Initials not explicitly in ExternalTransfer, using placeholder
      ],
    });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1500, 2000, 2000, 2000, 3000, 3000, 1000],
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Date", "Animal", "Species", "Transfer Type", "Origin / Destination", "Notes", "Initials"].map(header => 
          new TableCell({
            shading: { fill: "F3F4F6" },
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })], alignment: AlignmentType.CENTER })],
          })
        ),
      }),
      ...tableRows
    ],
  });

  const doc = new Document({ 
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 24,
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
          },
        },
      },
      headers: {
        default: new Header({
          children: [headerTable]
        })
      },
      children: [
        new Paragraph({ text: "", spacing: { after: 400 } }),
        table
      ]
    }]
  });
  return await Packer.toBlob(doc);
};

export const generateSiteMaintenanceDocx = async (
  data: MaintenanceLog[],
  config: ReportConfig,
  orientation: 'portrait' | 'landscape'
): Promise<Blob> => {
  const headerTable = await createDocumentHeader(config);

  const tableRows = data.map(log => {
    const l = log as unknown as Record<string, string>;
    const integrityBadge = log.integrity_seal ? [new TextRun({ text: " ✓", color: "059669", size: 16, bold: true })] : [];
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(new Date(log.date_logged).toLocaleDateString())] }),
        new TableCell({ children: [new Paragraph(log.task_type || '--')] }),
        new TableCell({ children: [new Paragraph(log.description || '--')] }),
        new TableCell({ children: [new Paragraph(l.priority || '--')] }),
        new TableCell({ children: [new Paragraph(log.status || '--')] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun(l.assigned_to || l.user_initials || '--'), ...integrityBadge] })] }),
      ],
    });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1500, 2500, 4000, 1500, 1500, 2000],
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Date", "Task / Title", "Description", "Priority", "Status", "Assigned / Initials"].map(header => 
          new TableCell({
            shading: { fill: "F3F4F6" },
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })], alignment: AlignmentType.CENTER })],
          })
        ),
      }),
      ...tableRows
    ],
  });

  const doc = new Document({ 
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 24,
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: {
            orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
          },
        },
      },
      headers: {
        default: new Header({
          children: [headerTable]
        })
      },
      children: [
        new Paragraph({ text: "", spacing: { after: 400 } }),
        table
      ]
    }]
  });
  return await Packer.toBlob(doc);
};

export const generateAnimalCensusDocx = async (
  data: string[][],
  config: ReportConfig,
  orientation: 'portrait' | 'landscape'
): Promise<Blob> => {
  const headerTable = await createDocumentHeader(config);

  const tableRows = data.map(row => {
    return new TableRow({
      children: row.map(cell => new TableCell({ children: [new Paragraph(cell)] })),
    });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2000, 2000, 2500, 1000, 2000, 2000, 1500],
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Name", "Species", "Latin Name", "Sex", "Ring / ID #", "Enclosure", "Status"].map(header => 
          new TableCell({
            shading: { fill: "F3F4F6" },
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })], alignment: AlignmentType.CENTER })],
          })
        ),
      }),
      ...tableRows
    ],
  });

  const doc = new Document({ 
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 24,
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: {
            orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
          },
        },
      },
      headers: {
        default: new Header({
          children: [headerTable]
        })
      },
      children: [
        new Paragraph({ text: "", spacing: { after: 400 } }),
        table
      ]
    }]
  });
  return await Packer.toBlob(doc);
};

export const generateDailyLogDocx = async (
  animals: Animal[],
  logs: LogEntry[],
  startDate: string,
  endDate: string,
  category: string,
  orientation: 'portrait' | 'landscape',
  config?: ReportConfig
): Promise<Blob> => {
  const headerTable = await createDocumentHeader(config);
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  const filteredAnimals = animals.filter(a => category === 'ALL' || a.category.toUpperCase() === category.toUpperCase());

  const sections = dates.map(date => {
    const tableRows = filteredAnimals.map(animal => {
      const weightLog = logs.find(l => l.animal_id === animal.id && l.log_date === date && l.log_type === LogType.WEIGHT);
      const feedLog = logs.find(l => l.animal_id === animal.id && l.log_date === date && l.log_type === LogType.FEED);

      interface NotesData {
        cast?: string;
        feedTime?: string;
      }
      let notesData: NotesData = {};
      if (feedLog?.notes) {
        try {
          notesData = JSON.parse(feedLog.notes) as NotesData;
        } catch {
          notesData = {};
        }
      }

      const integrityBadge = (weightLog?.integrity_seal || feedLog?.integrity_seal) ? [new TextRun({ text: " ✓", color: "059669", size: 16, bold: true })] : [];

      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(animal.name)] }),
          new TableCell({ children: [new Paragraph(animal.species)] }),
          new TableCell({ children: [new Paragraph(animal.latin_name || 'N/A')] }),
          new TableCell({ children: [new Paragraph(weightLog?.value || '--')] }),
          new TableCell({ children: [new Paragraph(notesData.cast || '--')] }),
          new TableCell({ children: [new Paragraph(feedLog?.value || '--')] }),
          new TableCell({ children: [new Paragraph(notesData.feedTime || '--')] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun(feedLog?.user_initials || '--'), ...integrityBadge] })] }),
        ],
      });
    });

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [
        2000, // Name
        2000, // Species
        2000, // Latin Name
        1200, // Weight
        1200, // Cast
        4500, // Food (Massive width)
        1200, // Feed Time
        900,  // Initials (Tiny width)
      ],
      rows: [
        new TableRow({
          tableHeader: true,
          children: ["Name", "Species", "Latin Name", "Weight", "Cast", "Food", "Feed Time", "Initials"].map(header => 
            new TableCell({
              shading: { fill: "F3F4F6" },
              children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })], alignment: AlignmentType.CENTER })],
            })
          ),
        }),
        ...tableRows
      ],
    });

    return {
      properties: {
        page: {
          size: {
            orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
          },
        },
      },
      headers: {
        default: new Header({
          children: [headerTable]
        })
      },
      children: [
        new Paragraph({ text: "", spacing: { after: 400 } }),
        table
      ]
    };
  });

  const doc = new Document({ 
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 24, // 12pt font
          },
        },
      },
    },
    sections 
  });
  return await Packer.toBlob(doc);
};

export const generateStaffRotaDocx = async (
  shifts: Shift[],
  config: ReportConfig,
  orientation: 'portrait' | 'landscape' = 'landscape'
): Promise<Blob> => {
  const headerTable = await createDocumentHeader(config);

  const start = new Date(config.startDate);
  const end = new Date(config.endDate);
  const allDates: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    allDates.push(new Date(d));
  }

  const isMonthly = allDates.length > 7;
  let contentTable: Table;

  if (!isMonthly) {
    // ==========================================
    // WEEKLY LAYOUT: Columns = Days, Cell = List
    // ==========================================
    const headerCells = allDates.map(date => 
      new TableCell({
        shading: { fill: "1E293B" }, // slate-800
        children: [
          new Paragraph({ children: [new TextRun({ text: date.toLocaleDateString('en-GB', { weekday: 'long' }), bold: true, color: "FFFFFF", size: 22 })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }), color: "CBD5E1", size: 18 })], alignment: AlignmentType.CENTER })
        ],
        margins: { top: 150, bottom: 150, left: 100, right: 100 },
      })
    );

    const dataCells = allDates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayShifts = shifts.filter(s => s.date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time));
      
      const cellParagraphs: Paragraph[] = [];
      if (dayShifts.length === 0) {
        cellParagraphs.push(new Paragraph({ children: [new TextRun({ text: "No shifts scheduled", color: "94A3B8", size: 18, italics: true })], alignment: AlignmentType.CENTER }));
      } else {
        dayShifts.forEach(s => {
          const name = s.user_name || 'Unassigned';
          cellParagraphs.push(new Paragraph({ children: [new TextRun({ text: name, bold: true, size: 20, color: "0F172A" })] }));
          cellParagraphs.push(new Paragraph({ children: [new TextRun({ text: `${s.start_time} - ${s.end_time}`, size: 16, color: "475569" })] }));
          cellParagraphs.push(new Paragraph({ children: [new TextRun({ text: s.assigned_area || s.shift_type || 'General', size: 16, color: "059669", bold: true })], spacing: { after: 200 } }));
        });
      }

      return new TableCell({
        children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({text: ""})],
        margins: { top: 150, bottom: 150, left: 100, right: 100 },
      });
    });

    contentTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      },
      rows: [
        new TableRow({ tableHeader: true, children: headerCells }),
        new TableRow({ children: dataCells })
      ]
    });

  } else {
    // ==========================================
    // MONTHLY LAYOUT: Traditional Calendar Grid
    // ==========================================
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const headerCells = dayNames.map(day => 
      new TableCell({
        shading: { fill: "1E293B" },
        children: [new Paragraph({ children: [new TextRun({ text: day, bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
      })
    );

    const rows: TableRow[] = [];
    let currentCells: TableCell[] = [];
    
    // Pad the first week if the month doesn't start on a Monday
    // (JavaScript getDay: Sun=0, Mon=1. We want Mon=0, Sun=6)
    const startWeekday = (start.getDay() + 6) % 7; 
    for (let i = 0; i < startWeekday; i++) {
      currentCells.push(new TableCell({ children: [new Paragraph("")], shading: { fill: "F8FAFC" } }));
    }

    allDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayShifts = shifts.filter(s => s.date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time));
      
      const cellParagraphs: Paragraph[] = [
        new Paragraph({ 
          children: [new TextRun({ text: date.getDate().toString(), bold: true, size: 20, color: "64748B" })], 
          alignment: AlignmentType.RIGHT, 
          spacing: { after: 100 } 
        })
      ];

      dayShifts.forEach(s => {
        const nameParts = (s.user_name || 'Un').split(' ');
        const initials = nameParts.map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const area = s.assigned_area || s.shift_type || 'Gen';
        
        cellParagraphs.push(new Paragraph({ 
          children: [
            new TextRun({ text: `${initials}: `, bold: true, size: 14, color: "0F172A" }),
            new TextRun({ text: area.substring(0, 10), size: 14, color: "059669" })
          ],
          spacing: { after: 40 }
        }));
      });

      currentCells.push(new TableCell({
        children: cellParagraphs,
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
      }));

      // Wrap to next week
      if (currentCells.length === 7) {
        rows.push(new TableRow({ 
          children: currentCells,
          height: { value: 1800, rule: HeightRule.ATLEAST } // Forces the square shape
        }));
        currentCells = [];
      }
    });

    // Pad the last week
    if (currentCells.length > 0) {
      while (currentCells.length < 7) {
        currentCells.push(new TableCell({ children: [new Paragraph("")], shading: { fill: "F8FAFC" } }));
      }
      rows.push(new TableRow({ 
        children: currentCells,
        height: { value: 1800, rule: HeightRule.ATLEAST } // Forces the square shape
      }));
    }

    contentTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      },
      rows: [
        new TableRow({ tableHeader: true, children: headerCells }),
        ...rows
      ]
    });
  }

  const doc = new Document({ 
    styles: {
      default: { document: { run: { font: "Arial", size: 24 } } }
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
        },
      },
      headers: {
        default: new Header({ children: [headerTable] })
      },
      children: [
        new Paragraph({ text: "", spacing: { after: 400 } }),
        contentTable
      ]
    }]
  });
  
  return await Packer.toBlob(doc);
};

export const generateInspectionPackage = async (
  medicalLogs: ClinicalNote[],
  marCharts: MARChart[],
  maintenanceLogs: MaintenanceLog[],
  animals: Animal[],
  config: ReportConfig
): Promise<Blob> => {
  const headerTable = await createDocumentHeader(config);

  const createSectionHeader = (title: string) => new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 32, color: "1E293B" })],
    spacing: { before: 400, after: 200 }
  });

  // 1. Medical Logs Table
  const medicalRows = medicalLogs.map(log => {
    const animal = animals.find(a => a.id === log.animal_id);
    const integrityBadge = log.integrity_seal ? [new TextRun({ text: " ✓ Integrity Verified", color: "059669", size: 16, bold: true })] : [];
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(log.date)] }),
        new TableCell({ children: [new Paragraph(animal?.name || '--')] }),
        new TableCell({ children: [new Paragraph(log.note_type)] }),
        new TableCell({ children: [new Paragraph(log.diagnosis || '--')] }),
        new TableCell({ children: [new Paragraph(log.note_text || '--')] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun(log.staff_initials || '--'), ...integrityBadge] })] }),
      ]
    });
  });

  const medicalTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Date", "Animal", "Type", "Diagnosis", "Notes", "Initials"].map(header => 
          new TableCell({
            shading: { fill: "F3F4F6" },
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })], alignment: AlignmentType.CENTER })],
          })
        ),
      }),
      ...medicalRows
    ],
  });

  // 2. MAR Charts Table
  const marRows = marCharts.map(mar => {
    const animal = animals.find(a => a.id === mar.animal_id);
    const integrityBadge = mar.integrity_seal ? [new TextRun({ text: " ✓ Integrity Verified", color: "059669", size: 16, bold: true })] : [];
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(mar.start_date)] }),
        new TableCell({ children: [new Paragraph(animal?.name || '--')] }),
        new TableCell({ children: [new Paragraph(mar.medication)] }),
        new TableCell({ children: [new Paragraph(mar.dosage)] }),
        new TableCell({ children: [new Paragraph(mar.frequency)] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun(mar.status), ...integrityBadge] })] }),
      ]
    });
  });

  const marTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Start Date", "Animal", "Medication", "Dosage", "Frequency", "Status"].map(header => 
          new TableCell({
            shading: { fill: "F3F4F6" },
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })], alignment: AlignmentType.CENTER })],
          })
        ),
      }),
      ...marRows
    ],
  });

  // 3. Maintenance Logs Table
  const maintenanceRows = maintenanceLogs.map(log => {
    const integrityBadge = log.integrity_seal ? [new TextRun({ text: " ✓ Integrity Verified", color: "059669", size: 16, bold: true })] : [];
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(log.date_logged)] }),
        new TableCell({ children: [new Paragraph(log.enclosure_id || 'General')] }),
        new TableCell({ children: [new Paragraph(log.task_type)] }),
        new TableCell({ children: [new Paragraph(log.description)] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun(log.status), ...integrityBadge] })] }),
      ]
    });
  });

  const maintenanceTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Date", "Enclosure", "Type", "Description", "Status"].map(header => 
          new TableCell({
            shading: { fill: "F3F4F6" },
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })], alignment: AlignmentType.CENTER })],
          })
        ),
      }),
      ...maintenanceRows
    ],
  });

  const doc = new Document({ 
    styles: {
      default: { document: { run: { font: "Arial", size: 24 } } }
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
        },
      },
      headers: {
        default: new Header({ children: [headerTable] })
      },
      children: [
        new Paragraph({ text: "", spacing: { after: 400 } }),
        createSectionHeader("Clinical Notes"),
        medicalTable,
        new Paragraph({ text: "", spacing: { after: 400 } }),
        createSectionHeader("MAR Charts (Medications)"),
        marTable,
        new Paragraph({ text: "", spacing: { after: 400 } }),
        createSectionHeader("Maintenance Logs"),
        maintenanceTable
      ]
    }]
  });
  
  return await Packer.toBlob(doc);
};
