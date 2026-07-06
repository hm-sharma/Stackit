
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Question, Answer, VoteDirection } from '../types';
import { RichTextEditor } from './RichTextEditor';
import { ChevronUpIcon, ChevronDownIcon, CheckIcon, TrashIcon } from './icons';
import { useAuth, useUser } from '@clerk/clerk-react';
import * as apiService from '../services/apiService';


const AnswerComponent: React.FC<{
  answer: Answer;
  questionAuthorId: string;
  onVote: (answerId: string, direction: 'up' | 'down') => Promise<void>;
  onAccept: (answerId: string) => Promise<void>;
  voteStatus: VoteDirection;
  isVoting: boolean;
  isAdmin: boolean;
  onDelete: (answerId: string) => Promise<void>;
}> = ({ answer, questionAuthorId, onVote, onAccept, voteStatus, isVoting, isAdmin, onDelete }) => {
  const { user } = useUser();

  const handleAccept = () => {
    if (user?.id === questionAuthorId) {
        onAccept(answer._id);
    }
  };
  
  const handleDelete = () => {
      if (window.confirm('Are you sure you want to delete this answer? This action cannot be undone.')) {
          onDelete(answer._id);
      }
  };

  const timeAgo = (dateStr: string): string => {
      const date = new Date(dateStr);
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      let interval = seconds / 86400;
      if (interval > 1) return `answered ${Math.floor(interval)} days ago`;
      interval = seconds / 3600;
      if (interval > 1) return `answered ${Math.floor(interval)} hours ago`;
      interval = seconds / 60;
      if (interval > 1) return `answered ${Math.floor(interval)} minutes ago`;
      return `answered ${Math.floor(seconds)} seconds ago`;
  };

  return (
    <div className="flex gap-4 py-5 border-b border-gray-700">
      <div className="flex flex-col items-center flex-shrink-0 w-12 text-gray-400">
        <button onClick={() => onVote(answer._id, 'up')} disabled={isVoting} className={`p-1 rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait ${voteStatus === VoteDirection.UP ? 'text-sky-500' : ''}`} aria-label="Upvote">
          <ChevronUpIcon className="w-8 h-8"/>
        </button>
        <span className="text-xl font-bold my-1 text-white" aria-live="polite">{answer.votes}</span>
        <button onClick={() => onVote(answer._id, 'down')} disabled={isVoting} className={`p-1 rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait ${voteStatus === VoteDirection.DOWN ? 'text-red-500' : ''}`} aria-label="Downvote">
          <ChevronDownIcon className="w-8 h-8"/>
        </button>
        {answer.isAccepted && (
          <div className="mt-2 text-green-500" title="Accepted Answer">
            <CheckIcon className="w-8 h-8" />
          </div>
        )}
         {user?.id === questionAuthorId && !answer.isAccepted && (
            <button onClick={handleAccept} className="mt-2 p-1 rounded-full border-2 border-gray-600 hover:border-green-500 hover:text-green-500" title="Accept this answer">
                <CheckIcon className="w-6 h-6"/>
            </button>
        )}
        {isAdmin && (
            <button onClick={handleDelete} className="mt-3 p-1 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-500/10" title="Admin: Delete Answer">
                <TrashIcon className="w-5 h-5"/>
            </button>
        )}
      </div>
      <div className="flex-grow">
        <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: answer.body }} />
        <div className="mt-4 flex justify-end items-center">
            <div className="bg-gray-800 p-2 rounded-md text-sm">
                <div className="text-gray-400 mb-2">{timeAgo(answer.createdAt)}</div>
                <div className="flex items-center gap-2">
                    <img src={answer.author.avatarUrl} alt={answer.author.name} className="w-6 h-6 rounded-full"/>
                    <span className="text-sky-400">{answer.author.name}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export const QuestionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAnswerBody, setNewAnswerBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votingOn, setVotingOn] = useState<string | null>(null);
  
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata as { role?: string })?.role === 'admin';
  
  const fetchQuestion = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await apiService.getQuestion(id);
      setQuestion(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load question.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);
  
  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn || !newAnswerBody.trim()) return;

    setIsSubmitting(true);
    try {
      const updatedQuestion = await apiService.createAnswer({ getToken }, question!._id, newAnswerBody);
      setQuestion(updatedQuestion);
      setNewAnswerBody('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (answerId: string, direction: 'up' | 'down') => {
      if(!isSignedIn) {
          alert("Please login to vote.");
          return;
      }
      if (votingOn) return; // Prevent concurrent votes

      setVotingOn(answerId);
      const originalQuestion = question;
      const updatedAnswers = question!.answers.map(ans => {
        if (ans._id === answerId) {
            let newVoteCount = ans.votes;
            const currentVote = (ans.voters.up.includes(user!.id)) ? 'up' : (ans.voters.down.includes(user!.id)) ? 'down' : 'none';

            if (direction === currentVote) { // Toggling off
                newVoteCount += direction === 'up' ? -1 : 1;
            } else { // Voting or changing vote
                if (currentVote === 'up') newVoteCount--;
                if (currentVote === 'down') newVoteCount++;
                newVoteCount += direction === 'up' ? 1 : -1;
            }
          return { ...ans, votes: newVoteCount };
        }
        return ans;
      });
      
      setQuestion({ ...question!, answers: updatedAnswers });

      try {
        const updatedQuestion = await apiService.voteOnAnswer({getToken}, question!._id, answerId, direction);
        setQuestion(updatedQuestion);
      } catch (err) {
        console.error(err);
        setQuestion(originalQuestion); 
        alert('Failed to cast vote.');
      } finally {
        setVotingOn(null);
      }
  };

  const handleAcceptAnswer = async (answerId: string) => {
      if(!isSignedIn) return;
      try {
        const updatedQuestion = await apiService.acceptAnswer({getToken}, question!._id, answerId);
        setQuestion(updatedQuestion);
      } catch (err) {
        console.error(err);
        alert('Failed to accept answer.');
      }
  };
  
  const handleDeleteQuestion = async () => {
      if (!isAdmin || !question) return;
      if (window.confirm('Are you sure you want to PERMANENTLY DELETE this question and all its answers? This cannot be undone.')) {
          try {
              await apiService.deleteQuestion({ getToken }, question._id);
              alert('Question deleted successfully.');
              navigate('/');
          } catch (err: any) {
              console.error(err);
              alert(err.message || 'Failed to delete question.');
          }
      }
  };

  const handleDeleteAnswer = async (answerId: string) => {
      if (!isAdmin || !question) return;
      try {
          const updatedQuestion = await apiService.deleteAnswer({ getToken }, question._id, answerId);
          setQuestion(updatedQuestion);
      } catch (err: any) {
          console.error(err);
          alert(err.message || 'Failed to delete answer.');
      }
  };

  const timeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds > 86400) return new Date(date).toLocaleDateString();
    if (seconds > 3600) return `${Math.floor(seconds/3600)}h ago`;
    if (seconds > 60) return `${Math.floor(seconds/60)}m ago`;
    return `now`;
  }
  
  const getVoteStatusForUser = (answer: Answer): VoteDirection => {
    if (!user) return VoteDirection.NONE;
    if (answer.voters?.up.includes(user.id)) return VoteDirection.UP;
    if (answer.voters?.down.includes(user.id)) return VoteDirection.DOWN;
    return VoteDirection.NONE;
  };
  
  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-400">{error}</div>;
  }
  if (!question) {
    return <div className="text-center py-10">Question not found.</div>;
  }
  
  const sortedAnswers = [...question.answers].sort((a,b) => {
      if (a.isAccepted) return -1;
      if (b.isAccepted) return 1;
      return b.votes - a.votes;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-2 text-sm text-gray-400">
          <Link to="/" className="hover:text-sky-400">Questions</Link>
          <span className="mx-2">&gt;</span>
          <span className="truncate">{question.title.substring(0, 50)}...</span>
      </div>

      <h1 className="text-3xl font-bold text-white border-b border-gray-700 pb-4">{question.title}</h1>
      
      <div className="flex gap-4 py-4 border-b border-gray-700">
          <div className="w-12 flex-shrink-0"></div>
          <div className="flex-grow">
            <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: question.body }} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-6">
                <div className="flex gap-2 flex-wrap mb-4 sm:mb-0">
                    {question.tags.map(tag => (
                        <span key={tag} className="bg-gray-700 text-sky-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">{tag}</span>
                    ))}
                </div>
                 <div className="flex items-end gap-3">
                    {isAdmin && (
                        <button
                            onClick={handleDeleteQuestion}
                            className="bg-red-600/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-3 rounded-lg flex items-center gap-2 text-sm transition-colors"
                            title="Admin: Delete Question"
                        >
                            <TrashIcon className="w-4 h-4" /> Delete
                        </button>
                    )}
                    <div className="bg-sky-900/50 p-2 rounded-md text-sm text-sky-300 flex-shrink-0">
                        <div className="text-gray-400 text-xs mb-1">asked {timeAgo(question.createdAt)}</div>
                        <div className="flex items-center gap-2">
                            <img src={question.author.avatarUrl} alt={question.author.name} className="w-6 h-6 rounded-full"/>
                            <span>{question.author.name}</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
      </div>

      {sortedAnswers.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold text-white mb-4">{sortedAnswers.length} Answer{sortedAnswers.length > 1 ? 's' : ''}</h2>
          {sortedAnswers.map(answer => (
            <AnswerComponent
              key={answer._id}
              answer={answer}
              questionAuthorId={question.author.id}
              onVote={handleVote}
              onAccept={handleAcceptAnswer}
              voteStatus={getVoteStatusForUser(answer)}
              isVoting={votingOn === answer._id}
              isAdmin={isAdmin}
              onDelete={handleDeleteAnswer}
            />
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white">Your Answer</h2>
        <form onSubmit={handleAnswerSubmit} className="mt-4">
          <RichTextEditor value={newAnswerBody} onChange={setNewAnswerBody} />
          <div className="mt-4">
            <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isSignedIn || !newAnswerBody.trim() || isSubmitting}>
              {isSubmitting ? 'Posting...' : 'Post Your Answer'}
            </button>
            {!isSignedIn && <p className="text-yellow-400 text-sm inline-block ml-4">You must be logged in to post an answer.</p>}
          </div>
        </form>
      </div>
    </div>
  );
};