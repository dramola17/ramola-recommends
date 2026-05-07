import { useState, useRef, useEffect } from "react";

const API_URL = "/api/chat";
const SYSTEM_PROMPT = `You are a sharp, knowledgeable movie recommendation assistant with exceptional taste. You know Indian streaming platforms inside out. You are "Ramola Recommends" — a curated movie recommendation bot made by Dramola.

YOUR PERSONALITY:
- Concise, direct, no fluff
- You treat the user like a fellow cinephile, not a casual viewer
- You remember everything they tell you in the conversation
- Never use em dashes in your responses. Use a colon or a simple space instead.

PRE-LOADED TASTE PROFILE (apply this as a baseline for all users):
- Loved movies: Gangs of Wasseypur, Andhadhun, Dune, The Dark Knight, Inception, Tumbbad, Parasite, Article 15, Zindagi Na Milegi Dobara, American Psycho, DevD (Abhay Deol), Aankhon Dekhi, Manorama Six Feet Under
- Loves: gripping story, strong characters, visual experience, emotional depth, dark and gritty, humour, morally complex characters, unconventional narratives
- Benchmark films: Zodiac (stays with you), The Man from Earth (mind-blowing), Argo (biopic/true story done right)
- Also loves: biopics, true story films, thought-provoking sci-fi like Project Hail Mary
- Does NOT want: heavy/depressing content, slow-burn arthouse

YOUR RULES:
1. When a user first arrives, ask only TWO quick questions:
   - What languages they are open to? (Hindi, English, South Indian, International)
   - Anything they absolutely do not want? (horror, heavy drama, slow arthouse, no subtitles, etc.)
   Then immediately ask: "What do you feel like watching today?"
   DO NOT ask about favourite movies or what they love. That is already baked in.

2. When the user asks for reccos without specifying a genre (or genre is "Any Genre"), IMMEDIATELY give 10 recommendations without asking any questions. Pick across genres based on the pre-loaded taste profile — thrillers, dark dramas, biopics, unconventional narratives, character-driven films. Sort them in decreasing IMDb order. Never ask the user to clarify genre when "Any Genre" is selected.

3. When the user sends a message like "Give me [Genre] on [Platform] with IMDb above [X]" treat that as a complete request and give results immediately.

4. Format recommendations based on platform filter:
   - If platform is "Any Platform": include platform name after each entry
   - If a specific platform is selected: DO NOT repeat the platform name after every entry
   Format with platform: **1. Movie/Show Name (Year)** | X.X IMDb | Platform Name
   Format without platform: **1. Movie/Show Name (Year)** | X.X IMDb

5. STRICTLY follow the IMDb minimum filter. Only recommend content AT OR ABOVE the selected IMDb rating. Do not fudge or round up ratings to meet the quota of 10.

6. If there are fewer than 10 results that genuinely meet the IMDb filter and other filters:
   - Give only the ones that qualify — do not pad with lower-rated content
   - Tell the user exactly how many you found
   - Say: "That's all I found within your filters. To see more, either lower your IMDb minimum, change the filters, or say Ramola for 5 more in decreasing IMDb order."

7. If the user says "Ramola": give exactly 5 NEW recommendations that have NOT been mentioned before in the conversation, in strictly decreasing IMDb order, starting just below the current IMDb minimum. Label them clearly as bonus picks below the threshold. Never repeat anything already recommended.

8. Respect the content type filter strictly:
   - "Movies Only": only films, no series
   - "Shows Only": only TV/web series, no films
   - "Any": mix of both

9. ALWAYS mention where to watch in India when platform is Any Platform. Platforms: Netflix, Prime Video, JioHotstar, SonyLIV, MUBI, Apple TV+, ZEE5, YouTube.

10. After giving recommendations, ask "Which of these have you seen? I'll swap those out!" and replace watched ones with fresh picks at the same IMDb threshold.

11. For true crime documentaries, warn that Netflix heavily favours series. Prioritise single films unless user says episodes are fine.

12. NEVER repeat a recommendation that has already been mentioned anywhere in the conversation, whether in the current list or any previous list. Track everything suggested and always give fresh picks only.

13. Vibe and tone: like a well-watched friend giving honest recs, not a formal assistant. Never use em dashes anywhere.

14. If you genuinely cannot find any more new recommendations that fit the filters and have not been mentioned before in the conversation — total dead end — say exactly this: "Haath jod raha hoon 🙏 Koi nahi bacha filters mein. Please change the IMDb limit or switch the genre/platform... tabhi aage badh sakte hain!"

15. When giving recommendations and no specific language is chosen, always give a healthy mix of Bollywood and Hollywood (and other international if relevant) — never give all Hollywood or all Bollywood. Aim for roughly 50-50 or 60-40 split. Only give language-specific recommendations if the user has explicitly asked for a particular language.`;

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "Hey! Welcome to Ramola Recommends. Curated picks, zero fluff, always with where to watch in India.\n\nSet your filters up top or just type below what you feel like watching!\n\nFor further customisation, tell me:\n\n1. Languages you're open to? (Hindi, English, South Indian, International or all?)\n2. Anything you absolutely don't want? (horror, sappy romance, slow arthouse, no subtitles, etc.)\n\nHappy watching!"
};

const GENRES = ["Any Genre", "Thriller / Mystery", "True Story / Biopic", "Sci-Fi", "Drama", "Dark / Gritty", "Action", "Comedy", "Feel-Good", "Horror", "Romance", "Crime", "Documentary", "Animation"];
const PLATFORMS = ["Any Platform", "Netflix", "Prime Video", "JioHotstar", "ZEE5", "MUBI", "Apple TV+", "YouTube"];
const CONTENT_TYPES = ["Any", "Movies Only", "Shows Only"];
const INDUSTRY = ["Any", "Bollywood", "Hollywood", "South Indian", "European", "Korean"];
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
  const [contentType, setContentType] = useState("Any");
  const [languages, setLanguages] = useState(["Any"]);
  const [imdb, setImdb] = useState(6.5);
  const [creditsOver, setCreditsOver] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function toggleLanguage(lang) {
    if (lang === "Any") {
      setLanguages(["Any"]);
      return;
    }
    setLanguages(prev => {
      const without = prev.filter(l => l !== "Any");
      if (without.includes(lang)) {
        const updated = without.filter(l => l !== lang);
        return updated.length === 0 ? ["Any"] : updated;
      }
      return [...without, lang];
    });
  }

  function buildUserText(raw) {
    const parts = [];
    if (genre !== "Any Genre") {
      parts.push(`Genre: ${genre}`);
    } else {
      parts.push(`Genre: Any — do NOT ask the user for genre, just immediately give 10 recommendations in decreasing IMDb order based on the pre-loaded taste profile`);
    }
    if (platform !== "Any Platform") {
      parts.push(`Platform: ${platform} (do not repeat platform name after each recommendation)`);
    } else {
      parts.push(`Platform: Any (include platform name after each recommendation)`);
    }
    if (contentType !== "Any") parts.push(`Content type: ${contentType}`);
    const selectedLangs = languages.filter(l => l !== "Any");
    if (selectedLangs.length > 0) {
      parts.push(`Languages: ${selectedLangs.join(", ")} only`);
    } else {
      parts.push(`Languages: Mix of Bollywood and Hollywood and other international`);
    }
    parts.push(`IMDb minimum: ${imdb} (strictly — do not include anything below this rating, sort results in decreasing IMDb order)`);
    return raw + ` [Filters: ${parts.join(", ")}]`;
  }

  async function sendMessage(overrideText) {
    const rawText = typeof overrideText === "string" ? overrideText : input.trim();
    if (!rawText || loading || creditsOver) return;

    setMessages(prev => [...prev, { role: "user", content: rawText }]);
    setInput("");
    setLoading(true);

    const historyForApi = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .concat([{ role: "user", content: buildUserText(rawText) }])
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          system: SYSTEM_PROMPT,
          messages: historyForApi
        })
      });

      if (res.status === 429 || res.status === 403) {
        setCreditsOver(true);
        setMessages(prev => [...prev, { role: "assistant", content: "Credits over. Call God Dramola for more!" }]);
        return;
      }

      const data = await res.json();
      const reply = data?.content?.[0]?.text || "Something went wrong. Try again!";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setCreditsOver(true);
      setMessages(prev => [...prev, { role: "assistant", content: "Credits over. Call God Dramola for more!" }]);
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
    const c = contentType !== "Any" ? `, ${contentType}` : "";
    const l = !languages.includes("Any") ? `, ${languages.join(" + ")}` : "";
    sendMessage(`Give me reccos${g ? ": " + g : ""}${p ? " " + p : ""}${c}${l}`);
  }

  const imdbColor = imdb >= 8 ? "#A3E635" : imdb >= 7 ? "#FACC15" : "#71717A";
  const imdbBg = imdb >= 8 ? "rgba(163,230,53,0.1)" : imdb >= 7 ? "rgba(250,204,21,0.1)" : "rgba(113,113,122,0.1)";
  const reccoLabel = `Get Reccos${genre !== "Any Genre" ? "  ·  " + genre : ""}${platform !== "Any Platform" ? "  ·  " + platform : ""}${contentType !== "Any" ? "  ·  " + contentType : ""}${!languages.includes("Any") ? "  ·  " + languages.join("+") : ""}`;

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      background: "#09090B", height: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", color: "#FAFAFA", overflow: "hidden"
    }}>
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "500px", height: "200px",
        background: "radial-gradient(ellipse, rgba(163,230,53,0.05) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0
      }} />

      {/* Header */}
      <div style={{
        width: "100%", maxWidth: "660px", padding: "24px 20px 0",
        flexShrink: 0, background: "rgba(9,9,11,0.9)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.05)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{
            width: "36px", height: "36px", background: "#A3E635",
            borderRadius: "10px", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "17px",
            boxShadow: "0 0 20px rgba(163,230,53,0.2)"
          }}>🎞️</div>
          <div>
            <div style={{ fontSize: "17px", fontWeight: "700", letterSpacing: "-0.4px" }}>Ramola Recommends</div>
            <div style={{ fontSize: "11px", color: "#52525B", marginTop: "1px" }}>Curated picks · India streaming</div>
          </div>
        </div>

        <div style={{
          background: "#18181B", borderRadius: "14px",
          padding: "12px", marginBottom: "10px",
          border: "1px solid rgba(255,255,255,0.06)"
        }}>
          {/* Row 1: Genre + Platform + Type */}
          <div style={{ display: "flex", gap: "7px", marginBottom: "9px" }}>
            {[
              { label: "Genre", value: genre, setter: setGenre, options: GENRES },
              { label: "Platform", value: platform, setter: setPlatform, options: PLATFORMS }
            ].map(({ label, value, setter, options }) => (
              <div key={label} style={{ flex: 1 }}>
                <label style={{ fontSize: "9px", fontWeight: "600", color: "#52525B", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "4px" }}>{label}</label>
                <div style={{ position: "relative" }}>
                  <select value={value} onChange={e => setter(e.target.value)} style={{
                    width: "100%", padding: "6px 20px 6px 9px",
                    borderRadius: "9px", border: "1px solid",
                    borderColor: value !== options[0] ? "rgba(163,230,53,0.35)" : "rgba(255,255,255,0.07)",
                    background: value !== options[0] ? "rgba(163,230,53,0.07)" : "#09090B",
                    color: value !== options[0] ? "#A3E635" : "#71717A",
                    fontSize: "12px", fontWeight: "500",
                    outline: "none", cursor: "pointer",
                    appearance: "none", fontFamily: "inherit", transition: "all 0.2s"
                  }}>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <span style={{ position: "absolute", right: "7px", top: "50%", transform: "translateY(-50%)", color: "#3F3F46", fontSize: "9px", pointerEvents: "none" }}>▾</span>
                </div>
              </div>
            ))}
            <div style={{ minWidth: "85px" }}>
              <label style={{ fontSize: "9px", fontWeight: "600", color: "#52525B", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "4px" }}>Type</label>
              <div style={{ position: "relative" }}>
                <select value={contentType} onChange={e => setContentType(e.target.value)} style={{
                  width: "100%", padding: "6px 20px 6px 9px",
                  borderRadius: "9px", border: "1px solid",
                  borderColor: contentType !== "Any" ? "rgba(163,230,53,0.35)" : "rgba(255,255,255,0.07)",
                  background: contentType !== "Any" ? "rgba(163,230,53,0.07)" : "#09090B",
                  color: contentType !== "Any" ? "#A3E635" : "#71717A",
                  fontSize: "12px", fontWeight: "500",
                  outline: "none", cursor: "pointer",
                  appearance: "none", fontFamily: "inherit", transition: "all 0.2s"
                }}>
                  {CONTENT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <span style={{ position: "absolute", right: "7px", top: "50%", transform: "translateY(-50%)", color: "#3F3F46", fontSize: "9px", pointerEvents: "none" }}>▾</span>
              </div>
            </div>
          </div>

          {/* Language pills */}
          <div style={{ marginBottom: "9px" }}>
            <label style={{ fontSize: "9px", fontWeight: "600", color: "#52525B", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "5px" }}>Language</label>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {LANGUAGES.map(lang => {
                const isSelected = languages.includes(lang);
                return (
                  <button key={lang} onClick={() => toggleLanguage(lang)} style={{
                    padding: "3px 10px", borderRadius: "20px", border: "1px solid",
                    borderColor: isSelected ? "rgba(163,230,53,0.5)" : "rgba(255,255,255,0.07)",
                    background: isSelected ? "rgba(163,230,53,0.12)" : "transparent",
                    color: isSelected ? "#A3E635" : "#52525B",
                    fontSize: "11px", fontWeight: isSelected ? "600" : "400",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s"
                  }}>{lang}</button>
                );
              })}
            </div>
          </div>

          {/* IMDb slider */}
          <div style={{ marginBottom: "9px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <label style={{ fontSize: "9px", fontWeight: "600", color: "#52525B", textTransform: "uppercase", letterSpacing: "0.07em" }}>IMDb Minimum</label>
              <span style={{ fontSize: "11px", fontWeight: "700", color: imdbColor, background: imdbBg, padding: "2px 7px", borderRadius: "6px", transition: "all 0.3s" }}>
                {imdb.toFixed(1)} ★
              </span>
            </div>
            <input type="range" min="0" max="10" step="0.1" value={imdb}
              onChange={e => setImdb(parseFloat(e.target.value))}
              style={{
                width: "100%", height: "3px", appearance: "none",
                background: `linear-gradient(to right, ${imdbColor} 0%, ${imdbColor} ${imdb * 10}%, #27272A ${imdb * 10}%, #27272A 100%)`,
                borderRadius: "2px", outline: "none", cursor: "pointer", transition: "background 0.2s"
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
              {[0, 2, 4, 6, 8, 10].map(n => <span key={n} style={{ fontSize: "8px", color: "#3F3F46" }}>{n}</span>)}
            </div>
          </div>

          <button onClick={handleQuickRecco} disabled={loading || creditsOver} style={{
            width: "100%", padding: "9px", borderRadius: "10px", border: "none",
            background: creditsOver ? "#27272A" : loading ? "rgba(163,230,53,0.25)" : "#A3E635",
            color: creditsOver ? "#3F3F46" : loading ? "#A3E635" : "#09090B",
            fontSize: "12px", fontWeight: "700",
            cursor: loading || creditsOver ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            boxShadow: !loading && !creditsOver ? "0 0 20px rgba(163,230,53,0.15)" : "none",
            transition: "all 0.2s",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
          }}>
            {loading ? "Finding picks..." : creditsOver ? "Credits over. Call God Dramola." : reccoLabel}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        width: "100%", maxWidth: "660px", flex: 1, overflowY: "auto",
        padding: "14px 20px", display: "flex", flexDirection: "column", gap: "12px",
        position: "relative", zIndex: 1
      }}>
        {messages.map((msg, i) => {
          const isBot = msg.role === "assistant";
          return (
            <div key={i} style={{
              display: "flex",
              justifyContent: isBot ? "flex-start" : "flex-end",
              alignItems: "flex-end", gap: "8px", animation: "fadeIn 0.2s ease"
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
        <div ref={bottomRef} style={{ height: "8px" }} />
      </div>

      {/* Input */}
      <div style={{
        width: "100%", maxWidth: "660px", padding: "8px 20px 24px", flexShrink: 0,
        background: "linear-gradient(to bottom, transparent, #09090B 30%)"
      }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={creditsOver ? "Credits over. Call God Dramola." : "Or just type what you are in the mood for..."}
            disabled={creditsOver} rows={1}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.07)",
              background: "#18181B", color: "#FAFAFA",
              fontSize: "14px", fontFamily: "inherit",
              resize: "none", outline: "none",
              lineHeight: "1.5", transition: "border-color 0.2s"
            }}
            onFocus={e => e.target.style.borderColor = "rgba(163,230,53,0.35)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim() || creditsOver} style={{
            width: "46px", height: "46px", borderRadius: "14px", border: "none",
            background: loading || !input.trim() || creditsOver ? "#27272A" : "#A3E635",
            color: loading || !input.trim() || creditsOver ? "#3F3F46" : "#09090B",
            fontSize: "18px", fontWeight: "700",
            cursor: loading || !input.trim() || creditsOver ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: !loading && input.trim() && !creditsOver ? "0 0 16px rgba(163,230,53,0.2)" : "none",
            transition: "all 0.2s"
          }}>↑</button>
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
