import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

export default function MessagesThread({ queryKey, listFn, sendFn }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

  const { data: messages, isLoading } = useQuery({ queryKey, queryFn: listFn });

  const sendMutation = useMutation({
    mutationFn: () => sendFn({ body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setBody('');
    },
  });

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">Messages</h3>

      {isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="mb-4 text-sm text-neutral-500">No messages yet — say hello.</p>
      ) : (
        <div className="mb-4 max-h-72 space-y-3 overflow-y-auto">
          {messages.map((m) => {
            const isMe = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${isMe ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-800'}`}>
                  {!isMe && <p className="mb-0.5 text-xs font-medium opacity-70">{m.sender_name}</p>}
                  <p>{m.body}</p>
                  <p className={`mt-1 text-[10px] ${isMe ? 'text-white/70' : 'text-neutral-400'}`}>
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) sendMutation.mutate();
        }}
        className="flex gap-2"
      >
        <input
          className="input"
          placeholder="Write a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" disabled={sendMutation.isPending || !body.trim()} className="btn-primary shrink-0">
          Send
        </button>
      </form>
    </div>
  );
}
