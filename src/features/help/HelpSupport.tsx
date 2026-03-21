import React, { useState } from 'react';
import { Search, Mail, Phone, ChevronDown, ChevronUp } from 'lucide-react';

const guides = [
  {
    id: 'adding-animal',
    title: 'Adding Animal Records',
    description: 'Learn how to create and manage animal profiles.',
    steps: [
      'Navigate to the Animal Directory.',
      'Click "Add Animal" in the top right corner.',
      'Fill out the base profile: Ring number, species, category, and location.',
      'Save the record.',
      'To add logs, click on the animal from the directory to open its profile.',
      'Use the "Add Log" button to record medical or weight entries.'
    ]
  },
  {
    id: 'daily-logs',
    title: 'Daily Logs',
    description: 'Submit husbandry notes and observations.',
    steps: [
      'Navigate to the "Daily Log" tab in the sidebar.',
      'Select the date and animal (if applicable).',
      'Enter your husbandry notes, feed consumption, and observations.',
      'Click "Submit Log" to save your entry.'
    ]
  },
  {
    id: 'timesheets',
    title: 'Time Sheets',
    description: 'Log your working hours.',
    steps: [
      'Go to the "Staff" section in the sidebar.',
      'Click on "Time Sheets".',
      'Click "Log Hours" or "Start Shift".',
      'Enter your shift details and submit.'
    ]
  },
  {
    id: 'holiday-requests',
    title: 'Holiday Requests',
    description: 'Submit leave requests for approval.',
    steps: [
      'Navigate to the "Holiday" tab in the Staff section.',
      'Select your desired start and end dates.',
      'Choose the leave type (Annual, Sick, etc.).',
      'Add any necessary notes and click "Submit Request".'
    ]
  },
  {
    id: 'daily-rounds',
    title: 'Daily Rounds',
    description: 'Complete scheduled enclosure rounds.',
    steps: [
      'Go to "Daily Rounds" in the sidebar.',
      'Start a scheduled round.',
      'Check off enclosure statuses as you inspect them.',
      'Complete the round once all checks are finished.'
    ]
  },
  {
    id: 'todo-lists',
    title: 'To-Do Lists (Tasks)',
    description: 'Manage your daily tasks.',
    steps: [
      'Navigate to "To-Do List" in the sidebar.',
      'Click "New Task".',
      'Enter the task title, assign it to a staff member, and set a priority.',
      'Click "Save Task".',
      'Mark the task as complete once finished.'
    ]
  }
];

const HelpSupport: React.FC = () => {
  const [openGuideId, setOpenGuideId] = useState<string | null>(null);

  const toggleGuide = (id: string) => {
    setOpenGuideId(openGuideId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Help & Support</h1>
          <p className="text-sm text-slate-500 mt-1">Knowledge Base & Training Guides</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search guides..." 
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
        />
      </div>

      <div className="space-y-4">
        {guides.map((guide) => (
          <div key={guide.id} className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden transition-all">
            <button 
              onClick={() => toggleGuide(guide.id)}
              className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{guide.title}</h4>
                <p className="text-sm text-slate-500">{guide.description}</p>
              </div>
              {openGuideId === guide.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
            </button>
            
            {openGuideId === guide.id && (
              <div className="p-6 pt-0 border-t-2 border-slate-100 bg-slate-50">
                <ul className="space-y-2 pt-4">
                  {guide.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="text-sm text-slate-700 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                        {stepIndex + 1}
                      </div>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 p-8 rounded-2xl border-2 border-blue-100 text-center space-y-4">
        <h4 className="text-lg font-black text-blue-900 uppercase tracking-tight">Need More Help?</h4>
        <p className="text-sm text-blue-700">Can't find what you're looking for? Contact our support team.</p>
        <div className="flex justify-center gap-6">
          <a href="mailto:support@kentowlacademy.com" className="flex items-center gap-2 text-blue-800 font-bold hover:underline">
            <Mail size={18} /> support@kentowlacademy.com
          </a>
          <a href="tel:+441234567890" className="flex items-center gap-2 text-blue-800 font-bold hover:underline">
            <Phone size={18} /> +44 123 456 7890
          </a>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
