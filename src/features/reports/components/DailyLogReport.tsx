import React from 'react';
import { Animal, LogEntry, LogType } from '../../../types';

interface DailyLogReportProps {
  animals: Animal[];
  logs: LogEntry[];
  startDate: string;
  endDate: string;
  selectedCategory: string;
  orientation: 'portrait' | 'landscape';
}

export const DailyLogReport: React.FC<DailyLogReportProps> = ({ animals, logs, startDate, endDate, selectedCategory, orientation }) => {
  const printStyle = `
    @page { size: ${orientation}; margin: 10mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
    }
  `;

  const getDatesInRange = (start: string, end: string) => {
    const dates = [];
    const currentDate = new Date(start);
    const endDateObj = new Date(end);
    while (currentDate <= endDateObj) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const dates = getDatesInRange(startDate, endDate);

  const filteredAnimals = animals.filter(a => selectedCategory === 'ALL' || a.category.toUpperCase() === selectedCategory.toUpperCase());

  const getAnimalData = (animal: Animal, date: string) => {
    const weightLog = logs.find(l => l.animal_id === animal.id && l.log_date === date && l.log_type === LogType.WEIGHT);
    const feedLog = logs.find(l => l.animal_id === animal.id && l.log_date === date && l.log_type === LogType.FEED);

    let cast = 'N/A';
    let feedTime = 'N/A';

    if (feedLog?.notes) {
      try {
        const parsedNotes = JSON.parse(feedLog.notes);
        cast = parsedNotes.cast || 'N/A';
        feedTime = parsedNotes.feedTime || 'N/A';
      } catch {
        // Ignore
      }
    }

    return {
      name: animal.name,
      species: animal.species,
      latinName: animal.latin_name || 'N/A',
      weight: weightLog?.value || 'N/A',
      cast,
      food: feedLog?.value || 'N/A',
      feedTime,
      initials: feedLog?.user_initials || feedLog?.created_by || 'N/A'
    };
  };

  return (
    <div className="p-4">
      <style>{printStyle}</style>
      {dates.map(date => (
        <div key={date} className="mb-8 break-after-page print:break-after-page print:mb-0">
          <h2 className="text-xl font-bold mb-4">Daily log - {date}</h2>
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2">Name</th>
                <th className="border border-slate-300 p-2">Species</th>
                <th className="border border-slate-300 p-2">Latin Name</th>
                <th className="border border-slate-300 p-2">Weight</th>
                <th className="border border-slate-300 p-2">Cast</th>
                <th className="border border-slate-300 p-2">Food</th>
                <th className="border border-slate-300 p-2">Feed Time</th>
                <th className="border border-slate-300 p-2">Initials</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnimals.map(animal => {
                const data = getAnimalData(animal, date);
                return (
                  <tr key={animal.id}>
                    <td className="border border-slate-300 p-2">{data.name}</td>
                    <td className="border border-slate-300 p-2">{data.species}</td>
                    <td className="border border-slate-300 p-2">{data.latinName}</td>
                    <td className="border border-slate-300 p-2">{data.weight}</td>
                    <td className="border border-slate-300 p-2">{data.cast}</td>
                    <td className="border border-slate-300 p-2">{data.food}</td>
                    <td className="border border-slate-300 p-2">{data.feedTime}</td>
                    <td className="border border-slate-300 p-2">{data.initials}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};
