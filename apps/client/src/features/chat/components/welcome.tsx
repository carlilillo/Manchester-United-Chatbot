import { ArrowUp } from 'lucide-react';
import type { WelcomeProps } from './types';

const SUGGESTIONS = [
  'What is the latest club news?',
  'Show me the men’s fixtures',
  'Who are the current players?',
  'How do I get to Old Trafford?',
];

/** Introduces the archive and offers starting questions for an empty conversation. */
export function Welcome({ onSuggestion, disabled }: WelcomeProps) {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-inner">
        <div className="welcome-overline">
          <span className="overline-line" /> YOUR MANCHESTER UNITED COMPANION
        </div>
        <h1 id="welcome-title">
          Every era.
          <br />
          <em>Every answer.</em>
        </h1>
        <p>
          Explore the people, matches and moments behind Manchester United. Ask a question and we’ll
          find the story in the club archive.
        </p>
        <div className="welcome-rule" />
        <div className="suggestions-label">
          START WITH A QUESTION <ArrowUp size={13} />
        </div>
        <div className="suggestions">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => onSuggestion(suggestion)}
              disabled={disabled}
            >
              <span>0{index + 1}</span>
              {suggestion}
              <ArrowUp size={15} />
            </button>
          ))}
        </div>
      </div>
      <div className="stadium-lines" aria-hidden="true" />
    </section>
  );
}
