import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

export interface TextSelectionState {
  selectedText: string;
  selectionRect: DOMRect | null;
  clearSelection: () => void;
}

export function useTextSelection(containerRef: RefObject<HTMLElement | null>): TextSelectionState {
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelectedText("");
    setSelectionRect(null);
  }, []);

  useEffect(() => {
    // Read containerRef.current lazily inside handlers so this effect works even
    // when the container mounts after the effect runs (e.g. behind a loading state).
    function readSelection() {
      const container = containerRef.current;
      if (!container) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setSelectedText("");
        setSelectionRect(null);
        return;
      }
      const text = selection.toString().trim();
      if (!text) {
        setSelectedText("");
        setSelectionRect(null);
        return;
      }
      if (!container.contains(selection.anchorNode)) {
        setSelectedText("");
        setSelectionRect(null);
        return;
      }
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setSelectedText(text);
      setSelectionRect(rect);
    }

    function handleMouseUp() {
      setTimeout(readSelection, 0);
    }

    document.addEventListener("selectionchange", readSelection);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("selectionchange", readSelection);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []); // empty — containerRef is a stable object; .current is read lazily at event time

  return { selectedText, selectionRect, clearSelection };
}
