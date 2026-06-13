import { create } from 'zustand';
import type { ChatMessage } from '@/types/quiz';

type ClassroomState = {
  presenceCount: number;
  messages: ChatMessage[];
  connected: boolean;
  setPresenceCount: (count: number) => void;
  addMessage: (msg: ChatMessage) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
};

export const useClassroomStore = create<ClassroomState>((set) => ({
  presenceCount: 0,
  messages: [],
  connected: false,
  setPresenceCount: (count) => set({ presenceCount: count }),
  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg].slice(-100) })),
  setConnected: (connected) => set({ connected }),
  reset: () => set({ presenceCount: 0, messages: [], connected: false }),
}));
