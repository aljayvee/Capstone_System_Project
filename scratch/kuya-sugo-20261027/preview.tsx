import React, { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { OwnerCopilotDrawer } from '../../src/portals/owner/components/OwnerCopilotDrawer';
import { KuyaSugoCharacter } from '../../src/portals/owner/components/KuyaSugoCharacter';
import { ownerCopilotApiService } from '../../src/services/ownerCopilotApiService';
import characterCss from '../../src/styles/kuya-sugo.css?raw';

const previewParams = new URLSearchParams(location.search);
const poseSeconds: Record<string, number> = { walk: 3.6, trip: 6.7, drop: 7.8, pickup: 11.24, okay: 14.2, release_before: 6.698, release: 6.7, landing: 7.2, pickup_before: 11.198, plant_start: 2, plant_end: 2.5, idle: 18 };
const pose = poseSeconds[previewParams.get('pose') ?? ''];
const poseStyle = pose === undefined ? '' : `.kuya-scene * { animation-delay: -${pose}s !important; animation-play-state: paused !important; }`;
const reducedStyle = previewParams.has('reduce') ? characterCss.slice(characterCss.lastIndexOf('@media (prefers-reduced-motion: reduce)')).replace('@media (prefers-reduced-motion: reduce)', '@media all') : '';

// Isolated local QA: no sign-in, network requests, or real business data.
ownerCopilotApiService.sendMessage = async (messages, context) => {
  await new Promise(resolve => setTimeout(resolve, 2500));
  const text = messages[messages.length - 1].content;
  if (text.toLowerCase().includes('error')) throw new Error('Local test failure');
  return {
    reply: `## Here's the update, Boss\nThis is a **local preview** using sample text.\n\n- Your question: ${text}\n- Open the sales report for more details.`,
    toolsUsed: [],
    actionLinks: [{ label: 'View sales report', action: 'open_report', target: 'sales' }],
  };
};
function Preview() {
  const [open, setOpen] = useState(true);
  const [navigation, setNavigation] = useState('');
  const close = useCallback(() => setOpen(false), []);
  return <div data-portal="owner" data-surface="owner" style={{ minHeight: '100vh', background: '#f5f5f4', padding: 32 }}>
    <style>{poseStyle + reducedStyle}</style>
    <h1 style={{ fontSize: 26, fontWeight: 700 }}>Owner portal</h1>
    <p style={{ marginTop: 12 }}>Kuya Sugo design preview. Chat uses sample replies only.</p>
    <p role="status">{navigation}</p>
    <button className="kuya-trigger" style={{ left: 24, bottom: 96 }} onClick={() => setOpen(true)} aria-label="Open Kuya Sugo">
      <span className="kuya-trigger__character"><KuyaSugoCharacter paused /></span>
      <span className="kuya-trigger__copy"><strong>Kuya Sugo</strong><small>Ask me a question</small></span>
    </button>
    <OwnerCopilotDrawer isOpen={open} onClose={close} activeModule="dashboard"
      onNavigateToModule={module => setNavigation(`Opened ${module}`)}
      onNavigateToReport={tab => setNavigation(`Opened ${tab} report`)} />
  </div>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
