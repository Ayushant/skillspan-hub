import React, { useState, useEffect } from 'react';
import { Clock, ArrowLeft, ArrowRight, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface QuizQuestion {
  id: string;
  title: string;
  description: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  category: string;
}

interface QuizAnswer {
  questionId: string;
  selectedAnswer: string;
  markedForReview: boolean;
}

export const QuizInterface: React.FC = () => {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [timeLeft, setTimeLeft] = useState(3300); // 55 minutes in seconds
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
    initializeSession();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .order('created_at');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeSession = async () => {
    try {
      // Get or create active session
      const { data: existingSession } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('status', 'active')
        .single();

      if (existingSession) {
        setSessionId(existingSession.id);
        // Load existing answers
        const { data: existingAnswers } = await supabase
          .from('student_answers')
          .select('*')
          .eq('session_id', existingSession.id);

        const answersMap: Record<string, QuizAnswer> = {};
        existingAnswers?.forEach(answer => {
          answersMap[answer.question_id] = {
            questionId: answer.question_id,
            selectedAnswer: answer.selected_answer || '',
            markedForReview: answer.marked_for_review || false,
          };
        });
        setAnswers(answersMap);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  const handleAnswerSelect = async (answer: string) => {
    const questionId = questions[currentQuestionIndex].id;
    const newAnswer: QuizAnswer = {
      questionId,
      selectedAnswer: answer,
      markedForReview: answers[questionId]?.markedForReview || false,
    };

    setAnswers(prev => ({
      ...prev,
      [questionId]: newAnswer,
    }));

    // Save to database
    if (sessionId) {
      try {
        const { error } = await supabase
          .from('student_answers')
          .upsert({
            session_id: sessionId,
            question_id: questionId,
            selected_answer: answer,
            marked_for_review: newAnswer.markedForReview,
            answered_at: new Date().toISOString(),
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving answer:', error);
      }
    }
  };

  const handleMarkForReview = async () => {
    const questionId = questions[currentQuestionIndex].id;
    const currentAnswer = answers[questionId];
    const updatedAnswer: QuizAnswer = {
      questionId,
      selectedAnswer: currentAnswer?.selectedAnswer || '',
      markedForReview: !currentAnswer?.markedForReview,
    };

    setAnswers(prev => ({
      ...prev,
      [questionId]: updatedAnswer,
    }));

    // Save to database
    if (sessionId) {
      try {
        const { error } = await supabase
          .from('student_answers')
          .upsert({
            session_id: sessionId,
            question_id: questionId,
            selected_answer: updatedAnswer.selectedAnswer,
            marked_for_review: updatedAnswer.markedForReview,
            answered_at: new Date().toISOString(),
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error updating review status:', error);
      }
    }
  };

  const handleSubmitQuiz = async () => {
    if (sessionId) {
      try {
        // Calculate score
        let correctAnswers = 0;
        questions.forEach(question => {
          const answer = answers[question.id];
          if (answer?.selectedAnswer === question.correct_answer) {
            correctAnswers++;
          }
        });

        const score = Math.round((correctAnswers / questions.length) * 100);

        // Update session
        const { error } = await supabase
          .from('quiz_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            score,
            total_questions: questions.length,
            correct_answers: correctAnswers,
          })
          .eq('id', sessionId);

        if (error) throw error;

        // Navigate to results page
        window.location.href = `/results/${sessionId}`;
      } catch (error) {
        console.error('Error submitting quiz:', error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz Not Available</h2>
          <p className="text-gray-600">No questions found or quiz not started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Mars Inc. Simulation</span>
              <div className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-red-600" />
              <span className="font-mono font-semibold text-red-600">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {currentQuestionIndex + 1}
                </div>
                <CardTitle className="text-xl">{currentQuestion.title}</CardTitle>
              </div>
              <Badge variant="secondary">{currentQuestion.category}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {currentQuestion.description}
              </p>

              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((option) => {
                  const optionText = currentQuestion[`option_${option.toLowerCase()}` as keyof QuizQuestion] as string;
                  const isSelected = currentAnswer?.selectedAnswer === option;
                  
                  return (
                    <div
                      key={option}
                      onClick={() => handleAnswerSelect(option)}
                      className={`quiz-option ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                          isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300'
                        }`}>
                          {option}
                        </div>
                        <span className="text-gray-900">{optionText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleMarkForReview}
              className={`flex items-center space-x-2 ${
                currentAnswer?.markedForReview ? 'bg-yellow-100 border-yellow-300' : ''
              }`}
            >
              <Flag className="w-4 h-4" />
              <span>{currentAnswer?.markedForReview ? 'Unmark' : 'Mark for Review'}</span>
            </Button>

            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmitQuiz}
                className="bg-green-600 hover:bg-green-700 text-white px-6"
              >
                Submit Quiz
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};