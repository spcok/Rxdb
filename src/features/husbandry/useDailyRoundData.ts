import { useState, useEffect, useMemo } from 'react';
import { AnimalCategory, DailyRound, Animal, LogType, LogEntry, EntityType } from '../../types';
import { db } from '../../lib/rxdb';
import { v4 as uuidv4 } from 'uuid';

interface AnimalCheckState {
    isAlive?: boolean;
    isWatered: boolean;
    isSecure: boolean;
    securityIssue?: string;
    healthIssue?: string;
}

export function useDailyRoundData(viewDate: string) {
    const [allAnimals, setAllAnimals] = useState<Animal[]>([]);
    const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
    const [liveRounds, setLiveRounds] = useState<DailyRound[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [roundType, setRoundType] = useState<'Morning' | 'Evening'>('Morning');
    const [activeTab, setActiveTab] = useState<AnimalCategory>(AnimalCategory.OWLS);
    
    const [checks, setChecks] = useState<Record<string, AnimalCheckState>>({});
    const [signingInitials, setSigningInitials] = useState('');
    const [generalNotes, setGeneralNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!db) return;

        const subs = [
            db.animals.find({
                selector: { is_deleted: { $eq: false } }
            }).$.subscribe(docs => setAllAnimals(docs.map(d => d.toJSON() as Animal))),

            db.daily_logs_v2.find({
                selector: { 
                    log_date: { $eq: viewDate },
                    is_deleted: { $eq: false }
                }
            }).$.subscribe(docs => setLiveLogs(docs.map(d => d.toJSON() as LogEntry))),

            db.daily_rounds.find({
                selector: { 
                    date: { $eq: viewDate },
                    is_deleted: { $eq: false }
                }
            }).$.subscribe(docs => {
                setLiveRounds(docs.map(d => d.toJSON() as DailyRound));
                setIsLoading(false);
            })
        ];

        return () => subs.forEach(sub => sub.unsubscribe());
    }, [viewDate]);

    const currentRound = useMemo(() => {
        return liveRounds.find(r => r.shift === roundType && r.section === activeTab);
    }, [liveRounds, roundType, activeTab]);

    const currentRoundId = currentRound?.id;
    const isPastRound = currentRound?.status?.toLowerCase() === 'completed';

    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentRound?.check_data) {
                setChecks(currentRound.check_data as Record<string, AnimalCheckState>);
            } else {
                setChecks({});
            }
            setSigningInitials(currentRound?.completed_by || '');
            setGeneralNotes(currentRound?.notes || '');
        }, 0);
        return () => clearTimeout(timer);
    }, [viewDate, roundType, activeTab, currentRound]);

    const categoryAnimals = useMemo(() => {
        return allAnimals.filter(a => a.category === activeTab);
    }, [allAnimals, activeTab]);

    const freezingRisks = useMemo(() => {
        const risks: Record<string, boolean> = {};
        if (!liveLogs) return risks;

        categoryAnimals.forEach(animal => {
            if (animal.water_tipping_temp !== undefined) {
                const tempLog = liveLogs.find(l => l.animal_id === animal.id && l.log_type === LogType.TEMPERATURE);
                if (tempLog && tempLog.temperature_c !== undefined && tempLog.temperature_c <= animal.water_tipping_temp) {
                    risks[animal.id] = true;
                }
            }
        });
        return risks;
    }, [categoryAnimals, liveLogs]);

    const toggleHealth = (id: string, issue?: string) => {
        setChecks(prev => {
            const currentParent = prev[id] || { isWatered: false, isSecure: false };
            
            let newIsAlive: boolean;
            let newHealthIssue: string | undefined;
            
            if (currentParent.isAlive === true) {
                newIsAlive = false;
                newHealthIssue = issue;
            } else if (currentParent.isAlive === false) {
                newIsAlive = true;
                newHealthIssue = undefined;
            } else {
                newIsAlive = true;
                newHealthIssue = undefined;
            }
            
            const animal = allAnimals.find(a => a.id === id);
            const isGroup = animal?.entity_type === EntityType.GROUP;
            const childIds = isGroup ? allAnimals.filter(a => a.parent_mob_id === id).map(a => a.id) : [];
            
            const nextState = { ...prev };
            nextState[id] = { ...currentParent, isAlive: newIsAlive, healthIssue: newHealthIssue };
            
            childIds.forEach(childId => {
                const currentChild = nextState[childId] || { isWatered: false, isSecure: false };
                nextState[childId] = { ...currentChild, isAlive: newIsAlive, healthIssue: newHealthIssue };
            });
            
            return nextState;
        });
    };

    const toggleWater = (id: string) => {
        setChecks(prev => {
            const currentParent = prev[id] || { isWatered: false, isSecure: false };
            const newWaterState = !currentParent.isWatered;
            
            const animal = allAnimals.find(a => a.id === id);
            const isGroup = animal?.entity_type === EntityType.GROUP;
            const childIds = isGroup ? allAnimals.filter(a => a.parent_mob_id === id).map(a => a.id) : [];
            
            const nextState = { ...prev };
            nextState[id] = { ...currentParent, isWatered: newWaterState };
            
            childIds.forEach(childId => {
                const currentChild = nextState[childId] || { isWatered: false, isSecure: false };
                nextState[childId] = { ...currentChild, isWatered: newWaterState };
            });
            
            return nextState;
        });
    };

    const toggleSecure = (id: string, issue?: string) => {
        setChecks(prev => {
            const currentParent = prev[id] || { isWatered: false, isSecure: false };
            
            let newIsSecure: boolean;
            let newSecurityIssue: string | undefined;
            
            if (currentParent.isSecure) {
                newIsSecure = false;
                newSecurityIssue = issue;
            } else if (currentParent.securityIssue) {
                newIsSecure = true;
                newSecurityIssue = undefined;
            } else {
                newIsSecure = true;
                newSecurityIssue = undefined;
            }
            
            const animal = allAnimals.find(a => a.id === id);
            const isGroup = animal?.entity_type === EntityType.GROUP;
            const childIds = isGroup ? allAnimals.filter(a => a.parent_mob_id === id).map(a => a.id) : [];
            
            const nextState = { ...prev };
            nextState[id] = { ...currentParent, isSecure: newIsSecure, securityIssue: newSecurityIssue };
            
            childIds.forEach(childId => {
                const currentChild = nextState[childId] || { isWatered: false, isSecure: false };
                nextState[childId] = { ...currentChild, isSecure: newIsSecure, securityIssue: newSecurityIssue };
            });
            
            return nextState;
        });
    };

    const completedChecks = useMemo(() => {
        return categoryAnimals.filter(animal => {
            const state = checks[animal.id];
            if (!state) return false;
            
            const isDone = (activeTab === AnimalCategory.OWLS || activeTab === AnimalCategory.RAPTORS) 
                ? (state.isAlive !== undefined && (state.isSecure || Boolean(state.securityIssue)))
                : (state.isAlive !== undefined && state.isWatered && (state.isSecure || Boolean(state.securityIssue)));
            
            return isDone;
        }).length;
    }, [categoryAnimals, checks, activeTab]);

    const totalAnimals = categoryAnimals.length;
    const progress = totalAnimals === 0 ? 0 : Math.round((completedChecks / totalAnimals) * 100);
    const isComplete = totalAnimals > 0 && completedChecks === totalAnimals;
    
    const isNoteRequired = useMemo(() => {
        return false;
    }, []);

    const handleSignOff = async () => {
        if (!isComplete || !signingInitials) return;
        
        setIsSubmitting(true);
        try {
            const round: DailyRound = {
                id: currentRoundId || uuidv4(),
                date: viewDate,
                shift: roundType,
                section: activeTab,
                check_data: checks,
                status: 'completed',
                completed_by: signingInitials,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                notes: generalNotes
            };
            
            await db.daily_rounds.upsert(round);
        } catch (error) {
            console.error('Failed to sign off round:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentUser = {
        signature_data: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/John_Hancock_signature.png'
    };

    return {
        categoryAnimals,
        isLoading,
        roundType,
        setRoundType,
        activeTab,
        setActiveTab,
        checks,
        progress,
        isComplete,
        isNoteRequired,
        signingInitials,
        setSigningInitials,
        generalNotes,
        setGeneralNotes,
        isSubmitting,
        isPastRound,
        toggleWater,
        toggleSecure,
        toggleHealth,
        handleSignOff,
        currentUser,
        completedChecks,
        totalAnimals,
        freezingRisks
    };
}
