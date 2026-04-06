"use client";

import { useState, useRef, useEffect } from "react";
import { useCollectionStore } from "@/lib/collection-store";
import { Bookmark, Plus, FolderOpen } from "lucide-react";

interface CollectionPopupProps {
  propertyIds: string[];
  onClose: () => void;
  anchorRect?: DOMRect | null;
}

export function CollectionPopup({ propertyIds, onClose, anchorRect }: CollectionPopupProps) {
  const collections = useCollectionStore((s) => s.collections);
  const addCollection = useCollectionStore((s) => s.addCollection);
  const addToCollection = useCollectionStore((s) => s.addToCollection);

  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSelect(collectionId: string) {
    addToCollection(collectionId, propertyIds);
    onClose();
  }

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = addCollection(trimmed);
    addToCollection(id, propertyIds);
    onClose();
  }

  const label = propertyIds.length > 1 ? `${propertyIds.length}개 매물` : "매물";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />

      {/* Popup */}
      <div
        ref={popupRef}
        className="fixed z-50 w-64 bg-card border rounded-lg shadow-lg py-1.5 animate-in fade-in-0 zoom-in-95 duration-150"
        style={
          anchorRect
            ? {
                top: Math.min(anchorRect.bottom + 4, window.innerHeight - 300),
                left: Math.min(anchorRect.left, window.innerWidth - 272),
              }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        {/* Header */}
        <div className="px-3 py-2 border-b">
          <p className="text-xs font-medium text-muted-foreground">
            {label}을 컬렉션에 저장
          </p>
        </div>

        {/* Collection list */}
        <div className="max-h-48 overflow-y-auto py-1">
          {collections.length === 0 && !showInput && (
            <p className="text-xs text-muted-foreground text-center py-4">
              컬렉션이 없습니다
            </p>
          )}
          {collections.map((c) => {
            const alreadyIn = propertyIds.every((id) => c.propertyIds.includes(id));
            return (
              <button
                key={c.id}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  alreadyIn
                    ? "text-muted-foreground bg-secondary/50"
                    : "hover:bg-accent"
                }`}
                onClick={() => !alreadyIn && handleSelect(c.id)}
                disabled={alreadyIn}
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{c.propertyIds.length}</span>
                {alreadyIn && (
                  <span className="text-[10px] text-muted-foreground">저장됨</span>
                )}
              </button>
            );
          })}
        </div>

        {/* New collection input */}
        {showInput ? (
          <div className="px-3 py-2 border-t">
            <input
              ref={inputRef}
              type="text"
              placeholder="컬렉션 이름..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setShowInput(false);
                  setNewName("");
                }
              }}
              className="w-full bg-secondary rounded px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
          </div>
        ) : (
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border-t"
            onClick={() => setShowInput(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>새 컬렉션 만들기</span>
          </button>
        )}
      </div>
    </>
  );
}

/** Bookmark button for a single property row */
export function BookmarkButton({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const collections = useCollectionStore((s) => s.collections);
  const inAny = collections.some((c) => c.propertyIds.includes(propertyId));

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => {
          setRect(btnRef.current?.getBoundingClientRect() ?? null);
          setOpen(true);
        }}
      >
        <Bookmark
          className={`h-3.5 w-3.5 transition-colors ${
            inAny
              ? "fill-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        />
      </button>
      {open && (
        <CollectionPopup
          propertyIds={[propertyId]}
          onClose={() => setOpen(false)}
          anchorRect={rect}
        />
      )}
    </>
  );
}
