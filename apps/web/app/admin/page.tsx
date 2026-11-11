'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Lead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  preferredTime?: string;
  reason?: string;
  status: string;
  createdAt: string;
}
interface Conversation {
  _id: string;
  status: string;
  messageCount: number;
  leadCaptured: boolean;
  lastMessagePreview: string;
  updatedAt: string;
}
interface Msg {
  _id: string;
  role: string;
  content: string;
  action: string;
  route: string;
  createdAt: string;
}
interface Stats {
  days: number;
  conversations: number;
  leads: number;
  handoffs: number;
  afterHours: number;
  repliesByRoute: { _id: string; count: number }[];
}

const fmt = (d: string) => new Date(d).toLocaleString();

export default function AdminPage() {
  const [tenant, setTenant] = useState('bright-smile');
  const [key, setKey] = useState('');
  const [tab, setTab] = useState<'leads' | 'chats'>('leads');
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [open, setOpen] = useState<{ id: string; msgs: Msg[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      setKey(sessionStorage.getItem('fd-admin-key') ?? '');
    } catch {
      /* ignore */
    }
  }, []);

  const loadAll = async () => {
    setError('');
    setLoading(true);
    try {
      try {
        sessionStorage.setItem('fd-admin-key', key);
      } catch {
        /* ignore */
      }
      const q = `?tenant=${encodeURIComponent(tenant)}`;
      const [s, l, c] = await Promise.all([
        api.admin<Stats>(`/stats${q}`, key),
        api.admin<Lead[]>(`/leads${q}`, key),
        api.admin<Conversation[]>(`/conversations${q}`, key),
      ]);
      setStats(s);
      setLeads(l);
      setConvs(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openConv = async (id: string) => {
    try {
      const msgs = await api.admin<Msg[]>(`/conversations/${id}/messages?tenant=${encodeURIComponent(tenant)}`, key);
      setOpen({ id, msgs });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="admin">
      <h1>FrontDesk AI · Admin</h1>
      <div className="admin-bar">
        <input value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="tenant slug" />
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="admin key" type="password" />
        <button onClick={loadAll} disabled={!key || loading}>
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>
      {error && <div className="admin-error">{error}</div>}

      {stats && (
        <div className="admin-stats">
          <div>
            <b>{stats.conversations}</b>
            <span>conversations ({stats.days}d)</span>
          </div>
          <div>
            <b>{stats.leads}</b>
            <span>leads</span>
          </div>
          <div>
            <b>{stats.handoffs}</b>
            <span>handoffs to staff</span>
          </div>
          <div>
            <b>{stats.repliesByRoute.find((r) => r._id === 'agent')?.count ?? 0}</b>
            <span>AI answers</span>
          </div>
        </div>
      )}

      {stats && (
        <div className="admin-tabs">
          <button className={tab === 'leads' ? 'active' : ''} onClick={() => setTab('leads')}>
            Leads ({leads.length})
          </button>
          <button className={tab === 'chats' ? 'active' : ''} onClick={() => setTab('chats')}>
            Conversations ({convs.length})
          </button>
        </div>
      )}

      {stats && tab === 'leads' && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Preferred time</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l._id}>
                <td>{fmt(l.createdAt)}</td>
                <td>{l.name}</td>
                <td>{l.phone}</td>
                <td>{l.email ?? '-'}</td>
                <td>{l.preferredTime ?? '-'}</td>
                <td>{l.reason ?? '-'}</td>
              </tr>
            ))}
            {!leads.length && (
              <tr>
                <td colSpan={6}>No leads yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {stats && tab === 'chats' && (
        <div className="admin-chats">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Updated</th>
                <th>Last message</th>
                <th>Msgs</th>
                <th>Status</th>
                <th>Lead</th>
              </tr>
            </thead>
            <tbody>
              {convs.map((c) => (
                <tr key={c._id} onClick={() => openConv(c._id)} className={open?.id === c._id ? 'selected' : ''}>
                  <td>{fmt(c.updatedAt)}</td>
                  <td>{c.lastMessagePreview}</td>
                  <td>{c.messageCount}</td>
                  <td>{c.status === 'handoff' ? '⚠️ handoff' : c.status}</td>
                  <td>{c.leadCaptured ? '✅' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {open && (
            <div className="admin-transcript">
              {open.msgs.map((m) => (
                <div key={m._id} className={`admin-msg ${m.role}`}>
                  <small>
                    {m.role} · {fmt(m.createdAt)}
                    {m.role === 'assistant' ? ` · ${m.route}${m.action !== 'NONE' ? ` · ${m.action}` : ''}` : ''}
                  </small>
                  <div>{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
