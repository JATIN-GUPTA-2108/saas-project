'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { createClassroomSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';
import { useClassroomStore } from '@/stores/classroom-store';

export function ClassroomView({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeOrganization = useAuthStore((s) => s.activeOrganization);
  const user = useAuthStore((s) => s.user);
  const socketRef = useRef<Socket | null>(null);

  const presenceCount = useClassroomStore((s) => s.presenceCount);
  const messages = useClassroomStore((s) => s.messages);
  const connected = useClassroomStore((s) => s.connected);
  const setPresenceCount = useClassroomStore((s) => s.setPresenceCount);
  const addMessage = useClassroomStore((s) => s.addMessage);
  const setConnected = useClassroomStore((s) => s.setConnected);
  const reset = useClassroomStore((s) => s.reset);

  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessToken || !activeOrganization) return;

    reset();
    const socket = createClassroomSocket(accessToken);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('classroom:join', {
        courseId,
        organizationId: activeOrganization.id,
      });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('presence:update', (payload: { count?: number }) => {
      if (payload.count !== undefined) setPresenceCount(payload.count);
    });

    socket.on('chat:message', (payload) => addMessage(payload));

    socket.connect();

    return () => {
      socket.emit('classroom:leave', {
        courseId,
        organizationId: activeOrganization.id,
      });
      socket.disconnect();
      socketRef.current = null;
      reset();
    };
  }, [
    accessToken,
    activeOrganization,
    courseId,
    reset,
    setConnected,
    setPresenceCount,
    addMessage,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const socket = socketRef.current;
    if (!text.trim() || !socket?.connected || !activeOrganization) return;
    socket.emit('chat:message', {
      courseId,
      organizationId: activeOrganization.id,
      message: text.trim(),
    });
    setText('');
  };

  return (
    <div>
      <Link
        href={`/dashboard/courses/${courseId}`}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to course
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Live classroom</h1>
          <p className="text-sm text-zinc-500">{courseTitle}</p>
        </div>
        <div className="text-right text-sm">
          <p className={connected ? 'text-green-600' : 'text-zinc-400'}>
            {connected ? 'Connected' : 'Connecting…'}
          </p>
          <p className="text-zinc-500">{presenceCount} online</p>
        </div>
      </div>

      <div className="mt-6 flex h-[420px] flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-zinc-400">
              No messages yet. Say hello!
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={`${msg.sentAt}-${i}`}
              className={`text-sm ${msg.userId === user?.id ? 'text-right' : ''}`}
            >
              <span className="text-xs text-zinc-400">{msg.email}</span>
              <p
                className={`mt-0.5 inline-block rounded-lg px-3 py-1.5 ${
                  msg.userId === user?.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                {msg.message}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <input
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!connected}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
