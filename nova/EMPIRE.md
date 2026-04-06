# NOVA EMPIRE — Operating Architecture

**Budget:** $0 (free-tier everything)
**Runtime:** Mac Mini (local) + free cloud services
**Goal:** Production factory that ships images, video, R&D, and builds custom AI — no typing required

---

## 1. EMPIRE STRUCTURE

```
OWNER (Eric)
  |
  +--> CEO (Claude Code / Cursor — max intelligence)
  |      |
  |      +--> Reads nova/memory/ at session start
  |      +--> Writes nova/memory/ at session end
  |      +--> Suggests daily improvements
  |      +--> Runs canonical audits
  |      |
  |      +--> DIVISIONS (n8n workflows, free agents)
  |             |
  |             +--> Creative Division (images, video, avatar)
  |             +--> R&D Division (internet research, AI physics)
  |             +--> Ops Division (health checks, deploys, audits)
  |             +--> CFO Division (revenue tracking, forecasts)
  |             +--> Media Division (longer videos, visual output)
  |
  +--> CUSTOM AI (nova/memory/ = training data)
  |      |
  |      +--> Every decision, output, and learning is logged
  |      +--> Memory compounds over time
  |      +--> Eventually becomes voice-interactive avatar
  |
  +--> AVATAR (long-term: voice-in, voice-out)
         |
         +--> Phase 1: Text in browser (now)
         +--> Phase 2: Voice commands via Web Speech API (free)
         +--> Phase 3: Animated avatar with TTS (free)
         +--> Phase 4: Real-time conversation (local LLM)
```

---

## 2. FREE-TIER STACK (Zero Cost)

| Component | Free Tool | Limit | Purpose |
|-----------|----------|-------|---------|
| **Workflows** | n8n (self-hosted Docker) | Unlimited | All automation |
| **Image Gen** | Stable Diffusion (ComfyUI local) | Unlimited | All images |
| **Image Gen Alt** | Pollinations.ai API | Unlimited, no key | Quick images via URL |
| **Video** | FFmpeg (local) | Unlimited | Image-to-video, editing |
| **Video Gen** | Hugging Face Spaces | Free tier | AI video (short clips) |
| **TTS** | Piper TTS (local) | Unlimited | Voice output |
| **STT** | Whisper.cpp (local) | Unlimited | Voice input |
| **Web Speech** | Browser Web Speech API | Unlimited | Voice commands |
| **LLM (local)** | Ollama + Llama 3.1 8B | Unlimited | Local AI for agents |
| **Research** | n8n HTTP nodes + RSS | Unlimited | Web scraping, feeds |
| **Storage** | Git repo + local disk | Unlimited | All media and memory |
| **Dashboard** | HTML + SSE (self-hosted) | Unlimited | Empire visibility |
| **Email** | Resend (free tier) | 100/day | Daily briefs |
| **Hosting** | Tailscale (free) | 100 devices | Remote access |

**Total cost: $0/month**

---

## 3. IMAGE PIPELINE (Owner Can See Results)

### How Images Get Made (Free)
```
n8n trigger (schedule or webhook)
    |
    v
Prompt engineering (n8n Function node)
    |
    +--> Option A: Pollinations.ai (zero config, just a URL)
    |    GET https://image.pollinations.ai/prompt/{encoded_prompt}
    |    Returns: PNG image directly
    |
    +--> Option B: ComfyUI (local Stable Diffusion, higher quality)
    |    POST http://localhost:8188/prompt
    |    Returns: Generated image to nova/media/
    |
    v
Save to nova/media/YYYY-MM-DD/
    |
    v
Git commit + push (owner sees in GitHub)
    |
    v
n8n sends thumbnail via Resend email to owner
```

### How Owner Sees Images
1. **GitHub:** Images committed to `nova/media/` — visible from phone browser
2. **Email:** Daily digest with thumbnails via Resend (free 100/day)
3. **Dashboard:** `nova/dashboard.html` shows latest media gallery
4. **Tailscale:** Direct access to Mac Mini from anywhere

---

## 4. VIDEO PIPELINE (Getting Longer Over Time)

### Phase 1: Image Sequences (Now — Free)
```
ComfyUI generates 4-8 keyframes
    -> FFmpeg stitches into 5-15 second clip
    -> Piper TTS adds narration
    -> Output: MP4 in nova/media/
```

### Phase 2: AI Video (Free Tier)
```
Hugging Face Spaces (Stable Video Diffusion)
    -> 4-second clips from single image
    -> FFmpeg concatenates + adds audio
    -> Output: 15-30 second videos
```

### Phase 3: Longer Form (R&D)
```
Multiple SVD clips + transition effects
    -> Script-driven scene planning
    -> Background music (free CC0 tracks)
    -> Output: 1-3 minute videos
```

---

## 5. VOICE INTERACTION ROADMAP (All Free)

### Phase 1: Browser Voice Commands (Available Now)
```html
<!-- Web Speech API — works in Chrome, free, no API key -->
<script>
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.onresult = (e) => {
  const command = e.results[e.results.length-1][0].transcript;
  // Send to n8n webhook for processing
  fetch('http://localhost:5678/webhook/voice-command', {
    method: 'POST',
    body: JSON.stringify({ text: command })
  });
};
recognition.start();
</script>
```

### Phase 2: Local TTS Response (Free)
```
Piper TTS (local, offline, fast)
    -> Install: pip install piper-tts
    -> Voices: 100+ free voices
    -> Latency: <200ms on Mac Mini
    -> Output: WAV/MP3 played in browser
```

### Phase 3: Animated Avatar (Free)
```
Ready Player Me (free avatar creation)
    -> Three.js renderer in browser (free)
    -> Lip-sync via Piper TTS phoneme output
    -> Runs on localhost, accessed via Tailscale
```

### Phase 4: Real-Time Conversation (Free)
```
Whisper.cpp (local STT, <1s latency)
    + Ollama (local LLM, Llama 3.1 8B)
    + Piper TTS (local voice output)
    = Full voice conversation loop
    All local, all free, all offline-capable
```

---

## 6. CEO DAILY IMPROVEMENT PROTOCOL

Every session, the CEO (Claude) must:

1. **Read** `nova/memory/learnings.jsonl` — what the AI has learned
2. **Suggest** one improvement in each category:
   - Leaner (remove waste)
   - More intelligent (better decisions)
   - Faster (reduce cycle time)
3. **Append** suggestions to `nova/memory/ceo_suggestions.jsonl`
4. **Execute** approved suggestions immediately
5. **Log** results to `nova/memory/outcomes.jsonl`

---

## 7. CUSTOM AI LEARNING SYSTEM

Every interaction feeds the AI's knowledge:

```
nova/memory/
  learnings.jsonl      <-- Append-only: what was learned each session
  decisions.jsonl      <-- Append-only: architectural choices + reasoning
  ceo_suggestions.jsonl <-- Append-only: daily improvement ideas
  outcomes.jsonl       <-- Append-only: what worked, what didn't
  research.jsonl       <-- Append-only: internet findings, papers, ideas
  skills.jsonl         <-- Append-only: new capabilities discovered
  errors.jsonl         <-- Append-only: mistakes to never repeat
```

### How This Becomes "Custom AI"
1. These JSONL files are the training data
2. Every new session reads them -> AI starts smarter
3. Ollama (local) can be fine-tuned on this data (free)
4. Over months: your AI knows YOUR empire, YOUR decisions, YOUR patterns
5. Eventually: voice-interactive avatar with all this knowledge built in

---

## 8. QUALITY STANDARDS

### "Real 2026 Levels" Checklist
- [ ] Images: 1024x1024 minimum, consistent style, no artifacts
- [ ] Video: 30fps, proper transitions, audio sync
- [ ] Code: TypeScript strict, no any types, tested
- [ ] Docs: Accurate, no stale references, cross-referenced
- [ ] Research: Cited sources, actionable findings
- [ ] Avatar: Responsive, natural speech cadence, personality

### Expert-Only Policy
Every n8n agent/workflow must:
- Have a clear domain expertise
- Produce output that passes quality gate
- Self-verify before delivering to owner
- Log quality metrics for R&D improvement

---

## 9. GETTING STARTED (Mac Mini Commands)

```bash
# 1. Install free tools (one-time)
brew install ollama ffmpeg
pip install piper-tts
ollama pull llama3.1:8b

# 2. Start n8n (Docker, free)
docker run -d --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n:latest

# 3. Start Ollama (local LLM)
ollama serve

# 4. Access from anywhere
# Install Tailscale: https://tailscale.com/download
# Then from phone/any device:
# http://mac-mini.tailnet:5678  (n8n dashboard)
# http://mac-mini.tailnet:8188  (ComfyUI if installed)
```

---

*This empire runs on zero dollars and compounds intelligence daily.*
*Every interaction makes it smarter. Every day makes it faster.*
