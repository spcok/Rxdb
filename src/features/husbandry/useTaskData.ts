import { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { Task, User, UserRole, Animal } from '../../types';

const mockUsers: User[] = [
  { id: 'u1', email: 'john@example.com', name: 'John Doe', initials: 'JD', role: UserRole.VOLUNTEER },
  { id: 'u2', email: 'jane@example.com', name: 'Jane Smith', initials: 'JS', role: UserRole.ADMIN }
];

export const useTaskData = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const subs = [
      db.tasks.find({
        selector: { is_deleted: { $eq: false } },
        sort: [{ due_date: 'asc' }]
      }).$.subscribe(docs => {
        setTasks(docs.map(d => d.toJSON() as Task));
      }),

      db.animals.find({
        selector: { is_deleted: { $eq: false } }
      }).$.subscribe(docs => {
        setAnimals(docs.map(d => d.toJSON() as Animal));
        setIsLoading(false);
      })
    ];

    return () => subs.forEach(sub => sub.unsubscribe());
  }, []);

  const [filter, setFilter] = useState<'assigned' | 'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const currentUser = mockUsers[0];

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filter === 'completed' && !task.completed) return false;
      if (filter === 'pending' && task.completed) return false;
      if (filter === 'assigned' && (task.assigned_to !== currentUser.id || task.completed)) return false;

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const animalName = animals.find(a => a.id === task.animal_id)?.name.toLowerCase() || '';
        const userName = mockUsers.find(u => u.id === task.assigned_to)?.name.toLowerCase() || '';
        
        return (
          task.title.toLowerCase().includes(searchLower) ||
          (task.type && task.type.toLowerCase().includes(searchLower)) ||
          animalName.includes(searchLower) ||
          userName.includes(searchLower)
        );
      }
      return true;
    });
  }, [tasks, filter, searchTerm, currentUser.id, animals]);

  const addTask = async (newTask: Omit<Task, 'id'>) => {
    const taskWithId = { 
      ...newTask, 
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as Task;
    await db.tasks.upsert(taskWithId);
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const taskDoc = await db.tasks.findOne(id).exec();
    if (taskDoc) {
      const task = taskDoc.toJSON();
      await db.tasks.upsert({ 
        ...task, 
        ...updates,
        updated_at: new Date().toISOString()
      });
    }
  };

  const deleteTask = async (id: string) => {
    const taskDoc = await db.tasks.findOne(id).exec();
    if (taskDoc) {
      const task = taskDoc.toJSON();
      await db.tasks.upsert({ 
        ...task, 
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    await db.tasks.upsert({ 
      ...task, 
      completed: !task.completed,
      updated_at: new Date().toISOString()
    });
  };

  return {
    tasks: filteredTasks,
    animals,
    users: mockUsers,
    isLoading,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    currentUser
  };
};
