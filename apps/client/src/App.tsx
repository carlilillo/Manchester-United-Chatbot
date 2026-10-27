import { useEffect, useRef, useState } from 'react';
import type { Activity, ChatMessage, ChatSummary, Memory, StreamEvent } from '@united/contracts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUp, BookOpen, Check, CircleStop, Clock3, Copy, History, Menu, MessageCircle, Plus, Settings2, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { MessageScrollerProvider, MessageScroller, MessageScrollerViewport, MessageScrollerContent, MessageScrollerItem, MessageScrollerButton } from '@/components/ui/message-scroller';
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader } from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from '@/components/ui/trace';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast, Toaster } from 'sonner';

const DEFAULT_MEMORY: Memory = { enabled: true, responseStyle: 'friendly', notes: '', version: 0, updatedAt: null };
const SUGGESTIONS = ['What is the latest club news?', 'Show me the men’s fixtures', 'Who are the current players?', 'How do I get to Old Trafford?'];

function ActivityTrace({ activity }: { activity: Activity[] }) {
  if (!activity.length) return null;
  return <Trace className="activity-trace"><TraceCollapsible>
    <TraceCollapsibleTrigger><TraceLine status={activity.some(item => item.status === 'running') ? 'running' : undefined}><TraceIcon><Sparkles /></TraceIcon><TraceTitle>{activity.some(item => item.status === 'running') ? 'Working through sources' : `${activity.length} steps completed`}</TraceTitle></TraceLine></TraceCollapsibleTrigger>
    <TraceCollapsibleContent><Trace>{activity.map(item => <TraceLine key={item.id} status={item.status === 'running' ? 'running' : item.status === 'failed' ? 'error' : undefined}><TraceIcon>{item.kind === 'subagent' ? <MessageCircle /> : <BookOpen />}</TraceIcon><TraceTitle>{item.title}{item.detail && <span className="trace-detail">{item.detail}</span>}</TraceTitle></TraceLine>)}</Trace></TraceCollapsibleContent>
  </TraceCollapsible></Trace>;
}
function TranscriptMessage({ message, onFeedback }: { message: ChatMessage; onFeedback: (id: string, value: 'like' | 'dislike' | null) => void }) {
  const human = message.role === 'human';
  return <Message align={human ? 'end' : 'start'} className="conversation-message">
    {!human && <MessageAvatar className="assistant-avatar"><Sparkles size={15} /></MessageAvatar>}
    <MessageContent>
      <MessageHeader>{human ? 'You' : 'United Archive'} <span className="message-time">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></MessageHeader>
      {!human && <ActivityTrace activity={message.activity ?? []} />}
      {(message.content || message.status === 'streaming') && <Bubble variant={human ? 'default' : 'ghost'} align={human ? 'end' : 'start'} className={human ? 'user-bubble' : 'assistant-bubble'}><BubbleContent className="message-markdown">{message.content ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a> }}>{message.content}</ReactMarkdown> : <span className="waiting-text">Composing an answer…</span>}</BubbleContent></Bubble>}
      {message.status === 'failed' && <p className="message-status">The answer stopped because of an error.</p>}
      {message.status === 'cancelled' && <p className="message-status">Stopped.</p>}
      {!human && message.status === 'complete' && <MessageFooter className="message-actions"><button aria-label="Copy answer" title="Copy answer" onClick={() => { void navigator.clipboard.writeText(message.content); toast.success('Answer copied'); }}><Copy size={14}/></button><button aria-label="Like answer" title="Like answer" data-active={message.feedback === 'like'} onClick={() => onFeedback(message.id, message.feedback === 'like' ? null : 'like')}><ThumbsUp size={14}/></button><button aria-label="Dislike answer" title="Dislike answer" data-active={message.feedback === 'dislike'} onClick={() => onFeedback(message.id, message.feedback === 'dislike' ? null : 'dislike')}><ThumbsDown size={14}/></button></MessageFooter>}
    </MessageContent>
  </Message>;
}

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [memory, setMemory] = useState<Memory>(DEFAULT_MEMORY);
  const [draftMemory, setDraftMemory] = useState<Memory>(DEFAULT_MEMORY);
  const [screen, setScreen] = useState<'chat' | 'memory'>('chat');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const runTokenRef = useRef(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await api.session();
        const [saved, history] = await Promise.all([api.memory(), api.allChats()]);
        if (active) { setMemory(saved); setDraftMemory(saved); setChats(history); setReady(true); }
      } catch (cause) { if (active) { setError((cause as Error).message); setReady(true); } }
    })();
    return () => { active = false; };
  }, []);
  async function refreshChats() { setChats(await api.allChats()); }
  function newChat() { runTokenRef.current++; abortRef.current?.abort(); setThreadId(null); setMessages([]); setPrompt(''); setScreen('chat'); setError(''); }
  async function openChat(id: string) {
    if (sending) return;
    try { const result = await api.messages(id); setThreadId(id); setMessages(result.messages); setScreen('chat'); setError(''); }
    catch (cause) { toast.error((cause as Error).message); }
  }
  function applyEvent(event: StreamEvent) {
    if (event.type === 'started') setMessages(previous => [...previous, { id: event.messageId, role: 'ai', content: '', createdAt: new Date().toISOString(), status: 'streaming', activity: [], feedback: null }]);
    if (event.type === 'delta') setMessages(previous => previous.map(message => message.id === event.messageId ? { ...message, content: message.content + event.text } : message));
    if (event.type === 'activity') setMessages(previous => previous.map(message => message.id === event.messageId ? { ...message, activity: [...(message.activity ?? []).filter(item => item.id !== event.activity.id), event.activity] } : message));
    if (event.type === 'completed') setMessages(previous => previous.map(message => message.id === event.message.id ? event.message : message));
    if (event.type === 'error') setMessages(previous => previous.map(message => message.id === event.messageId ? { ...message, status: 'failed' } : message));
  }
  async function send(value = prompt) {
    const text = value.trim();
    if (!text || sending) return;
    setSending(true); setPrompt(''); setError('');
    const requestId = crypto.randomUUID();
    setMessages(previous => [...previous, { id: requestId, role: 'human', content: text, createdAt: new Date().toISOString(), status: 'complete', requestId }]);
    const abort = new AbortController(); abortRef.current = abort;
    const runToken = ++runTokenRef.current;
    try {
      const id = threadId ?? (await api.createChat()).threadId;
      if (runToken !== runTokenRef.current) return;
      if (!threadId) setThreadId(id);
      await api.stream(id, text, requestId, event => { if (runToken === runTokenRef.current) applyEvent(event); }, abort.signal);
      await refreshChats();
    } catch (cause) {
      if (runToken === runTokenRef.current && (cause as Error).name !== 'AbortError') { setError('Could not complete the answer. Please try again.'); toast.error('Could not complete the answer'); }
      if (runToken === runTokenRef.current && threadId) { const saved = await api.messages(threadId).catch(() => null); if (saved) setMessages(saved.messages); }
    } finally { setSending(false); abortRef.current = null; }
  }
  async function saveMemory() {
    setSavingMemory(true);
    try { const saved = await api.saveMemory({ enabled: draftMemory.enabled, responseStyle: draftMemory.responseStyle, notes: draftMemory.notes, version: memory.version }); setMemory(saved); setDraftMemory(saved); toast.success('Memory saved'); }
    catch (cause) { toast.error((cause as Error).message); }
    finally { setSavingMemory(false); }
  }
  async function feedback(messageId: string, value: 'like' | 'dislike' | null) {
    if (!threadId) return;
    try { const updated = await api.feedback(threadId, messageId, value); setMessages(previous => previous.map(item => item.id === messageId ? updated : item)); }
    catch (cause) { toast.error((cause as Error).message); }
  }
  return <SidebarProvider defaultOpen><div className="app-shell"><Toaster richColors position="bottom-right" />
    <Sidebar collapsible="offcanvas" className="app-sidebar"><SidebarHeader className="sidebar-brand"><div className="brand-mark">U<span>·</span></div><div><strong>UNITED ARCHIVE</strong><small>THE CLUB, IN CONTEXT</small></div></SidebarHeader>
      <SidebarContent><SidebarGroup><SidebarGroupContent><SidebarMenu>
        <SidebarMenuItem><SidebarMenuButton onClick={newChat} className="new-chat-button"><Plus /><span>New Chat</span></SidebarMenuButton></SidebarMenuItem>
        <SidebarMenuItem><SidebarMenuButton onClick={() => { setDraftMemory(memory); setScreen('memory'); }} isActive={screen === 'memory'}><Settings2 /><span>Memory</span></SidebarMenuButton></SidebarMenuItem>
      </SidebarMenu></SidebarGroupContent></SidebarGroup><SidebarGroup className="history-group"><SidebarGroupLabel><History size={13}/> CONVERSATIONS</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>
        {chats.length ? chats.map(chat => <SidebarMenuItem key={chat.threadId}><SidebarMenuButton onClick={() => void openChat(chat.threadId)} isActive={screen === 'chat' && threadId === chat.threadId} title={chat.title}><MessageCircle /><span>{chat.title}</span></SidebarMenuButton></SidebarMenuItem>) : <p className="empty-history">Your conversations will appear here.</p>}
      </SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent><SidebarFooter><div className="sidebar-foot"><span className="live-indicator"/> THE UNITED KNOWLEDGE DESK</div></SidebarFooter>
    </Sidebar>
    <SidebarInset className="main-inset"><header className="topbar"><SidebarTrigger aria-label="Toggle sidebar"><Menu /></SidebarTrigger><div className="topbar-divider"/><span className="topbar-title">{screen === 'memory' ? 'MEMORY' : threadId ? chats.find(chat => chat.threadId === threadId)?.title ?? 'CONVERSATION' : 'NEW CONVERSATION'}</span><div className="topbar-right"><span className="topbar-edition">EST. 1878 · BUILT FOR THE FANS</span><div className="topbar-dot"/></div></header>
      {!ready ? <div className="loading-screen"><Skeleton className="h-8 w-64"/><Skeleton className="h-5 w-80"/></div> : screen === 'memory' ? <main className="memory-page"><div className="section-kicker"><span>01 / PERSONALISATION</span><span>YOUR SETTINGS</span></div><div className="memory-heading"><div className="memory-symbol"><Settings2 size={28}/></div><h1>Make it yours.</h1><p>Set how United Archive responds to you in every conversation. Your preferences stay under your control.</p></div><div className="memory-card"><div className="memory-row"><div><h2>Use personal memory</h2><p>Apply your preferences across chats.</p></div><Switch checked={draftMemory.enabled} onCheckedChange={checked => setDraftMemory(previous => ({ ...previous, enabled: checked }))} aria-label="Use personal memory" /></div><div className="memory-field"><label>RESPONSE STYLE</label><p>Choose the tone that feels right to you.</p><ToggleGroup value={[draftMemory.responseStyle]} onValueChange={value => { const chosen = value[0]; if (chosen === 'formal' || chosen === 'friendly' || chosen === 'funny') setDraftMemory(previous => ({ ...previous, responseStyle: chosen })); }} variant="outline"><ToggleGroupItem value="formal">Formal</ToggleGroupItem><ToggleGroupItem value="friendly">Friendly</ToggleGroupItem><ToggleGroupItem value="funny">Funny</ToggleGroupItem></ToggleGroup></div><div className="memory-field"><label htmlFor="memory-notes">HOW SHOULD I ANSWER?</label><p>Add anything you want me to keep in mind.</p><Textarea id="memory-notes" value={draftMemory.notes} onChange={event => setDraftMemory(previous => ({ ...previous, notes: event.target.value }))} placeholder="For example: Keep answers short and mention official sources." maxLength={4000} rows={5}/><small>{draftMemory.notes.length} / 4,000 characters</small></div><div className="memory-footer"><Button variant="ghost" onClick={() => setDraftMemory({ ...memory, enabled: true, responseStyle: 'friendly', notes: '' })}>Reset</Button><Button onClick={() => void saveMemory()} disabled={savingMemory}>{savingMemory ? 'Saving…' : 'Save preferences'}<Check data-icon="inline-end" /></Button></div></div></main> : <div className="chat-layout">
      {messages.length === 0 ? <main className="welcome"><div className="welcome-inner"><div className="welcome-overline"><span className="overline-line"/> YOUR MANCHESTER UNITED COMPANION</div><h1>Every era.<br/><em>Every answer.</em></h1><p>Explore the people, matches and moments behind Manchester United. Ask a question and we’ll find the story in the club archive.</p><div className="welcome-rule"/><div className="suggestions-label">START WITH A QUESTION <ArrowUp size={13}/></div><div className="suggestions">{SUGGESTIONS.map((suggestion, index) => <button key={suggestion} onClick={() => void send(suggestion)} disabled={sending}><span>0{index + 1}</span>{suggestion}<ArrowUp size={15}/></button>)}</div></div><div className="stadium-lines" aria-hidden="true"/></main> : <MessageScrollerProvider autoScroll><MessageScroller className="transcript"><MessageScrollerViewport><MessageScrollerContent className="transcript-content">{messages.map(message => <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={message.role === 'human'}><TranscriptMessage message={message} onFeedback={feedback} /></MessageScrollerItem>)}</MessageScrollerContent></MessageScrollerViewport><MessageScrollerButton /></MessageScroller></MessageScrollerProvider>}
      <div className="composer-wrap">{error && <div role="alert" className="chat-error"><X size={15}/>{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}<form className="composer" onSubmit={event => { event.preventDefault(); void send(); }}><InputGroup><InputGroupTextarea value={prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Ask anything about United…" aria-label="Message" rows={2}/><InputGroupAddon align="block-end"><div className="composer-hint"><ShieldCheck size={14}/> GROUNDED IN THE ARCHIVE</div>{sending ? <InputGroupButton type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop answer"><CircleStop /></InputGroupButton> : <InputGroupButton type="submit" disabled={!prompt.trim()} aria-label="Send message"><ArrowUp /></InputGroupButton>}</InputGroupAddon></InputGroup></form><p className="composer-disclaimer">United Archive is an independent fan project. Check official sources for the latest information.</p></div>
    </div>}
    </SidebarInset></div></SidebarProvider>;
}
