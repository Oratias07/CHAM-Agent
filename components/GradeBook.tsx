import React, { useRef } from 'react';
import { GradeBookState } from '../types';

interface GradeBookProps {
  state: GradeBookState;
  onUpdateStudentName: (id: string, name: string) => void;
  onUpdateMaxScore: (exerciseId: string, maxScore: number) => void;
  onUpdateEntry: (exerciseId: string, studentId: string, field: 'score' | 'feedback', value: any) => void;
  onAddExercise: () => void;
  onAddStudent: () => void;
}

const GradeBook: React.FC<GradeBookProps> = ({ 
  state, 
  onUpdateStudentName, 
  onUpdateMaxScore, 
  onUpdateEntry,
  onAddExercise,
  onAddStudent
}) => {
  const { students, exercises } = state;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400; // Pixel amount to scroll
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleDownloadCSV = () => {
    // 1. Setup BOM for UTF-8 (Crucial for Hebrew support in Excel/Sheets)
    const BOM = "\uFEFF"; 

    // 2. Helper to safely escape CSV fields (handles quotes, commas, newlines)
    const escapeCsv = (field: any): string => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        // If the field contains special CSV characters, wrap in quotes and escape internal quotes
        if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n') || stringField.includes('\r')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    // 3. Create Headers
    const headerRow = ["Student Name"];
    exercises.forEach(ex => {
      headerRow.push(`${ex.name} (Max: ${ex.maxScore}) Score`);
      headerRow.push(`${ex.name} Feedback`);
    });

    // 4. Create Data Rows
    const rows = students.map(student => {
      const rowData: (string | number)[] = [student.name];
      exercises.forEach(ex => {
        const entry = ex.entries[student.id] || { score: 0, feedback: "" };
        rowData.push(entry.score); // Score
        rowData.push(entry.feedback); // Feedback
      });
      // Map each field through the escaper and join with commas
      return rowData.map(escapeCsv).join(",");
    });

    // 5. Assemble Content
    const csvContent = BOM + headerRow.map(escapeCsv).join(",") + "\n" + rows.join("\n");

    // 6. Trigger Download
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gradebook_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Download failed", e);
      alert("Failed to download CSV. Please try again.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-full relative">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <span className="mr-2">📅</span> Class Grade Sheet
            </h2>
            {/* Scroll Buttons */}
            <div className="flex items-center space-x-1 bg-white rounded-md border border-gray-300 shadow-sm p-0.5">
                <button 
                    onClick={() => handleScroll('left')}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                    title="Scroll Left"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
                <div className="w-px h-4 bg-gray-300"></div>
                <button 
                    onClick={() => handleScroll('right')}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                    title="Scroll Right"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>

        <div className="flex items-center space-x-4">
           <div className="text-sm text-gray-500 hidden sm:block">
              Students: <span className="font-semibold text-gray-800">{students.length}</span>
           </div>
           <button 
             onClick={handleDownloadCSV}
             className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors shadow-sm"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
             <span>Download CSV</span>
           </button>
        </div>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="flex-grow overflow-auto custom-scrollbar p-0 pb-20"
      >
        <table className="divide-y divide-gray-200 border-collapse table-auto">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 w-32 min-w-[150px] z-20 sticky left-0">
                Exercise
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 w-24 min-w-[120px] z-20 sticky left-[150px]">
                Metric
              </th>
              {students.map((student) => (
                <th key={student.id} scope="col" className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200 bg-gray-100 min-w-[200px]">
                  <input 
                    type="text" 
                    value={student.name}
                    onChange={(e) => onUpdateStudentName(student.id, e.target.value)}
                    className="w-full bg-transparent text-center focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded px-1 py-1 outline-none transition-all"
                  />
                </th>
              ))}
              {/* Add Student Column Header */}
              <th scope="col" className="px-4 py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 min-w-[100px]">
                 <button 
                  onClick={onAddStudent}
                  className="px-3 py-1 bg-white border border-dashed border-gray-300 rounded text-gray-500 hover:text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-xs whitespace-nowrap"
                 >
                   + Add Student
                 </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {exercises.map((exercise) => (
              <React.Fragment key={exercise.id}>
                {/* Grade Row */}
                <tr className="bg-white hover:bg-gray-50 group">
                  <td rowSpan={2} className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                    {exercise.name}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-semibold text-indigo-600 uppercase border-r border-gray-200 bg-indigo-50/30 sticky left-[150px] z-10">
                    <div className="flex items-center space-x-1">
                      <span>Grade /</span>
                      <input 
                        type="number" 
                        min="1"
                        value={exercise.maxScore}
                        onChange={(e) => onUpdateMaxScore(exercise.id, Number(e.target.value))}
                        className="w-10 bg-white border border-indigo-200 rounded px-1 text-center text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </td>
                  {students.map((student) => {
                    const entry = exercise.entries[student.id] || { score: 0, feedback: '' };
                    const score = entry.score;
                    
                    // Dynamic color calculation based on percentage of maxScore
                    const percentage = (score / exercise.maxScore) * 100;
                    let scoreColor = 'text-red-600 bg-red-50';
                    if (percentage >= 90) scoreColor = 'text-green-600 bg-green-50';
                    else if (percentage >= 70) scoreColor = 'text-blue-600 bg-blue-50';
                    else if (percentage >= 50) scoreColor = 'text-yellow-600 bg-yellow-50';

                    return (
                      <td key={`${exercise.id}-${student.id}-score`} className="px-4 py-3 text-center border-r border-gray-200">
                        <input 
                          type="number"
                          min="0"
                          max={exercise.maxScore}
                          value={score}
                          onChange={(e) => onUpdateEntry(exercise.id, student.id, 'score', Number(e.target.value))}
                          className={`w-16 text-center text-sm font-bold border border-opacity-20 rounded py-1 outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${scoreColor}`}
                        />
                      </td>
                    );
                  })}
                   {/* Empty cell for Add Student column */}
                  <td className="bg-gray-50/20"></td>
                </tr>

                {/* Feedback Row */}
                <tr className="bg-gray-50/30">
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-500 uppercase border-r border-gray-200 sticky left-[150px] z-10 bg-gray-50/90 backdrop-blur-sm">
                    Feedback
                  </td>
                  {students.map((student) => {
                    const entry = exercise.entries[student.id] || { score: 0, feedback: '' };
                    return (
                      <td 
                        key={`${exercise.id}-${student.id}-feedback`} 
                        className="px-2 py-2 text-right text-xs text-gray-600 border-r border-gray-200 align-top"
                        dir="rtl"
                      >
                        <textarea
                          value={entry.feedback}
                          onChange={(e) => onUpdateEntry(exercise.id, student.id, 'feedback', e.target.value)}
                          className="w-full h-20 p-2 text-xs bg-white border border-gray-200 rounded resize-none focus:ring-1 focus:ring-indigo-500 outline-none custom-scrollbar"
                          placeholder="כתוב משוב כאן..."
                        />
                      </td>
                    );
                  })}
                   {/* Empty cell for Add Student column */}
                   <td className="bg-gray-50/20"></td>
                </tr>
                {/* Spacer Row for visual separation */}
                <tr><td colSpan={students.length + 3} className="h-2 bg-gray-100 border-t border-b border-gray-200"></td></tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-end items-center space-x-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="text-sm text-gray-500 italic mr-auto">
          Tip: Finish grading the current exercise before adding the next one.
        </div>
        <button
          onClick={onAddExercise}
          className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 active:transform active:scale-95 transition-all shadow-md"
        >
          <span>✅ Complete & Start Next Exercise</span>
        </button>
      </div>
    </div>
  );
};

export default GradeBook;