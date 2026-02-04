/**
 * 操作履歴とUndo機能
 */

export type OperationType = 'DELETE' | 'UPDATE' | 'PUBLISH';

export interface UndoAction {
  id: string;
  type: OperationType;
  description: string;
  productIds: string[];
  previousState: Record<string, unknown>[];
  timestamp: number;
}

const MAX_HISTORY = 10;
const UNDO_TIMEOUT = 30000; // 30秒

class UndoManager {
  private history: UndoAction[] = [];
  private listeners: Set<() => void> = new Set();

  addAction(action: Omit<UndoAction, 'id' | 'timestamp'>) {
    const newAction: UndoAction = {
      ...action,
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };

    this.history = [newAction, ...this.history].slice(0, MAX_HISTORY);
    this.notifyListeners();

    // 自動的に古いアクションを削除
    setTimeout(() => {
      this.removeExpired();
    }, UNDO_TIMEOUT);

    return newAction.id;
  }

  getLatest(): UndoAction | null {
    const validActions = this.history.filter(
      (action) => Date.now() - action.timestamp < UNDO_TIMEOUT
    );
    return validActions[0] || null;
  }

  getAll(): UndoAction[] {
    return this.history.filter(
      (action) => Date.now() - action.timestamp < UNDO_TIMEOUT
    );
  }

  remove(id: string) {
    this.history = this.history.filter((action) => action.id !== id);
    this.notifyListeners();
  }

  private removeExpired() {
    const now = Date.now();
    const previousLength = this.history.length;
    this.history = this.history.filter(
      (action) => now - action.timestamp < UNDO_TIMEOUT
    );
    if (this.history.length !== previousLength) {
      this.notifyListeners();
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  clear() {
    this.history = [];
    this.notifyListeners();
  }
}

export const undoManager = new UndoManager();

// React hook for undo functionality
export function useUndo() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return undoManager.subscribe(() => forceUpdate({}));
  }, []);

  return {
    latestAction: undoManager.getLatest(),
    allActions: undoManager.getAll(),
    addAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) =>
      undoManager.addAction(action),
    removeAction: (id: string) => undoManager.remove(id),
    clearAll: () => undoManager.clear(),
  };
}

import { useState, useEffect } from 'react';
