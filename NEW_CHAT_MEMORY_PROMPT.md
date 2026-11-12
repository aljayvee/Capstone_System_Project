# NEW CHAT SESSION RESUME PROMPT

> **How to use this file:**
> Whenever you open a brand-new chat window with Antigravity, Claude Code, or OpenAI Codex, copy and paste the prompt block below as your very first message.
> It grounds the AI immediately on active project state, saves tokens, and eliminates context bloat.

---

```markdown
Hello! We are resuming our pair-programming work on the Capstone Project.

To synchronize your memory without reading massive historical archives:
1. Inspect our active handover state file: `SESSION_HANDOVER.md` (<85 lines, <1,000 tokens).
2. Run a quick status check (`git status --short` and `npx tsc --noEmit`) to verify working tree and compiler health. If tsc reports compiler errors, immediately flag them as blocking issues before proposing any new work.
3. In exactly 3 concise bullet points, tell me:
   - What we accomplished in our last session.
   - What files currently have uncommitted changes or active work.
   - The immediate next task we are supposed to work on.

Do not dump giant logs or recite entire rulebooks. Note: `AGENT_HANDSHAKE.md` is our cold historical archive; consult it only on-demand via targeted grep searches. Once you provide this 3-bullet recap, wait for my confirmation before editing any code.
```

---

## Why this prompt works
1. **Zero Hallucination:** The AI is forced to inspect ground-truth files on disk before speaking, rather than guessing from training residue or stale context.
2. **Token Efficient:** It restricts bootstrap context to the lean `SESSION_HANDOVER.md` file (<85 lines, <1,000 tokens) instead of ingesting 5,600+ lines of old chat history (193,000+ tokens).
3. **Safety Gate:** It prevents the AI from initiating unsolicited, autonomous file modifications until the human developer approves the active plan.
