import { useMemo, useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { LogType, Animal, LogEntry, ClinicalNote } from '../../types';

export interface MissingRecordAlert {
  id: string;
  animal_id: string;
  animal_name: string;
  animal_category: string;
  alert_type: 'Missing Weight' | 'Missing Feed' | 'Overdue Checkup' | 'Missing Details';
  days_overdue: number;
  severity: 'High' | 'Medium';
  category: 'Husbandry' | 'Health' | 'Details';
  missing_fields?: string[];
}

export interface HusbandryLogStatus {
  animal_id: string;
  animal_name: string;
  animal_category: string;
  weights: boolean[]; // 7 days
  feeds: boolean[];   // 7 days
}

export interface ComplianceStats {
  animal_id: string;
  detailsScore: number;
  healthScore: number;
  husbandryScore: number;
  missing_fields: string[];
  daysUntilCheckup: number | null;
}

export function useMissingRecordsData() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [dailyLogs, setDailyLogs] = useState<LogEntry[]>([]);
  const [medicalLogs, setMedicalLogs] = useState<ClinicalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const subs = [
      db.animals.find({ selector: { is_deleted: { $eq: false } } }).$.subscribe(docs => {
        setAnimals(docs.map(d => d.toJSON() as Animal));
      }),
      db.daily_logs_v2.find({ selector: { is_deleted: { $eq: false } } }).$.subscribe(docs => {
        setDailyLogs(docs.map(d => d.toJSON() as LogEntry));
      }),
      db.medical_logs.find({ selector: { is_deleted: { $eq: false } } }).$.subscribe(docs => {
        setMedicalLogs(docs.map(d => d.toJSON() as ClinicalNote));
        setIsLoading(false);
      })
    ];

    return () => subs.forEach(s => s.unsubscribe());
  }, []);

  const { alerts, complianceStats, categoryCompliance } = useMemo(() => {
    if (!animals.length) return { alerts: [], complianceStats: [], categoryCompliance: {} };
    
    const activeAnimals = animals.filter(a => !a.archived);
    const allAlerts: MissingRecordAlert[] = [];
    const allComplianceStats: ComplianceStats[] = [];
    const now = new Date();
    const sectionData: Record<string, { husbandry: number[], details: number[], health: number[] }> = {};

    for (const animal of activeAnimals) {
      const animalLogs = dailyLogs.filter(l => l.animal_id === animal.id);
      
      // Compliance Scoring
      const mandatoryFields: (keyof Animal)[] = ['microchip_id', 'sex', 'acquisition_date', 'latin_name', 'ring_number', 'red_list_status'];
      const missing_fields: string[] = [];
      mandatoryFields.forEach(field => {
        if (!animal[field]) {
          missing_fields.push(field.replace('_', ' '));
        }
      });
      const detailsScore = Math.round(((mandatoryFields.length - missing_fields.length) / mandatoryFields.length) * 100);

      // Husbandry Scoring (Last 7 days)
      const weightsPresent = Array(7).fill(false);
      const feedsPresent = Array(7).fill(false);
      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayLogs = animalLogs.filter(log => log.log_date.startsWith(dateStr));
        weightsPresent[i] = dayLogs.some(l => l.log_type === LogType.WEIGHT);
        feedsPresent[i] = dayLogs.some(l => l.log_type === LogType.FEED);
      }
      const husbandryScore = Math.round(((weightsPresent.filter(Boolean).length + feedsPresent.filter(Boolean).length) / 14) * 100);

      // Health Scoring
      const animalMedicalLogs = medicalLogs.filter(l => l.animal_id === animal.id);
      const checkupLogs = animalMedicalLogs
        .filter(log => log.note_type.toLowerCase().includes('checkup') || log.note_type.toLowerCase().includes('medical'))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const latestCheckup = checkupLogs[0];
      let daysUntilCheckup = null;
      let healthScore: number;
      
      if (latestCheckup) {
        const diffDays = Math.floor((now.getTime() - new Date(latestCheckup.date).getTime()) / (1000 * 60 * 60 * 24));
        daysUntilCheckup = 365 - diffDays;
        healthScore = Math.max(0, Math.min(100, Math.round((daysUntilCheckup / 365) * 100)));
      } else {
        healthScore = 0;
      }

      allComplianceStats.push({
        animal_id: animal.id,
        detailsScore,
        healthScore,
        husbandryScore,
        missing_fields,
        daysUntilCheckup
      });

      if (!sectionData[animal.category]) {
        sectionData[animal.category] = { husbandry: [], details: [], health: [] };
      }
      sectionData[animal.category].husbandry.push(husbandryScore);
      sectionData[animal.category].details.push(detailsScore);
      sectionData[animal.category].health.push(healthScore);

      // 1. Audit Weights (Last 14 days)
      const weightLogs = animalLogs
        .filter(log => log.log_type === LogType.WEIGHT)
        .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

      const latestWeight = weightLogs[0];
      const weightThreshold = 14;
      
      if (!latestWeight) {
        allAlerts.push({
          id: `weight-${animal.id}`,
          animal_id: animal.id,
          animal_name: animal.name,
          animal_category: animal.category,
          alert_type: 'Missing Weight',
          days_overdue: 999,
          severity: 'Medium',
          category: 'Husbandry'
        });
      } else {
        const lastDate = new Date(latestWeight.log_date);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > weightThreshold) {
          allAlerts.push({
            id: `weight-${animal.id}`,
            animal_id: animal.id,
            animal_name: animal.name,
            animal_category: animal.category,
            alert_type: 'Missing Weight',
            days_overdue: diffDays,
            severity: 'Medium',
            category: 'Husbandry'
          });
        }
      }

      // 1b. Audit Feeds (Last 7 days)
      const feedLogs = animalLogs
        .filter(log => log.log_type === LogType.FEED)
        .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

      const latestFeed = feedLogs[0];
      const feedThreshold = 7;
      
      if (!latestFeed) {
        allAlerts.push({
          id: `feed-${animal.id}`,
          animal_id: animal.id,
          animal_name: animal.name,
          animal_category: animal.category,
          alert_type: 'Missing Feed',
          days_overdue: 999,
          severity: 'Medium',
          category: 'Husbandry'
        });
      } else {
        const lastDate = new Date(latestFeed.log_date);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > feedThreshold) {
          allAlerts.push({
            id: `feed-${animal.id}`,
            animal_id: animal.id,
            animal_name: animal.name,
            animal_category: animal.category,
            alert_type: 'Missing Feed',
            days_overdue: diffDays,
            severity: 'Medium',
            category: 'Husbandry'
          });
        }
      }

      // 2. Audit Medical (Last 365 days)
      const checkupThreshold = 365;

      if (!latestCheckup) {
        allAlerts.push({
          id: `medical-${animal.id}`,
          animal_id: animal.id,
          animal_name: animal.name,
          animal_category: animal.category,
          alert_type: 'Overdue Checkup',
          days_overdue: 999,
          severity: 'High',
          category: 'Health'
        });
      } else {
        const lastDate = new Date(latestCheckup.date);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > checkupThreshold) {
          allAlerts.push({
            id: `medical-${animal.id}`,
            animal_id: animal.id,
            animal_name: animal.name,
            animal_category: animal.category,
            alert_type: 'Overdue Checkup',
            days_overdue: diffDays,
            severity: 'High',
            category: 'Health'
          });
        }
      }

      // 3. Audit Animal Details
      if (missing_fields.length > 0) {
        allAlerts.push({
          id: `details-${animal.id}`,
          animal_id: animal.id,
          animal_name: animal.name,
          animal_category: animal.category,
          alert_type: 'Missing Details',
          days_overdue: 0,
          severity: 'Medium',
          category: 'Details',
          missing_fields
        });
      }
    }

    const categoryCompliance: Record<string, { husbandry: number, details: number, health: number }> = {};
    for (const category in sectionData) {
      const d = sectionData[category];
      categoryCompliance[category] = {
        husbandry: Math.round(d.husbandry.reduce((a, b) => a + b, 0) / d.husbandry.length),
        details: Math.round(d.details.reduce((a, b) => a + b, 0) / d.details.length),
        health: Math.round(d.health.reduce((a, b) => a + b, 0) / d.health.length),
      };
    }

    return {
      alerts: allAlerts.sort((a, b) => {
        if (a.severity === b.severity) return b.days_overdue - a.days_overdue;
        return a.severity === 'High' ? -1 : 1;
      }),
      complianceStats: allComplianceStats,
      categoryCompliance
    };
  }, [animals, dailyLogs, medicalLogs]);

  return {
    alerts,
    complianceStats,
    categoryCompliance,
    husbandryStatus: [], // Placeholder for now
    isLoading
  };
}

