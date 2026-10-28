import { useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VideoTrack,
  useDataChannel,
  useLocalParticipant,
  useTranscriptions,
  useVoiceAssistant,
} from '@livekit/components-react';
import ReactMarkdown from 'react-markdown';
import './App.css';

const TOKEN_SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:8880';
const SESSION_SECONDS = 600;

const DOMAINS: Record<string, string[]> = {
  Technical: [
    'Artificial Intelligence', 'LLMs', 'Transformers', 'Prompt Engineering', 'DSA',
    'Operating Systems', 'DBMS', 'Computer Networks', 'OOP', 'System Design',
  ],
  Trading: [
    'Liquidity', 'Support and Resistance', 'Market Structure', 'Price Action', 'Candlestick Patterns',
    'Risk Management', 'Supply and Demand', 'Order Blocks', 'Break of Structure (BOS)', 'Change of Character (CHOCH)',
  ],
};

const STATUS: Record<string, string> = {
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  initializing: 'Getting ready',
  idle: 'Idle',
  failed: 'Connection failed',
};

const ICONS = {
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  micOff: 'M2 2l20 20M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v3',
  cam: 'M23 7l-7 5 7 5V7zM3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  camOff: 'M2 2l20 20M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10',
  end: 'M18 6L6 18M6 6l12 12',
};

function Icon({ name, size = 20 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><Icon name="mic" size={16} /></span>
      TalkFlow
    </div>
  );
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Setup({ onStart, loading, error }: { onStart: (topic: string, camera: boolean) => void; loading: boolean; error: string | null }) {
  const [domain, setDomain] = useState('Technical');
  const [subtopic, setSubtopic] = useState(DOMAINS.Technical[0]);
  const [camera, setCamera] = useState(false);

  const pickDomain = (d: string) => {
    setDomain(d);
    setSubtopic(DOMAINS[d][0]);
  };

  return (
    <main className="setup">
      <Brand />
      <h1>Practice a 10-minute voice interview</h1>
      <p className="lead">
        Explain a topic out loud. The AI interviewer listens, asks one follow-up at a time, and adapts the difficulty to your answers.
        You get a scored report at the end.
      </p>

      <section className="card">
        <h2 className="step">1. Choose a domain</h2>
        <div className="segmented" role="tablist">
          {Object.keys(DOMAINS).map(d => (
            <button key={d} role="tab" aria-selected={domain === d} className={domain === d ? 'on' : ''} onClick={() => pickDomain(d)}>
              {d}
            </button>
          ))}
        </div>

        <h2 className="step">2. Pick a topic</h2>
        <div className="chips">
          {DOMAINS[domain].map(t => (
            <button key={t} className={`chip ${subtopic === t ? 'on' : ''}`} aria-pressed={subtopic === t} onClick={() => setSubtopic(t)}>
              {t}
            </button>
          ))}
        </div>

        <label className="toggle">
          <input type="checkbox" checked={camera} onChange={e => setCamera(e.target.checked)} />
          Show my camera preview (stays on your device)
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn btn-primary btn-block" disabled={loading} onClick={() => onStart(`${domain}: ${subtopic}`, camera)}>
          {loading ? 'Connecting…' : `Start interview on ${subtopic}`}
        </button>
        <p className="hint">Your microphone will be used. Use headphones for the best experience.</p>
      </section>

      <ol className="how">
        <li><b>Listen</b> The interviewer hears your full explanation without interrupting.</li>
        <li><b>Adapt</b> Strong answers get harder questions; weak ones get simpler ones.</li>
        <li><b>Report</b> Technical, communication and confidence scores with next steps.</li>
      </ol>
    </main>
  );
}

function CameraPreview() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let stream: MediaStream | undefined;
    navigator.mediaDevices?.getUserMedia({ video: true }).then(s => {
      stream = s;
      if (ref.current) ref.current.srcObject = s;
    }).catch(() => { /* preview is optional */ });
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);
  return <video ref={ref} className="pip" autoPlay playsInline muted />;
}

function Transcript() {
  const { localParticipant } = useLocalParticipant();
  const lines = useTranscriptions();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  return (
    <aside className="panel">
      <h2 className="panel-title">Live transcript</h2>
      <div className="transcript" ref={ref} aria-live="polite">
        {lines.length === 0 && <p className="muted">The conversation will appear here once the interview starts.</p>}
        {lines.map(l => {
          const you = l.participantInfo.identity === localParticipant.identity;
          return (
            <div key={l.streamInfo.id} className={`line ${you ? 'you' : 'ai'}`}>
              <span className="who">{you ? 'You' : 'Interviewer'}</span>
              <p>{l.text}</p>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function Interview({ topic, camera, onReport, onLeave }: {
  topic: string;
  camera: boolean;
  onReport: (report: string) => void;
  onLeave: () => void;
}) {
  const { state, videoTrack, agent } = useVoiceAssistant();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [started, setStarted] = useState(false);
  const [ending, setEnding] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS);
  const [cameraOn, setCameraOn] = useState(camera);
  const [slowAgent, setSlowAgent] = useState(false);

  useDataChannel(msg => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      if (data.type === 'report') onReport(data.content);
    } catch { /* ignore non-JSON messages */ }
  });

  useEffect(() => {
    if (agent) return;
    const t = setTimeout(() => setSlowAgent(true), 15000);
    return () => clearTimeout(t);
  }, [agent]);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [started]);

  useEffect(() => {
    if (timeLeft === 0) setEnding(true); // the agent wraps up on its own timer
  }, [timeLeft]);

  const send = (type: string) =>
    localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type })), { reliable: true });

  const begin = () => {
    setStarted(true);
    send('start_interview');
  };

  const end = () => {
    if (!started) return onLeave();
    if (ending) return;
    setEnding(true);
    send('end_session');
  };

  const status = ending ? 'Wrapping up' : !started ? (agent ? 'Ready' : 'Connecting') : STATUS[state] ?? 'Connecting';
  const tone = ending || !started ? 'idle' : state;

  return (
    <div className="session">
      <header className="topbar">
        <Brand />
        <div className="topic" title={topic}>{topic}</div>
        <div className={`status status-${tone}`}><span className="dot" />{status}</div>
        <div className="timer" aria-label="Time remaining">
          <span>{formatTime(timeLeft)}</span>
          <div className="timer-bar"><div style={{ width: `${(timeLeft / SESSION_SECONDS) * 100}%` }} /></div>
        </div>
      </header>

      <div className="session-grid">
        <section className={`stage stage-${tone}`}>
          {videoTrack ? (
            <VideoTrack trackRef={videoTrack} className="avatar" />
          ) : (
            <div className="avatar-fallback">
              <div className="orb" />
              <p>{agent ? 'Avatar unavailable. Audio interview active.' : 'Connecting your interviewer…'}</p>
            </div>
          )}

          {cameraOn && <CameraPreview />}

          {!started && !ending && (
            <div className="overlay">
              {agent ? (
                <>
                  <h2>Your interviewer is ready</h2>
                  <p>Find a quiet spot. When you click start, the 10-minute timer begins.</p>
                  <button className="btn btn-primary" onClick={begin}>Start interview</button>
                </>
              ) : (
                <>
                  <div className="spinner" />
                  <h2>Connecting your interviewer…</h2>
                  {slowAgent && <p className="warn">This is taking longer than usual. Make sure the agent worker is running (<code>python -m app.main dev</code>).</p>}
                </>
              )}
            </div>
          )}

          {ending && (
            <div className="overlay">
              <div className="spinner" />
              <h2>Preparing your report</h2>
              <p>The interviewer is analysing your answers. This takes a few seconds.</p>
            </div>
          )}

          <div className="controls">
            <button
              className={`ctl ${isMicrophoneEnabled ? '' : 'off'}`}
              onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
              aria-label={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
              title={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
            >
              <Icon name={isMicrophoneEnabled ? 'mic' : 'micOff'} />
            </button>
            <button
              className={`ctl ${cameraOn ? '' : 'off'}`}
              onClick={() => setCameraOn(!cameraOn)}
              aria-label={cameraOn ? 'Hide camera preview' : 'Show camera preview'}
              title="Camera preview"
            >
              <Icon name={cameraOn ? 'cam' : 'camOff'} />
            </button>
            <button className="ctl ctl-end" onClick={end} disabled={ending} title={started ? 'End interview and get report' : 'Leave'}>
              <Icon name="end" /> <span>{started ? 'End & get report' : 'Leave'}</span>
            </button>
          </div>
          <StartAudio label="Click to enable interviewer audio" className="start-audio" />
        </section>

        <Transcript />
      </div>
      <RoomAudioRenderer />
    </div>
  );
}

const SCORE_RE = /##\s*(Technical|Communication|Confidence) Score[\s\S]*?\*\*Score:\*\*\s*(\d{1,3})/gi;

function Report({ report, topic, onRestart }: { report: string; topic: string; onRestart: () => void }) {
  const scores = [...report.matchAll(SCORE_RE)].map(m => ({ label: m[1], value: Math.min(100, Number(m[2])) }));
  const grade = (v: number) => (v >= 75 ? 'good' : v >= 50 ? 'ok' : 'low');

  return (
    <main className="report">
      <div className="report-head">
        <Brand />
        <div className="report-actions">
          <button className="btn btn-ghost" onClick={() => window.print()}>Save as PDF</button>
          <button className="btn btn-primary" onClick={onRestart}>New interview</button>
        </div>
      </div>
      <h1>Interview report</h1>
      <p className="lead">{topic}</p>

      {scores.length > 0 && (
        <div className="scores">
          {scores.map(s => (
            <div key={s.label} className={`score score-${grade(s.value)}`}>
              <span className="score-label">{s.label}</span>
              <span className="score-value">{s.value}<small>/100</small></span>
              <div className="score-bar"><div style={{ width: `${s.value}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      <article className="card markdown">
        <ReactMarkdown>{report.replace(/^\s*#\s.*\n/, '')}</ReactMarkdown>
      </article>
    </main>
  );
}

export default function App() {
  const [conn, setConn] = useState<{ token: string; url: string; topic: string; camera: boolean } | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // True once a report arrived or the user left: the following disconnect is expected.
  const settled = useRef(false);

  const start = async (topic: string, camera: boolean) => {
    settled.current = false;
    setLoading(true);
    setError(null);
    try {
      const id = crypto.randomUUID().slice(0, 8);
      const params = new URLSearchParams({ room: `interview-${id}`, identity: `candidate-${id}`, topic });
      const resp = await fetch(`${TOKEN_SERVER_URL}/api/token?${params}`);
      if (!resp.ok) throw new Error(`token server returned ${resp.status}`);
      const data = await resp.json();
      setConn({ token: data.token, url: data.url, topic, camera });
    } catch (e) {
      setError(`Could not connect: ${(e as Error).message}. Is the token server running?`);
    } finally {
      setLoading(false);
    }
  };

  if (report && conn) {
    return <Report report={report} topic={conn.topic} onRestart={() => { setReport(null); setConn(null); }} />;
  }

  if (!conn) return <Setup onStart={start} loading={loading} error={error} />;

  return (
    <LiveKitRoom
      serverUrl={conn.url}
      token={conn.token}
      connect
      audio
      video={false}
      onDisconnected={() => {
        if (settled.current) return;
        setConn(null);
        setError('The session ended before a report was produced.');
      }}
      onMediaDeviceFailure={() => setError('Microphone access was blocked. Allow it in your browser and try again.')}
    >
      {error && <div className="toast" role="alert">{error}</div>}
      <Interview
        topic={conn.topic}
        camera={conn.camera}
        onReport={r => { settled.current = true; setReport(r); }}
        onLeave={() => { settled.current = true; setConn(null); }}
      />
    </LiveKitRoom>
  );
}
