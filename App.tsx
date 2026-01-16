import React, { useState, useEffect } from 'react';
import InputSection from './components/InputSection';
import ResultSection from './components/ResultSection';
import GradeBook from './components/GradeBook';
import ChatBot from './components/ChatBot';
import Login from './components/Login';
import { apiService } from './services/apiService';
import { GradingInputs, GradingResult, TabOption, GradeBookState, Exercise, User } from './types';
import { 
  DEFAULT_STUDENT_CODE,
  INITIAL_GRADEBOOK_STATE,
  GOOGLE_CLIENT_ID
} from './constants';

type ViewMode = 'SINGLE' | 'SHEETS';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('SINGLE');
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.STUDENT_CODE);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [gradeBookState, setGradeBookState] = useState<GradeBookState>(INITIAL_GRADEBOOK_STATE);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    INITIAL_GRADEBOOK_STATE.students.length > 0 ? INITIAL_GRADEBOOK_STATE.students[0].id : ''
  );
  
  const [activeExerciseId, setActiveExerciseId] = useState<string>(INITIAL_GRADEBOOK_STATE.exercises[0].id);
  const [studentCode, setStudentCode] = useState(DEFAULT_STUDENT_CODE);

  // SaaS SYNC: Load user and their data on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await apiService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const history = await apiService.getGradebook();
          if (history) setGradeBookState(history);
        }
      } catch (e) {
        console.error("Session check failed", e);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = () => {
    // Redirect to the backend OAuth route
    // This is the "True SaaS" way to handle secrets
    window.location.href = "/api/auth/google";
  };

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  const currentExercise = gradeBookState.exercises.find(ex => ex.id === activeExerciseId) || gradeBookState.exercises[0];

  const handleUpdateExerciseData = (field: keyof Exercise, value: any) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => 
        ex.id === activeExerciseId ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const handleEvaluate = async () => {
    if (!user) return;
    
    setIsEvaluating(true);
    setError(null);
    setResult(null);

    const inputs: GradingInputs = {
      question: currentExercise.question,
      masterSolution: currentExercise.masterSolution,
      rubric: currentExercise.rubric,
      customInstructions: currentExercise.customInstructions,
      studentCode: studentCode
    };

    try {
      const evaluation = await apiService.evaluate(inputs);
      setResult(evaluation);

      if (selectedStudentId) {
        // Update Local State
        handleUpdateEntry(activeExerciseId, selectedStudentId, 'score', evaluation.score);
        handleUpdateEntry(activeExerciseId, selectedStudentId, 'feedback', evaluation.feedback);

        // PERSIST TO MONGODB (SaaS Logic)
        await apiService.saveGrade(activeExerciseId, selectedStudentId, evaluation);

        setStudentCode('');

        const currentIndex = gradeBookState.students.findIndex(s => s.id === selectedStudentId);
        if (currentIndex !== -1 && currentIndex < gradeBookState.students.length - 1) {
          const nextStudent = gradeBookState.students[currentIndex + 1];
          setSelectedStudentId(nextStudent.id);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleUpdateEntry = (exerciseId: string, studentId: string, field: 'score' | 'feedback', value: any) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => {
        if (ex.id !== exerciseId) return ex;
        const currentEntry = ex.entries[studentId] || { score: 0, feedback: '' };
        return {
          ...ex,
          entries: {
            ...ex.entries,
            [studentId]: { ...currentEntry, [field]: value }
          }
        };
      })
    }));
  };

  const handleReset = () => {
    if (window.confirm("⚠️ Clear current session data?")) {
      setGradeBookState(INITIAL_GRADEBOOK_STATE);
      setStudentCode(DEFAULT_STUDENT_CODE);
      setResult(null);
      setError(null);
      setSelectedStudentId(INITIAL_GRADEBOOK_STATE.students.length > 0 ? INITIAL_GRADEBOOK_STATE.students[0].id : '');
      setActiveExerciseId(INITIAL_GRADEBOOK_STATE.exercises[0].id);
      setViewMode('SINGLE');
    }
  };

  const handleUpdateStudentName = (id: string, newName: string) => {
    setGradeBookState(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === id ? { ...s, name: newName } : s)
    }));
  };

  const handleUpdateMaxScore = (exerciseId: string, newMax: number) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ex.id === exerciseId ? { ...ex, maxScore: newMax } : ex)
    }));
  };

  const handleAddExercise = () => {
    const nextNum = gradeBookState.exercises.length + 1;
    const newId = `ex-${nextNum}-${Date.now()}`;
    const lastEx = gradeBookState.exercises[gradeBookState.exercises.length - 1];

    const newExercise: Exercise = {
      id: newId,
      name: `Exercise ${nextNum}`,
      maxScore: 10,
      entries: {},
      question: '',
      masterSolution: '',
      rubric: lastEx ? lastEx.rubric : '',
      customInstructions: lastEx ? lastEx.customInstructions : ''
    };

    setGradeBookState(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));

    setActiveExerciseId(newId);
    setStudentCode('');
    setResult(null);
    setError(null);
    setViewMode('SINGLE');
    setActiveTab(TabOption.QUESTION);
  };

  const handleAddStudent = () => {
    setGradeBookState(prev => {
      const nextNum = prev.students.length + 1;
      return {
        ...prev,
        students: [
          ...prev.students,
          { id: `student-${nextNum}-${Date.now()}`, name: `Student ${nextNum}` }
        ]
      }
    });
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              AI
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 hidden sm:block">
              CodeGrader SaaS
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                <button 
                  onClick={() => setViewMode('SINGLE')}
                  className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'SINGLE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Grader
                </button>
                <button 
                  onClick={() => setViewMode('SHEETS')}
                  className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'SHEETS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Sheets
                </button>
             </div>
             
             <div className="flex items-center space-x-2 pl-4 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-gray-900">{user.name}</div>
                  <div className="text-[10px] text-gray-500">{user.email}</div>
                </div>
                <button onClick={handleLogout} className="group relative">
                  <img src={user.picture} className="w-8 h-8 rounded-full border-2 border-indigo-100 group-hover:border-red-200 transition-all" alt="Avatar" />
                  <div className="absolute inset-0 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                    EXIT
                  </div>
                </button>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {viewMode === 'SINGLE' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)] min-h-[600px]">
            <section className="h-full">
              <InputSection 
                activeExercise={currentExercise}
                onUpdateExerciseData={handleUpdateExerciseData}
                studentCode={studentCode}
                setStudentCode={setStudentCode}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isEvaluating={isEvaluating}
                onEvaluate={handleEvaluate}
                students={gradeBookState.students}
                selectedStudentId={selectedStudentId}
                setSelectedStudentId={setSelectedStudentId}
                exercises={gradeBookState.exercises}
                setActiveExerciseId={setActiveExerciseId}
                onAddExercise={handleAddExercise}
              />
            </section>

            <section className="h-full">
              <ResultSection 
                result={result}
                error={error}
                isEvaluating={isEvaluating}
              />
            </section>
          </div>
        ) : (
          <div className="h-[calc(100vh-8rem)] min-h-[600px]">
            <GradeBook 
              state={gradeBookState}
              onUpdateStudentName={handleUpdateStudentName}
              onUpdateMaxScore={handleUpdateMaxScore}
              onUpdateEntry={handleUpdateEntry}
              onAddExercise={handleAddExercise}
              onAddStudent={handleAddStudent}
            />
          </div>
        )}
      </main>

      <ChatBot />
    </div>
  );
};

export default App;