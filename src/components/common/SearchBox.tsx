import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

export interface SearchBoxResult {
  id: string;
  title: string;
  description?: string;
}

interface SearchBoxProps {
  value: string;
  results: SearchBoxResult[];
  onChange: (value: string) => void;
  onSelect: (result: SearchBoxResult) => void;
  placeholder?: string;
  label?: string;
  emptyMessage?: string;
  ariaLabel?: string;
  className?: string;
  clearAfterSelect?: boolean;
}

const searchBoxStyles = `
  .search-box {
    position: relative;
    isolation: isolate;
    width: 100%;
    max-width: 520px;
    min-width: 0;
  }

  .search-box-label {
    display: block;
    margin-bottom: 7px;
    color: var(--ink);
    font-size: 0.88rem;
    font-weight: 700;
  }

  .search-box-label.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .search-box-input-wrap {
    position: relative;
    width: 100%;
  }

  .search-box-input {
    display: block;
    width: 100%;
    height: 42px;
    padding: 0 42px 0 13px;
    border: 1px solid var(--line);
    border-radius: 10px;
    color: var(--ink);
    background: #ffffff;
    font: inherit;
    font-size: 0.9rem;
    box-sizing: border-box;
  }

  .search-box-input::placeholder {
    color: #8793a5;
  }

  .search-box-input:focus {
    border-color: var(--blue);
    outline: 3px solid rgba(37, 99, 235, 0.12);
  }

  .search-box-clear {
    position: absolute;
    top: 50%;
    right: 6px;
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    transform: translateY(-50%);
    padding: 0;
    border: 0;
    border-radius: 7px;
    color: #64748b;
    background: transparent;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
  }

  .search-box-clear:hover {
    color: var(--ink);
    background: #eef2f7;
  }

  .search-box-clear:focus-visible {
    outline: 2px solid rgba(37, 99, 235, 0.25);
    outline-offset: 1px;
  }

  .search-box-results {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    left: 0;
    z-index: 1000;
    max-height: 320px;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    contain: layout paint;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  }

  .search-box-result {
    display: flex;
    width: 100%;
    min-height: 58px;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 11px 13px;
    border: 0;
    border-bottom: 1px solid #e5e7eb;
    color: var(--ink);
    background: #ffffff;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .search-box-result:nth-child(even) {
    background: #f8fafc;
  }

  .search-box-result:last-child {
    border-bottom: 0;
  }

  .search-box-result:hover,
  .search-box-result:focus-visible,
  .search-box-result.is-active {
    color: #174ea6;
    background: #eaf3ff;
    outline: none;
  }

  .search-box-result-text {
    display: grid;
    min-width: 0;
    flex: 1;
    gap: 2px;
  }

  .search-box-result-title {
    overflow: hidden;
    font-size: 0.88rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-box-result-description {
    overflow: hidden;
    color: #64748b;
    font-size: 0.76rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-box-result:hover .search-box-result-description,
  .search-box-result:focus-visible .search-box-result-description,
  .search-box-result.is-active .search-box-result-description {
    color: #356ca8;
  }

  .search-box-result-arrow {
    flex: 0 0 auto;
    color: var(--blue);
    font-size: 1.05rem;
  }

  .search-box-empty {
    min-height: 48px;
    margin: 0;
    padding: 12px 13px;
    color: var(--muted);
    background: #ffffff;
    font-size: 0.85rem;
  }
`;

export function SearchBox({
  value,
  results,
  onChange,
  onSelect,
  placeholder = "Search",
  label = "",
  emptyMessage = "No matching results found.",
  ariaLabel,
  className = "",
  clearAfterSelect = true,
}: SearchBoxProps) {
  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeResultIndex, setActiveResultIndex] =
    useState(-1);
  const [isFocused, setIsFocused] = useState(false);

  const hasQuery = value.trim().length > 0;
  const showResults = isFocused && hasQuery;

  useEffect(() => {
    setActiveResultIndex(-1);
  }, [value, results.length]);

  const clearSearch = (): void => {
    onChange("");
    setActiveResultIndex(-1);
  };

  const selectResult = (
    result: SearchBoxResult,
  ): void => {
    onSelect(result);

    if (clearAfterSelect) {
      clearSearch();
    }

    setIsFocused(false);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      clearSearch();
      setIsFocused(false);
      event.currentTarget.blur();
      return;
    }

    if (!showResults || results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveResultIndex((currentIndex) =>
        currentIndex >= results.length - 1
          ? 0
          : currentIndex + 1,
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveResultIndex((currentIndex) =>
        currentIndex <= 0
          ? results.length - 1
          : currentIndex - 1,
      );

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const selectedResult =
        results[
          activeResultIndex >= 0
            ? activeResultIndex
            : 0
        ];

      if (selectedResult) {
        selectResult(selectedResult);
      }
    }
  };

  const handleBlur = (
    event: FocusEvent<HTMLDivElement>,
  ): void => {
    const nextFocusedElement =
      event.relatedTarget as Node | null;

    if (
      nextFocusedElement &&
      containerRef.current?.contains(
        nextFocusedElement,
      )
    ) {
      return;
    }

    setIsFocused(false);
    setActiveResultIndex(-1);
  };

  const activeResultId =
    activeResultIndex >= 0
      ? `${listboxId}-result-${activeResultIndex}`
      : undefined;

  return (
    <>
      <style>{searchBoxStyles}</style>

      <div
        ref={containerRef}
        className={`search-box ${className}`.trim()}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
      >
        <label
          className={
            label
              ? "search-box-label"
              : "search-box-label visually-hidden"
          }
          htmlFor={inputId}
        >
          {label || ariaLabel || "Search"}
        </label>

        <div className="search-box-input-wrap">
          <input
            id={inputId}
            className="search-box-input"
            type="search"
            role="combobox"
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            aria-label={
              ariaLabel || label || "Search"
            }
            aria-expanded={showResults}
            aria-controls={
              showResults ? listboxId : undefined
            }
            aria-activedescendant={activeResultId}
            onChange={(event) => {
              onChange(event.target.value);
              setActiveResultIndex(-1);
            }}
            onKeyDown={handleKeyDown}
          />

          {hasQuery && (
            <button
              type="button"
              className="search-box-clear"
              aria-label="Clear search"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={clearSearch}
            >
              ×
            </button>
          )}
        </div>

        {showResults && (
          <div
            id={listboxId}
            className="search-box-results"
            role="listbox"
            aria-live="polite"
          >
            {results.length > 0 ? (
              results.map((result, index) => (
                <button
                  id={`${listboxId}-result-${index}`}
                  key={result.id}
                  type="button"
                  role="option"
                  aria-selected={
                    activeResultIndex === index
                  }
                  className={`search-box-result ${
                    activeResultIndex === index
                      ? "is-active"
                      : ""
                  }`}
                  onMouseDown={(event) =>
                    event.preventDefault()
                  }
                  onMouseEnter={() =>
                    setActiveResultIndex(index)
                  }
                  onClick={() =>
                    selectResult(result)
                  }
                >
                  <span className="search-box-result-text">
                    <span className="search-box-result-title">
                      {result.title}
                    </span>

                    {result.description && (
                      <span className="search-box-result-description">
                        {result.description}
                      </span>
                    )}
                  </span>

                  <span
                    className="search-box-result-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </button>
              ))
            ) : (
              <p className="search-box-empty">
                {emptyMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}