import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { MARChart } from '../../types';

export const generateMarChartDocx = async (chart: MARChart) => {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: `MAR Chart: ${chart.animal_name}`, heading: 'Heading1' }),
          new Paragraph({ text: `Medication: ${chart.medication}` }),
          new Paragraph({ text: `Dosage: ${chart.dosage}` }),
          new Paragraph({ text: `Frequency: ${chart.frequency}` }),
          new Paragraph({ text: `Instructions: ${chart.instructions}` }),
          new Paragraph({ text: ' ' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Date')] }),
                  new TableCell({ children: [new Paragraph('Time')] }),
                  new TableCell({ children: [new Paragraph('Initials')] }),
                  new TableCell({ children: [new Paragraph('Notes')] }),
                ],
              }),
              ...Array.from({ length: 7 }).map(() => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(' ')] }),
                  new TableCell({ children: [new Paragraph(' ')] }),
                  new TableCell({ children: [new Paragraph(' ')] }),
                  new TableCell({ children: [new Paragraph(' ')] }),
                ],
              })),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `MAR_Chart_${chart.animal_name}_${chart.medication}.docx`);
};
