import { useState, useRef, useEffect } from "react";

const GEMINI_API_KEY = "AIzaSyAYsnU7HgBSK7MGl4bMiB43eRrKwgwGyAY";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a sharp, knowledgeable movie recommendation assistant with exceptional taste. You know Indian streaming platforms inside out. You are "Ramola Recommends" — a curated movie recommendation bot made by Dramola.

YOUR PERSONALITY:
- Concise, direct, no fluff
- You treat the user like a fellow cinephile, not a casual viewer
- You remember everything they tell you in the conversation
- Never use em dashes in your responses. Use a colon or a simple space instead.

PRE-LOADED TASTE PROFILE (apply this as a baseline for all users):
- Loved movies: Gangs of Wasseypur, Andhadhun, Dune, The Dark Knight, Inception, Tumbbad, Parasite, Article 15, Zindagi Na Milegi Dobara
- Loves: gripping story, strong characters, visual experience, emotional depth, dark and gritty, humour
- Benchmark films: Zodiac (stays with you), The Man from Earth (mind-blowing), Argo (biopic/true story done right)
- Also loves: biopics, true story films, thought-provoking sci-fi like Project Hail Mary
- Does NOT want: heavy/depressing content, slow-burn arthouse

YOUR RULES:
1. When a user first arrives, ask only TWO quick questions:
   - What languages they are open to? (Hindi, English, South Indian, International)
   - Anything they absolutely do not want? (horror, heavy drama, slow arthouse, no subtitles, etc.)
   Then immediately ask: "What do you feel like watching today?"
   DO NOT ask about favourite movies or what they love. That is already baked in.

2. When asked for recommendations ("recco"), if the user has already specified genre/platform/IMDb via filters, USE those directly and give results immediately. If no filters set, ask which genre/mood first.

3. When the user sends a message like "Give me [Genre] on [Platform] with IMDb above [X]" treat that as a complete request and give 10 results immediately.

4. Format ALL recommendations EXACTLY like this, numbered list, each on a new line. Use a vertical bar | instead of em dash:
**1. Movie/Show Name (Year)** | X.X IMDb | Platform Name
**2. Movie/Show Name (Year)** | X.X IMDb | Platform Name

5. Always give exactly 10 recommendations unless user asks for fewer.

6. ALWAYS mention where to watch in India. Platforms: Netflix, Prime Video, JioHotstar, SonyLIV, MUBI, Apple TV+, ZEE5, YouTube.

7. Only recommend content at or above the IMDb rating the user selected. Default is 6.5.

8. After giving recommendations, ask "Which of these have you seen? I'll swap those out!" and then replace watched ones with fresh picks, always keeping exactly 10.

9. For true crime documentaries, warn that Netflix heavily favours series. Prioritise single films unless user says episodes are fine.

10. Be honest if a category has limited options on a specific platform. Do not pad with bad picks.

11. Vibe and tone: like a well-watched friend giving honest recs, not a formal assistant. Never use em dashes anywhere.`;

const WELCOME_MESSAGE = {
  role: "model",
  content: "Hey! Welcome to Ramola Recommends. Curated picks, zero fluff, always with where to watch in India.\n\nTwo quick things:\n\n1. **Languages you're open to?** (Hindi, English, South Indian, International or all?)\n2. **Anything you absolutely don't want?** (horror, sappy romance, slow arthouse, no subtitles, etc.)\n\nOr just set your filters and hit Get Reccos!"
};

const GENRES = ["Any Genre", "Thriller / Mystery", "True Story / Biopic", "Sci-Fi", "Drama", "Dark / Gritty", "Action", "Comedy", "Feel-Good", "Horror", "Romance", "Crime", "Documentary", "Animation"];
const PLATFORMS = ["Any Platform", "Netflix", "Prime Video", "JioHotstar", "ZEE5", "MUBI", "Apple TV+", "YouTube"];

function formatMessage(text) {
  let f = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  f = f.split("\n").map(line =>
    line.trim() === "" ? "<br/>" : `<span style="display:block;margin-bottom:3px">${line}</span>`
  ).join("");
  return f;
}

export default function RamolaRecommends() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [genre, setGenre] = useState("Any Genre");
  const [platform, setPlatform] = useState("Any Platform");
  const [imdb, setImdb] = useState(6.5);
  const [creditsOver, setCreditsOver] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function buildUserText(raw) {
    const parts = [];
    if (genre !== "Any Genre") parts.push(`Genre: ${genre}`);
    if (platform !== "Any Platform") parts.push(`Platform: ${platform}`);
    parts.push(`IMDb minimum: ${imdb}`);
    return raw + ` [Filters: ${parts.join(", ")}]`;
  }

  async function sendMessage(overrideText) {
    const rawText = typeof overrideText === "string" ? overrideText : input.trim();
    if (!rawText || loading || creditsOver) return;

    setMessages(prev => [...prev, { role: "user", content: rawText }]);
    setInput("");
    setLoading(true);

    const geminiHistory = [
      ...messages.map(m => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }]
      })),
      { role: "user", parts: [{ text: buildUserText(rawText) }] }
    ];

    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: geminiHistory,
          generationConfig: { maxOutputTokens: 1200, temperature: 0.7 }
        })
      });

      if (res.status === 429 || res.status === 403) {
        setCreditsOver(true);
        setMessages(prev => [...prev, { role: "model", content: "Credits over. Call God Dramola for more!" }]);
        return;
      }

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Something went wrong. Try again!";
      setMessages(prev => [...prev, { role: "model", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "model", content: "Something went wrong. Try again!" }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleQuickRecco() {
    const g = genre !== "Any Genre" ? genre : "";
    const p = platform !== "Any Platform" ? `on ${platform}` : "";
    sendMessage(`Give me reccos${g ? ": " + g : ""}${p ? " " + p : ""}`);
  }

  const imdbColor = imdb >= 8 ? "#A3E635" : imdb >= 7 ? "#FACC15" : "#71717A";
  const imdbBg = imdb >= 8 ? "rgba(163,230,53,0.1)" : imdb >= 7 ? "rgba(250,204,21,0.1)" : "rgba(113,113,122,0.1)";

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      background: "#09090B",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      color: "#FAFAFA"
    }}>
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "500px", height: "200px",
        background: "radial-gradient(ellipse, rgba(163,230,53,0.05) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0
      }} />

      {/* Header */}
      <div style={{
        width: "100%", maxWidth: "660px",
        padding: "44px 20px 0",
        position: "sticky", top: 0,
        background: "rgba(9,9,11,0.9)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        zIndex: 10,
        borderBottom: "1px solid rgba(255,255,255,0.05)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{
            width: "40px", height: "40px",
            background: "#A3E635",
            borderRadius: "11px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px",
            boxShadow: "0 0 20px rgba(163,230,53,0.2)"
          }}>🎞️</div>
          <div>
            <div style={{ fontSize: "19px", fontWeight: "700", letterSpacing: "-0.4px" }}>Ramola Recommends</div>
            <div style={{ fontSize: "11px", color: "#52525B", marginTop: "2px" }}>Curated picks · India streaming</div>
          </div>
        </div>

        {/* Filter card */}
        <div style={{
          background: "#18181B",
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "12px",
          border: "1px solid rgba(255,255,255,0.06)"
        }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
            {[
              { label: "Genre", value: genre, setter: setGenre, options: GENRES },
              { label: "Platform", value: platform, setter: setPlatform, options: PLATFORMS }
            ].map(({ label, value, setter, options }) => (
              <div key={label} style={{ flex: 1 }}>
                <label style={{ fontSize: "10px", fontWeight: "600", color: "#52525B", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "5px" }}>{label}</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={value}
                    onChange={e => setter(e.target.value)}
                    style={{
                      width: "100%", padding: "9px 26px 9px 11px",
                      borderRadius: "10px",
                      border: "1px solid",
                      borderColor: value !== options[0] ? "rgba(163,230,53,0.35)" : "rgba(255,255,255,0.07)",
                      background: value !== options[0] ? "rgba(163,230,53,0.07)" : "#09090B",
                      color: value !== options[0] ? "#A3E635" : "#71717A",
                      fontSize: "13px", fontWeight: "500",
                      outline: "none", cursor: "pointer",
                      appearance: "none", fontFamily: "inherit",
                      transition: "all 0.2s"
                    }}
                  >
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <span style={{ position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)", color: "#3F3F46", fontSize: "10px", pointerEvents: "none" }}>▾</span>
                </div>
              </div>
            ))}
          </div>

          {/* IMDb slider */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "10px", fontWeight: "600", color: "#52525B", textTransform: "uppercase", letterSpacing: "0.07em" }}>IMDb Minimum</label>
              <span style={{ fontSize: "12px", fontWeight: "700", color: imdbColor, background: imdbBg, padding: "2px 8px", borderRadius: "6px", transition: "all 0.3s" }}>
                {imdb.toFixed(1)} ★
              </span>
            </div>
            <input
              type="range" min="0" max="10" step="0.1" value={imdb}
              onChange={e => setImdb(parseFloat(e.target.value))}
              style={{
                width: "100%", height: "3px", appearance: "none",
                background: `linear-gradient(to right, ${imdbColor} 0%, ${imdbColor} ${imdb * 10}%, #27272A ${imdb * 10}%, #27272A 100%)`,
                borderRadius: "2px", outline: "none", cursor: "pointer", transition: "background 0.2s"
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
              {[0, 2, 4, 6, 8, 10].map(n => <span key={n} style={{ fontSize: "9px", color: "#3F3F46" }}>{n}</span>)}
            </div>
          </div>

          <button
            onClick={handleQuickRecco}
            disabled={loading || creditsOver}
            style={{
              width: "100%", padding: "11px",
              borderRadius: "11px", border: "none",
              background: creditsOver ? "#27272A" : loading ? "rgba(163,230,53,0.25)" : "#A3E635",
              color: creditsOver ? "#3F3F46" : loading ? "#A3E635" : "#09090B",
              fontSize: "13px", fontWeight: "700",
              cursor: loading || creditsOver ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              boxShadow: !loading && !creditsOver ? "0 0 20px rgba(163,230,53,0.15)" : "none",
              transition: "all 0.2s"
            }}
          >
            {loading ? "Finding picks..." : creditsOver ? "Credits over. Call God Dramola." : `Get Reccos${genre !== "Any Genre" ? "  ·  " + genre : ""}${platform !== "Any Platform" ? "  ·  " + platform : ""}`}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        width: "100%", maxWidth: "660px",
        flex: 1, padding: "16px 20px 0",
        display: "flex", flexDirection: "column", gap: "12px",
        position: "relative", zIndex: 1
      }}>
        {messages.map((msg, i) => {
          const isBot = msg.role === "model" || msg.role === "assistant";
          return (
            <div key={i} style={{
              display: "flex",
              justifyContent: isBot ? "flex-start" : "flex-end",
              alignItems: "flex-end", gap: "8px",
              animation: "fadeIn 0.2s ease"
            }}>
              {isBot && (
                <div style={{
                  width: "28px", height: "28px", background: "#A3E635",
                  borderRadius: "8px", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "13px", flexShrink: 0
                }}>🎞️</div>
              )}
              <div style={{
                maxWidth: "82%",
                padding: isBot ? "12px 16px" : "10px 14px",
                borderRadius: isBot ? "4px 16px 16px 16px" : "16px 16px 4px 16px",
                background: isBot ? "#18181B" : "#A3E635",
                color: isBot ? "#D4D4D8" : "#09090B",
                fontSize: "14px", lineHeight: "1.65",
                border: isBot ? "1px solid rgba(255,255,255,0.05)" : "none",
                boxShadow: isBot ? "none" : "0 2px 12px rgba(163,230,53,0.15)",
                fontWeight: isBot ? "400" : "600"
              }}>
                {isBot
                  ? <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  : msg.content
                }
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", background: "#A3E635", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>🎞️</div>
            <div style={{ padding: "12px 16px", borderRadius: "4px 16px 16px 16px", background: "#18181B", border: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "4px", alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#A3E635", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {creditsOver && (
          <div style={{ textAlign: "center", padding: "24px", background: "#18181B", borderRadius: "16px", border: "1px solid rgba(163,230,53,0.12)" }}>
            <div style={{ fontSize: "30px", marginBottom: "10px" }}>🙏</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#A3E635" }}>Credits Over</div>
            <div style={{ fontSize: "13px", color: "#52525B", marginTop: "5px" }}>Call God Dramola for more</div>
          </div>
        )}

        <div ref={bottomRef} style={{ height: "130px" }} />
      </div>

      {/* Input */}
      <div style={{
        width: "100%", maxWidth: "660px",
        padding: "10px 20px 32px",
        position: "sticky", bottom: 0,
        background: "linear-gradient(to bottom, transparent, #09090B 35%)"
      }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={creditsOver ? "Credits over. Call God Dramola." : "Or just type what you are in the mood for..."}
            disabled={creditsOver}
            rows={1}
            style={{
              flex: 1, padding: "12px 16px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.07)",
              background: "#18181B",
              color: "#FAFAFA",
              fontSize: "14px", fontFamily: "inherit",
              resize: "none", outline: "none",
              lineHeight: "1.5", transition: "border-color 0.2s"
            }}
            onFocus={e => e.target.style.borderColor = "rgba(163,230,53,0.35)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim() || creditsOver}
            style={{
              width: "46px", height: "46px",
              borderRadius: "14px", border: "none",
              background: loading || !input.trim() || creditsOver ? "#27272A" : "#A3E635",
              color: loading || !input.trim() || creditsOver ? "#3F3F46" : "#09090B",
              fontSize: "18px", fontWeight: "700",
              cursor: loading || !input.trim() || creditsOver ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: !loading && input.trim() && !creditsOver ? "0 0 16px rgba(163,230,53,0.2)" : "none",
              transition: "all 0.2s"
            }}
          >↑</button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-6px); } }
        input[type=range]::-webkit-slider-thumb { appearance:none; width:14px; height:14px; border-radius:50%; background:#A3E635; cursor:pointer; box-shadow:0 0 8px rgba(163,230,53,0.3); }
        input[type=range]::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:#A3E635; cursor:pointer; border:none; }
        select option { background:#18181B; color:#E4E4E7; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#27272A; border-radius:2px; }
        textarea { overflow:hidden; }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );
}
