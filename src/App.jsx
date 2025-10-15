// v1.2: Added resilience for timestamp handling and vote parsing while preserving accessibility refinements.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  onValue,
  push,
  ref,
  runTransaction,
  serverTimestamp,
} from 'firebase/database';
import { database } from './firebase.js';

const STANCE_STYLES = {
  pro: 'bg-campusGold text-purdueBlack',
  con: 'bg-red-700 text-white',
  neutral: 'bg-purdueGray text-purdueBlack',
};

const STANCE_LABELS = {
  pro: 'Pro',
  con: 'Con',
  neutral: 'Neutral',
};

function createClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const difference = Date.now() - timestamp;
  const seconds = Math.floor(difference / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function SuggestionCard({
  suggestion,
  onVote,
  onAddComment,
  currentVote,
  isSelf,
}) {
  return (
    <article
      className="rounded-xl border border-purdueGray bg-white p-6 shadow-sm transition hover:shadow-md focus-within:ring-4 focus-within:ring-campusGold"
      aria-label={`Suggestion by ${suggestion.author}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-purdueBlack">
            <span className="sr-only">Suggestion text:</span>
            {suggestion.text}
          </h3>
          <p className="mt-2 text-sm text-purdueDarkGray">
            Submitted by <span className="font-medium text-purdueBlack">{suggestion.author}</span> ·{' '}
            <time dateTime={new Date(suggestion.createdAt).toISOString()}>{formatRelativeTime(suggestion.createdAt)}</time>
            {isSelf && <span className="ml-2 inline-flex items-center rounded-full bg-athleticGold px-2 py-0.5 text-xs font-semibold text-purdueBlack">You</span>}
          </p>
        </div>
        <div className="flex items-center gap-3" aria-label="Voting controls">
          <button
            type="button"
            onClick={() => onVote(suggestion.id, 1)}
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-campusGold text-lg font-bold transition focus-visible:outline-none ${
              currentVote === 1
                ? 'bg-campusGold text-purdueBlack'
                : 'bg-white text-campusGold hover:bg-athleticGold/30'
            }`}
            aria-pressed={currentVote === 1}
            aria-label={`Upvote suggestion from ${suggestion.author}`}
          >
            ▲
          </button>
          <div className="min-w-[3rem] text-center text-2xl font-bold text-purdueBlack" aria-live="polite">
            {suggestion.score}
          </div>
          <button
            type="button"
            onClick={() => onVote(suggestion.id, -1)}
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-purdueDarkGray text-lg font-bold transition focus-visible:outline-none ${
              currentVote === -1
                ? 'bg-purdueDarkGray text-white'
                : 'bg-white text-purdueDarkGray hover:bg-purdueGray/30'
            }`}
            aria-pressed={currentVote === -1}
            aria-label={`Downvote suggestion from ${suggestion.author}`}
          >
            ▼
          </button>
        </div>
      </div>

      <section className="mt-6 space-y-4" aria-label="Comments">
        <h4 className="text-lg font-semibold text-purdueBlack">Comments</h4>
        {suggestion.comments.length === 0 ? (
          <p className="text-sm text-purdueDarkGray">No comments yet. Start the conversation!</p>
        ) : (
          <ul className="space-y-3">
            {suggestion.comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-lg border border-purdueGray bg-athleticGold/10 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STANCE_STYLES[comment.stance]}`}>
                    {STANCE_LABELS[comment.stance]}
                  </span>
                  <p className="text-xs text-purdueDarkGray">
                    {comment.author} ·{' '}
                    <time dateTime={new Date(comment.createdAt).toISOString()}>{formatRelativeTime(comment.createdAt)}</time>
                  </p>
                </div>
                <p className="mt-3 text-sm text-purdueBlack">{comment.text}</p>
              </li>
            ))}
          </ul>
        )}

        <CommentComposer
          onSubmit={(payload) => onAddComment(suggestion.id, payload)}
          suggestionId={suggestion.id}
        />
      </section>
    </article>
  );
}

function CommentComposer({ onSubmit, suggestionId }) {
  const [stance, setStance] = useState('pro');
  const [text, setText] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const stanceName = `stance-${suggestionId}`;
  const textId = `comment-text-${suggestionId}`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ text: text.trim(), stance });
      setText('');
      setStance('pro');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="Add a comment">
      <fieldset className="flex flex-col gap-2 md:flex-row md:items-center">
        <legend className="text-sm font-semibold text-purdueBlack">Stance</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select stance">
          {Object.entries(STANCE_LABELS).map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition ${
                stance === value ? 'border-campusGold bg-campusGold text-purdueBlack' : 'border-purdueGray text-purdueDarkGray hover:border-campusGold'
              }`}
            >
              <input
                type="radio"
                name={stanceName}
                value={value}
                className="sr-only"
                checked={stance === value}
                onChange={() => setStance(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-purdueBlack" htmlFor={textId}>
          Comment
        </label>
        <textarea
          id={textId}
          name="comment"
          rows={3}
          className="w-full rounded-lg border border-purdueGray p-3 text-sm text-purdueBlack shadow-sm focus:border-campusGold"
          placeholder="Share your thoughts"
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg bg-campusGold px-4 py-2 text-sm font-semibold text-purdueBlack transition hover:bg-athleticGold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-campusGold"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Adding…' : 'Add comment'}
      </button>
    </form>
  );
}

export default function App() {
  const [displayName, setDisplayName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [isSubmittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const clientIdRef = useRef(createClientId());

  useEffect(() => {
    const suggestionsRef = ref(database, 'suggestions');
    const unsubscribe = onValue(
      suggestionsRef,
      (snapshot) => {
        const raw = snapshot.val() || {};
        const parsed = Object.entries(raw).map(([id, value]) => {
          const voteEntries = value.votes
            ? Object.values(value.votes).filter((vote) => typeof vote === 'number')
            : [];
          const score = voteEntries.reduce((acc, vote) => acc + vote, 0);
          const comments = value.comments
            ? Object.entries(value.comments).map(([commentId, commentValue]) => ({
                id: commentId,
                ...commentValue,
                createdAt:
                  typeof commentValue.createdAt === 'number'
                    ? commentValue.createdAt
                    : Date.now(),
              }))
            : [];

          comments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

          return {
            id,
            text: value.text,
            author: value.author,
            createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
            votes: value.votes || {},
            score,
            comments,
            authorId: value.authorId,
          };
        });

        parsed.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });

        setSuggestions(parsed);
      },
      (error) => {
        console.error('Failed to load suggestions', error);
        setErrorMessage('Unable to load suggestions. Please verify your Firebase configuration.');
      }
    );

    return () => unsubscribe();
  }, []);

  const voteMap = useMemo(() => {
    const votes = {};
    for (const suggestion of suggestions) {
      const userVote = suggestion.votes?.[clientIdRef.current] ?? 0;
      votes[suggestion.id] = userVote;
    }
    return votes;
  }, [suggestions]);

  const handleSetDisplayName = (event) => {
    event.preventDefault();
    if (!nameInput.trim()) return;
    setDisplayName(nameInput.trim());
    setNameInput('');
  };

  const handleCreateSuggestion = async (event) => {
    event.preventDefault();
    if (!newSuggestion.trim()) return;
    if (!displayName) {
      setErrorMessage('Please enter your display name before submitting suggestions.');
      return;
    }

    setSubmittingSuggestion(true);
    setErrorMessage('');

    try {
      const suggestionsRef = ref(database, 'suggestions');
      await push(suggestionsRef, {
        text: newSuggestion.trim(),
        author: displayName,
        authorId: clientIdRef.current,
        createdAt: serverTimestamp(),
      });
      setNewSuggestion('');
    } catch (error) {
      console.error('Failed to submit suggestion', error);
      setErrorMessage('Unable to submit suggestion. Please try again later.');
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const handleVote = async (suggestionId, value) => {
    if (!displayName) {
      setErrorMessage('Please enter your display name before voting.');
      return;
    }

    const voteRef = ref(database, `suggestions/${suggestionId}/votes/${clientIdRef.current}`);
    try {
      await runTransaction(voteRef, (currentVote) => {
        if (currentVote === value) {
          return null;
        }
        return value;
      });
    } catch (error) {
      console.error('Failed to register vote', error);
      setErrorMessage('Unable to register your vote. Please retry.');
    }
  };

  const handleAddComment = async (suggestionId, { text, stance }) => {
    if (!displayName) {
      setErrorMessage('Please enter your display name before commenting.');
      return;
    }

    const commentsRef = ref(database, `suggestions/${suggestionId}/comments`);
    try {
      await push(commentsRef, {
        text,
        stance,
        author: displayName,
        authorId: clientIdRef.current,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to add comment', error);
      setErrorMessage('Unable to add your comment. Please retry.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-athleticGold/20 to-white">
      <header className="border-b border-purdueGray bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 text-purdueBlack md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Purdue Team Voting Board</h1>
            <p className="mt-2 max-w-2xl text-sm text-purdueDarkGray">
              Share ideas, discuss with pro/con feedback, and vote in real time. Colors and contrast follow Purdue University guidelines to ensure accessibility.
            </p>
          </div>
          <form onSubmit={handleSetDisplayName} className="flex w-full max-w-sm flex-col gap-2 text-sm">
            <label htmlFor="display-name" className="font-semibold text-purdueBlack">
              Display name
            </label>
            <div className="flex gap-2">
              <input
                id="display-name"
                name="display-name"
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder={displayName || 'Enter your name'}
                className="w-full rounded-lg border border-purdueGray px-3 py-2 text-purdueBlack shadow-sm focus:border-campusGold"
                aria-required="true"
              />
              <button
                type="submit"
                className="rounded-lg bg-campusGold px-3 py-2 font-semibold text-purdueBlack transition hover:bg-athleticGold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-campusGold"
                aria-label="Save display name"
              >
                Save
              </button>
            </div>
            {displayName && (
              <p className="text-xs text-purdueDarkGray" aria-live="polite">
                Signed in as <span className="font-semibold text-purdueBlack">{displayName}</span>
              </p>
            )}
          </form>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <section className="rounded-2xl border border-campusGold bg-white p-6 shadow-md" aria-label="Submit a new suggestion">
          <h2 className="text-2xl font-bold text-purdueBlack">Add a suggestion</h2>
          <p className="mt-2 text-sm text-purdueDarkGray">
            Ideas post immediately and are visible to the whole team. Please keep suggestions respectful and actionable.
          </p>
          <form onSubmit={handleCreateSuggestion} className="mt-4 space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="new-suggestion" className="text-sm font-semibold text-purdueBlack">
                Suggestion details
              </label>
              <textarea
                id="new-suggestion"
                name="suggestion"
                rows={4}
                className="w-full rounded-lg border border-purdueGray p-3 text-sm text-purdueBlack shadow-sm focus:border-campusGold"
                placeholder="Describe your idea or improvement"
                value={newSuggestion}
                onChange={(event) => setNewSuggestion(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-purdueBlack px-4 py-3 text-sm font-semibold text-white transition hover:bg-purdueDarkGray focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-campusGold md:w-auto"
                disabled={isSubmittingSuggestion}
              >
                {isSubmittingSuggestion ? 'Submitting…' : 'Share suggestion'}
              </button>
              <span className="text-xs text-purdueDarkGray">Votes and comments update instantly for all teammates.</span>
            </div>
          </form>
        </section>

        {errorMessage && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            {errorMessage}
          </div>
        )}

        <section className="space-y-6" aria-label="Suggestion list">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-purdueBlack">Live suggestions</h2>
            <p className="text-sm text-purdueDarkGray" aria-live="polite">
              {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'}
            </p>
          </div>

          {suggestions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-purdueGray bg-white p-8 text-center text-sm text-purdueDarkGray">
              No suggestions yet. Share the first idea to kick things off!
            </p>
          ) : (
            <div className="grid gap-6">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onVote={handleVote}
                  onAddComment={handleAddComment}
                  currentVote={voteMap[suggestion.id]}
                  isSelf={suggestion.authorId === clientIdRef.current}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {!displayName && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="name-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-purdueBlack/70 px-6"
        >
          <div className="w-full max-w-lg rounded-2xl border border-campusGold bg-white p-8 shadow-2xl">
            <h2 id="name-dialog-title" className="text-2xl font-bold text-purdueBlack">
              Welcome! Let's get your name.
            </h2>
            <p className="mt-2 text-sm text-purdueDarkGray">
              Enter the name you would like teammates to see. You need a name before posting or voting.
            </p>
            <form onSubmit={handleSetDisplayName} className="mt-6 space-y-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="dialog-display-name" className="text-sm font-semibold text-purdueBlack">
                  Display name
                </label>
                <input
                  id="dialog-display-name"
                  name="dialog-display-name"
                  type="text"
                  className="w-full rounded-lg border border-purdueGray px-3 py-2 text-purdueBlack shadow-sm focus:border-campusGold"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="e.g. Jordan"
                  required
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-campusGold px-4 py-3 text-sm font-semibold text-purdueBlack transition hover:bg-athleticGold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-campusGold"
              >
                Join the board
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
