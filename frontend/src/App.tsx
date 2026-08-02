import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useRemoteParticipants,
  VideoTrack,
  useLocalParticipant,
  useTracks,
  AudioTrack,
  useRoomContext
} from '@livekit/components-react';
import { Track, LocalVideoTrack, createLocalVideoTrack, RoomEvent } from 'livekit-client';
import ReactMarkdown from 'react-markdown';
import '@livekit/components-styles';
import './App.css';

function ReportScreen({ reportData, onRestart }: { reportData: string, onRestart: () => void }) {
  return (
    <div className="app-container">
      <div className="setup-container" style={{ maxWidth: '800px', width: '100%' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#0F172A' }}>AI Evaluation Report</h2>
        <div className="report-content" style={{ lineHeight: '1.6', color: '#334155', textAlign: 'left', maxHeight: '60vh', overflowY: 'auto', padding: '1.5rem', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <ReactMarkdown>{reportData}</ReactMarkdown>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <button className="btn-primary-green" onClick={onRestart}>
            Start New Session
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomAudioRenderer() {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Microphone])
    .filter(t => t.participant.identity !== localParticipant.identity);
  
  const avatarTrack = tracks.find(t => t.participant.identity.includes('bey-avatar'));
  const trackToPlay = avatarTrack || tracks[0];
  
  return trackToPlay ? <AudioTrack trackRef={trackToPlay} /> : null;
}

const TOKEN_SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:8880';

const TOPICS = [
  { 
    id: 'ai', 
    title: 'Artificial Intelligence', 
    desc: 'Discuss LLMs, ethics, and future of AI',
    prompts: [
      { id: '01', title: 'How would you explain Transformer models in simple terms?', desc: 'Focus on self-attention mechanisms, tokenization, and contextual representation.', completed: true },
      { id: '02', title: 'Describe ethical concerns surrounding AI deployment.', desc: 'Include bias mitigation, hallucination prevention, and data privacy standard.', completed: true },
      { id: '03', title: 'What is your perspective on AI agent autonomy?', desc: 'Discuss human-in-the-loop architectures and safety guardrails.', completed: false },
      { id: '04', title: 'How do you handle rate limits and API fallback logic?', desc: 'Explain retry strategies, exponential backoff, and circuit breakers.', completed: false },
    ]
  },
  { 
    id: 'trading', 
    title: 'Trading & Finance', 
    desc: 'Market trends, strategies, and economy',
    prompts: [
      { id: '01', title: 'How do you analyze market volatility during news events?', desc: 'Explain VIX interpretation, order book dynamics, and risk management.', completed: true },
      { id: '02', title: 'Explain algorithmic trading execution strategies.', desc: 'Discuss TWAP, VWAP, and liquidity impact analysis.', completed: true },
      { id: '03', title: 'What is your approach to portfolio diversification?', desc: 'Cover asset correlation, Sharpe ratio, and drawdown limits.', completed: false },
    ]
  },
  { 
    id: 'cs', 
    title: 'Computer Science', 
    desc: 'System design, algorithms, and tech',
    prompts: [
      { id: '01', title: 'How do you optimize React applications for high throughput?', desc: 'Code-splitting, memoization (useMemo/React.memo), and preventing re-renders.', completed: true },
      { id: '02', title: 'Describe experience with microservices vs monoliths.', desc: 'Tradeoffs regarding operational complexity, IPC overhead, and team scaling.', completed: true },
      { id: '03', title: 'Explain distributed caching strategies.', desc: 'Redis cluster cache invalidation, write-through vs write-back.', completed: false },
    ]
  },
  { 
    id: 'general', 
    title: 'General Communication', 
    desc: 'Improve your speaking and clarity',
    prompts: [
      { id: '01', title: 'How do you structure complex ideas clearly?', desc: 'Using Pyramid Principle, concise executive summaries, and active listening.', completed: true },
      { id: '02', title: 'Describe a situation where you resolved a disagreement.', desc: 'Empathy, objective criteria, and win-win negotiation strategies.', completed: false },
    ]
  },
];

function AvatarView({ onAvatarReady }: { onAvatarReady: () => void }) {
  const participants = useRemoteParticipants();

  const avatarParticipant = participants.find(p => p.getTrackPublication(Track.Source.Camera)?.track);
  const videoTrack = avatarParticipant?.getTrackPublication(Track.Source.Camera);

  useEffect(() => {
    if (videoTrack?.track) {
      onAvatarReady();
    }
  }, [videoTrack, onAvatarReady]);

  if (avatarParticipant && videoTrack?.track) {
    return (
      <VideoTrack
        trackRef={{
          participant: avatarParticipant,
          publication: videoTrack,
          source: Track.Source.Camera,
        }}
        className="avatar-video-feed"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', gap: '1rem' }}>
      <div className="speaking-pulse" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', border: '2px solid #6366F1' }}></div>
      <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>Initializing AI Avatar Coach...</p>
    </div>
  );
}

function SessionDashboard({
  topicObj,
  webcamEnabled,
  onEndSession,
  onReportReceived,
}: {
  topicObj: typeof TOPICS[0];
  webcamEnabled: boolean;
  onEndSession: () => void;
  onReportReceived: (report: string) => void;
}) {
  const { state } = useVoiceAssistant();
  const [hasStarted, setHasStarted] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompts' | 'timeline' | 'highlights'>('prompts');
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(!webcamEnabled);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isEnding, setIsEnding] = useState(false);

  const { localParticipant } = useLocalParticipant();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  
  const room = useRoomContext();

  const handleStopSession = async () => {
    if (isEnding) return;
    setIsEnding(true);
    try {
      const data = new TextEncoder().encode(JSON.stringify({ type: 'end_session' }));
      await room.localParticipant.publishData(data, { reliable: true });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!hasStarted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
           clearInterval(timer);
           return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted]);

  useEffect(() => {
    const handleData = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === 'report') {
          onReportReceived(msg.content);
        }
      } catch (e) {
        console.error("Failed to parse data message", e);
      }
    };
    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room, onReportReceived]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // User webcam initialization
  useEffect(() => {
    let track: LocalVideoTrack | null = null;
    const startVideo = async () => {
      if (webcamEnabled && !videoOff) {
        try {
          track = await createLocalVideoTrack();
          setLocalVideoTrack(track);
          if (videoRef.current) {
            track.attach(videoRef.current);
          }
          await localParticipant.publishTrack(track);
        } catch (e) {
          console.error('Failed to publish webcam', e);
        }
      }
    };
    startVideo();
    return () => {
      if (track) {
        track.stop();
        localParticipant.unpublishTrack(track);
      }
    };
  }, [webcamEnabled, videoOff, localParticipant]);

  const handleAvatarReady = useCallback(() => {
    setAvatarReady(true);
  }, []);

  const handleStartSession = () => {
    setHasStarted(true);
    localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'start_interview' })), 1);
  };

  const toggleMic = () => {
    setMicMuted(!micMuted);
    localParticipant.setMicrophoneEnabled(micMuted);
  };

  const toggleCamera = () => {
    setVideoOff(!videoOff);
  };

  return (
    <div className="dashboard-app">
      {/* Navbar Header */}
      <div className="navbar">
        <div className="brand-logo">
          <div className="brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          </div>
          <span>TALKFLOW</span>
        </div>
      </div>

      {/* Page Sub-Header */}
      <div className="page-header">
        <div className="header-title-area">
          <button className="back-btn" onClick={onEndSession}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="header-text">
            <h1>Session - {topicObj.title}</h1>
            <p>Summary of candidate interaction, real-time metrics, and AI speech analysis.</p>
          </div>
          {hasStarted && (
            <div style={{ marginLeft: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#F87171', padding: '0.4rem 1rem', borderRadius: '2rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        <div className="action-buttons">
          {!hasStarted && avatarReady && (
            <button className="btn-primary-green" onClick={handleStartSession}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Practice Session
            </button>
          )}

          <button className="btn-secondary" onClick={handleStopSession} disabled={isEnding}>
            {isEnding ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="speaking-pulse" style={{ width: '12px', height: '12px', background: '#94A3B8', borderRadius: '50%' }}></span>
                Generating Report...
              </span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop Session
              </>
            )}
          </button>

          {hasStarted && (
            <button className="btn-primary-red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              Live Recording
            </button>
          )}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="dashboard-grid">
        {/* Left Column (Video & AI Summary) */}
        <div className="left-column">
          {/* Main Video Frame */}
          <div className="video-frame">
            {/* AI Avatar Badge Top-Left */}
            <div className="participant-badge">
              <div className="avatar-circle">AI</div>
              <span>Mrs. Tania Shahira (AI Coach)</span>
            </div>

            {/* User PIP Top-Right */}
            {webcamEnabled && !videoOff && (
              <div className="user-pip">
                <video ref={videoRef} autoPlay playsInline muted />
                <div className="pip-badge">
                  <div className="pip-avatar">RT</div>
                  <span>You</span>
                </div>
                <div className="pip-audio-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                </div>
              </div>
            )}

            {/* Avatar Video Feed */}
            <AvatarView onAvatarReady={handleAvatarReady} />

            {/* Video Controls Overlay */}
            <div className="video-controls">
              <button className={`control-btn ${micMuted ? 'active-off' : ''}`} onClick={toggleMic} title="Mute/Unmute">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
              </button>
              <button className={`control-btn ${videoOff ? 'active-off' : ''}`} onClick={toggleCamera} title="Camera On/Off">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </button>
              <button className="control-btn" title="Live Captions">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              <button className="control-btn-end" onClick={handleStopSession} title="End Call" disabled={isEnding}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z" transform="rotate(135 12 12)"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Bottom Card: Meeting Notes & AI Live Summary */}
          <div className="notes-card">
            <div className="notes-header">
              <h3>Key Session Notes - {topicObj.title}</h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
              </svg>
            </div>

            <div className="tags-row">
              <div className="tag-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="tag-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                </svg>
                {topicObj.title}
              </div>
              <div className="tag-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                Mrs. Tania Shahira, You
              </div>
            </div>

            <div className="ai-summary-box">
              <div className="ai-summary-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                AI Summary of Session
              </div>
              <div className="ai-summary-text">
                {hasStarted 
                  ? `The discussion focuses on ${topicObj.title}. The candidate is actively exploring concepts, structure, and articulation. Feedback is being generated in real-time.`
                  : "Click 'Start Practice Session' to initiate the speech analysis and conversation flow with your AI Coach."
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <CustomAudioRenderer />
    </div>
  );
}

function App() {
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<string | null>(null);
  
  const [selectedTopicId, setSelectedTopicId] = useState(TOPICS[0].id);
  const [webcamEnabled, setWebcamEnabled] = useState(true);

  const currentTopicObj = TOPICS.find(t => t.id === selectedTopicId) || TOPICS[0];

  const handleConnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const roomName = `interview-${Date.now()}`;
      const identity = `user-${Date.now()}`;
      
      const resp = await fetch(
        `${TOKEN_SERVER_URL}/api/token?room=${roomName}&identity=${identity}&topic=${encodeURIComponent(currentTopicObj.title)}`
      );
      
      if (!resp.ok) {
        throw new Error(`Token server returned ${resp.status}`);
      }
      
      const data = await resp.json();
      setConnectionInfo({ token: data.token, url: data.url });
      setConnected(true);
      setReportData(null);
    } catch (e: any) {
      setError(`Could not connect: ${e.message}. Ensure token server is running.`);
    } finally {
      setLoading(false);
    }
  }, [currentTopicObj]);

  const handleEndSession = () => {
    setConnected(false);
    setConnectionInfo(null);
  };

  const handleRestart = () => {
    setReportData(null);
    setConnected(false);
    setConnectionInfo(null);
  };

  if (reportData) {
    return <ReportScreen reportData={reportData} onRestart={handleRestart} />;
  }

  return (
    <div className="app-container" style={{ width: '100%' }}>
      {!connected || !connectionInfo ? (
        <div className="setup-container">
          <h2>TalkFlow AI — Communication Practice</h2>
          <p>Select your topic and prepare for your AI coaching session.</p>

          <div className="topic-options">
            {TOPICS.map(topic => (
              <div 
                key={topic.id} 
                className={`topic-box ${selectedTopicId === topic.id ? 'selected' : ''}`}
                onClick={() => setSelectedTopicId(topic.id)}
              >
                <h4>{topic.title}</h4>
                <p>{topic.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            <input 
              type="checkbox" 
              id="webcamCheck"
              checked={webcamEnabled}
              onChange={(e) => setWebcamEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="webcamCheck" style={{ fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', color: '#475569' }}>
              Enable User Webcam (Picture-in-Picture)
            </label>
          </div>

          {error && <p style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}

          <button className="btn-primary-green" onClick={handleConnect} disabled={loading} style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', justifyContent: 'center' }}>
            {loading ? 'Connecting to Room...' : 'Enter Session Dashboard'}
          </button>
        </div>
      ) : (
        <LiveKitRoom
          serverUrl={connectionInfo.url}
          token={connectionInfo.token}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={handleEndSession}
        >
          <SessionDashboard
            topicObj={currentTopicObj}
            webcamEnabled={webcamEnabled}
            onEndSession={handleEndSession}
            onReportReceived={setReportData}
          />
        </LiveKitRoom>
      )}
    </div>
  );
}

export default App;
