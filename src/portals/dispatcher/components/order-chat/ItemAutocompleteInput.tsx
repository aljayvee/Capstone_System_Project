import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  describeSuggestionSource,
  useCatalogAutocomplete,
  type CatalogItemSuggestion,
} from "./hooks/useCatalogAutocomplete";
import { Sparkles, Store } from "lucide-react";

interface ItemAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (suggestion: CatalogItemSuggestion) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const ItemAutocompleteInput: React.FC<ItemAutocompleteInputProps> = ({
  value,
  onChange,
  onSelectSuggestion,
  onBlur,
  placeholder,
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { suggestions, isLoading, clearSuggestions } = useCatalogAutocomplete(value);

  // Close dropdown when clicking outside (unless pinned open)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isPinned) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isPinned]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (suggestion: CatalogItemSuggestion) => {
    onChange(suggestion.itemName);
    onSelectSuggestion?.(suggestion);
    setIsOpen(false);
    clearSuggestions();
  };

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setSelectedIndex(-1);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "min-h-9 w-full rounded-trim border border-edge bg-board-ground px-2 text-body text-ink placeholder:text-ink-muted transition-colors focus:border-board-field focus:bg-board-plate focus:outline-none",
          className
        )}
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full min-w-[260px] overflow-hidden rounded-plate border border-edge bg-board-plate shadow-md">
          <div className="flex items-center justify-between border-b border-hairline bg-board-ground px-2.5 py-1 text-micro text-ink-muted">
            <span className="font-medium">Suggestions</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsPinned(!isPinned);
                }}
                className={cn(
                  "cursor-pointer text-micro underline",
                  isPinned ? "font-bold text-ink" : "text-ink-muted"
                )}
              >
                {isPinned ? "Pinned" : "Pin Open"}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                  setIsPinned(false);
                }}
                className="cursor-pointer text-ink-muted hover:text-ink"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
          </div>
          <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
            {suggestions.map((suggestion, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <li
                  key={suggestion.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(suggestion);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-label transition-colors",
                    isSelected
                      ? "bg-board-field text-board-plate"
                      : "text-ink hover:bg-board-ground hover:text-ink"
                  )}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{suggestion.itemName}</span>
                    <span
                      className={cn(
                        "flex items-center gap-1 truncate text-micro",
                        isSelected ? "text-board-plate/80" : "text-ink-muted"
                      )}
                    >
                      <Store size={11} className="shrink-0" />
                      <span className="truncate">{describeSuggestionSource(suggestion)}</span>
                    </span>
                  </div>

                  <span
                    className={cn(
                      "shrink-0 rounded-sm border px-1.5 py-0.5 text-micro uppercase",
                      isSelected
                        ? "border-board-plate/30 text-board-plate"
                        : "border-edge text-ink-muted"
                    )}
                  >
                    {suggestion.categoryName}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
