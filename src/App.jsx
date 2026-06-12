import { useState, useRef, useEffect } from "react";

const API_URL = "/api/chat";
const SYSTEM_PROMPT = `You are a sharp, knowledgeable movie recommendation assistant with exceptional taste. You know Indian streaming platforms inside out. You are "Ramola Recommends" — a curated movie recommendation bot made by Dramola.

YOUR PERSONALITY:
- Concise, direct, no fluff
- You treat the user like a fellow cinephile, not a casual viewer
- You remember everything they tell you in the conversation
- Never use em dashes in your responses. Use a colon or a simple space instead.

PRE-LOADED TASTE PROFILE (apply this as a baseline for all users):
- Loved movies and shows: Gangs of Wasseypur, Andhadhun, Dune, The Dark Knight, Inception, Tumbbad, Parasite, Article 15, Zindagi Na Milegi Dobara, American Psycho, DevD (Abhay Deol), Aankhon Dekhi, Manorama Six Feet Under, Ed Gein (Netflix), Ted Lasso (Apple TV+), Shrinking (Apple TV+), Shogun (JioHotstar), Presumed Innocent, M. Night Shyamalan films, Jim Carrey films, Christian Bale films
- Loves: gripping story, strong characters, visual experience, emotional depth, dark and gritty, humour, morally complex characters, unconventional narratives, psychological thrillers, feel-good workplace comedies, prestige TV dramas, slow burn mysteries
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

5. STRICTLY follow the IMDb minimum filter. Only recommend content AT OR ABOVE the selected IMDb rating. Do not fudge or round up ratings to meet the quota of 10. Never include a title and then say it "dips under" the threshold — if it is below the threshold, do not mention it at all.

6. If there are fewer than 10 results that genuinely meet the IMDb filter and other filters:
   - Give only the ones that qualify — do not pad with lower-rated content
   - Tell the user exactly how many you found
   - Say: "That's all I found within your filters. To see more, either lower your IMDb minimum, change the filters, or say Ramola for 5 more in decreasing IMDb order."

7. If the user says "Ramola": give exactly 5 NEW recommendations that have NOT been mentioned before in the conversation, in strictly decreasing IMDb order, starting just below the current IMDb minimum. Label them clearly as bonus picks below the threshold. Never repeat anything already recommended.

8. Respect the content type filter strictly:
   - "Movies Only": only films, no series
   - "Shows Only": only TV/web series, no films
   - "Any": mix of both. When "Any" is selected, prefix each entry with [Movie] or [Show]

9. ALWAYS mention where to watch in India when platform is Any Platform. Platforms: Netflix, Prime Video, JioHotstar, SonyLIV, MUBI, Apple TV+, ZEE5.

10. After giving recommendations, ask "Which of these have you seen? I'll swap those out!" and replace watched ones with fresh picks at the same IMDb threshold.

11. For true crime documentaries, warn that Netflix heavily favours series. Prioritise single films unless user says episodes are fine.

12. NEVER repeat a recommendation that has already been mentioned anywhere in the conversation, whether in the current list or any previous list. Track everything suggested and always give fresh picks only.

13. Vibe and tone: like a well-watched friend giving honest recs, not a formal assistant. Never use em dashes anywhere.

14. If you genuinely cannot find any more new recommendations that fit the filters and have not been mentioned before in the conversation — total dead end — say exactly this: "Haath jod raha hoon 🙏 Koi nahi bacha filters mein. Please change the IMDb limit or switch the genre/platform... tabhi aage badh sakte hain!"

15. When giving recommendations and no specific language is chosen, always give a healthy mix of Bollywood and Hollywood (and other international if relevant) — never give all Hollywood or all Bollywood. Aim for roughly 50-50 or 60-40 split. Only give language-specific recommendations if the user has explicitly asked for a particular language.

16. For MUBI specifically, always add a disclaimer after recommendations: "Note: MUBI rotates its catalogue monthly — please verify these are currently available on MUBI India before watching."

17. ONLY recommend content that is confirmed available to stream in India. Never recommend something that is not accessible on Indian streaming platforms. If unsure about Indian availability, skip it and pick something you are confident about. Always think: "Can someone in India watch this right now?"

18. If the user asks for recommendations by a specific actor, director, city, or location — treat it as a valid recco request. Search your knowledge for content matching that criteria, apply all active filters, and only recommend titles you are confident are available in India.

19. Before finalising any recommendation, think like a Reddit cinephile on r/india, r/bollywood, or r/flicks would — would they rate this pick highly? Only include recommendations that would get upvotes, not ones that would get called out as lazy suggestions.

20. If the user asks anything completely unrelated to movies, shows, or entertainment — like coding questions, life advice, or random topics — respond with exactly this and nothing else: "Tokens tera baap chod kar gaya tha ya teri maa? 🙏"

21. If the user asks for recommendations by a specific actor, director, city, or location, treat it as a valid recco request and give results immediately.`;

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "Hey! Welcome to Ramola Recommends. Curated picks, zero fluff, always with where to watch in India.\n\nSet your filters up top or just type below what you feel like watching!\n\nFor further customisation, tell me:\n\n1. Languages you're open to? (Hindi, English, South Indian, International or all?)\n2. Anything you absolutely don't want? (horror, sappy romance, slow arthouse, no subtitles, etc.)\n\nHappy watching!"
};

const GENRES = ["Any Genre", "Thriller / Mystery", "True Story / Biopic", "Sci-Fi", "Drama", "Dark / Gritty", "Action", "Comedy", "Feel-Good", "Horror", "Romance", "Crime", "Documentary", "Animation"];
const PLATFORMS = ["Any Platform", "Netflix", "Prime Video", "JioHotstar", "ZEE5", "MUBI", "Apple TV+", "SonyLIV"];
const CONTENT_TYPES = ["Any", "Movies Only", "Shows Only"];
const INDUSTRY = ["Any", "Bollywood", "Hollywood", "South Indian", "European", "Korean"];

function formatMessage(text) {
  let f = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  f = f.split("\n").map(line =>
    line.trim() === "" ? "<br/>" : `<span style="display:block;margin-bottom:4px">${line}</span>`
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
    if (lang === "Any") { setLanguages(["Any"]); return; }
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
    else parts.push(`Content type: Any (prefix each rec with [Movie] or [Show])`);
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
          model: "claude-sonnet-4-6",
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
      const textBlock = data?.content?.find(b => b.type === "text");
      const reply = textBlock?.text || data?.content?.[0]?.text || "Something went wrong. Try again!";
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

  const reccoLabel = `▶  Roll the Reccos${genre !== "Any Genre" ? "  ·  " + genre : ""}${platform !== "Any Platform" ? "  ·  " + platform : ""}${contentType !== "Any" ? "  ·  " + contentType : ""}${!languages.includes("Any") ? "  ·  " + languages.join("+") : ""}`;

  const FilmStrip = () => (
    <div style={{ width: "100%", background: "#111", padding: "10px 0", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        {Array(20).fill(0).map((_, i) => (
          <div key={i} style={{ width: "9px", height: "7px", background: "#F4F2ED", borderRadius: "1px", flexShrink: 0 }} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      fontFamily: "Georgia,'Times New Roman',serif",
      background: "#F4F2ED",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      color: "#1A1A18",
      overflow: "hidden"
    }}>

      {/* Header — poster style */}
      <div style={{ width: "100%", flexShrink: 0, order: -1 }}>
        <FilmStrip />
        <div style={{
          width: "100%",
          background: "#1A1A18",
          padding: "28px 20px 24px",
          textAlign: "center",
          borderBottom: "4px solid #8B0000"
        }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.5em", color: "#C9A961", fontFamily: "'Courier New',monospace", marginBottom: "10px" }}>★ ★ ★ ★ ★</div>
          <div style={{ fontSize: "10px", letterSpacing: "0.4em", color: "#F4F2ED", textTransform: "uppercase", fontFamily: "'Courier New',monospace", marginBottom: "8px", opacity: 0.6 }}>Dramola Pictures Presents</div>
          <div style={{ fontSize: "36px", fontWeight: "bold", color: "#F4F2ED", textTransform: "uppercase", fontFamily: "Georgia,serif", textShadow: "3px 3px 0 #8B0000", lineHeight: 1.05 }}>
            Ramola<br />Recommends
          </div>
          <div style={{ margin: "12px auto 0", width: "180px", height: "1px", background: "linear-gradient(to right, transparent, #C9A961, transparent)" }} />
          <div style={{ fontSize: "9px", color: "#666", marginTop: "10px", fontFamily: "'Courier New',monospace", letterSpacing: "0.25em" }}>NOW SHOWING · CURATED PICKS · INDIA STREAMING</div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ width: "100%", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Filter panel */}
        <div style={{ width: "100%", maxWidth: "640px", padding: "20px 20px 0" }}>
          <div style={{
            background: "#FFFDF8",
            border: "1.5px solid #1A1A18",
            padding: "16px",
            boxShadow: "5px 5px 0 #1A1A18"
          }}>
            <div style={{ textAlign: "center", fontSize: "9px", letterSpacing: "0.3em", color: "#8B0000", fontFamily: "'Courier New',monospace", fontWeight: "bold", marginBottom: "12px", textTransform: "uppercase" }}>— Select Your Screening —</div>

            {/* Genre + Platform + Type */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {[
                { label: "Genre", value: genre, setter: setGenre, options: GENRES },
                { label: "Platform", value: platform, setter: setPlatform, options: PLATFORMS }
              ].map(({ label, value, setter, options }) => (
                <div key={label} style={{ flex: 1 }}>
                  <div style={{ fontSize: "8px", letterSpacing: "0.15em", color: "#999", textTransform: "uppercase", fontFamily: "'Courier New',monospace", marginBottom: "4px" }}>{label}</div>
                  <select value={value} onChange={e => setter(e.target.value)} style={{
                    width: "100%", padding: "7px 10px",
                    border: `1px solid ${value !== options[0] ? "#8B0000" : "#CCC9C0"}`,
                    background: value !== options[0] ? "#FFF8F8" : "#FFFDF8",
                    color: value !== options[0] ? "#8B0000" : "#888",
                    fontSize: "12px", fontFamily: "Georgia,serif",
                    fontStyle: value !== options[0] ? "italic" : "normal",
                    outline: "none", cursor: "pointer"
                  }}>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ minWidth: "85px" }}>
                <div style={{ fontSize: "8px", letterSpacing: "0.15em", color: "#999", textTransform: "uppercase", fontFamily: "'Courier New',monospace", marginBottom: "4px" }}>Type</div>
                <select value={contentType} onChange={e => setContentType(e.target.value)} style={{
                  width: "100%", padding: "7px 10px",
                  border: `1px solid ${contentType !== "Any" ? "#8B0000" : "#CCC9C0"}`,
                  background: contentType !== "Any" ? "#FFF8F8" : "#FFFDF8",
                  color: contentType !== "Any" ? "#8B0000" : "#888",
                  fontSize: "12px", fontFamily: "Georgia,serif",
                  outline: "none", cursor: "pointer"
                }}>
                  {CONTENT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Industry pills */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "8px", letterSpacing: "0.15em", color: "#999", textTransform: "uppercase", fontFamily: "'Courier New',monospace", marginBottom: "6px" }}>Industry</div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {INDUSTRY.map(lang => {
                  const isSelected = languages.includes(lang);
                  return (
                    <button key={lang} onClick={() => toggleLanguage(lang)} style={{
                      padding: "3px 12px",
                      border: `1px solid ${isSelected ? "#1A1A18" : "#CCC9C0"}`,
                      background: isSelected ? "#1A1A18" : "transparent",
                      color: isSelected ? "#FFFDF8" : "#999",
                      fontSize: "10px", fontFamily: "'Courier New',monospace",
                      letterSpacing: "0.08em", cursor: "pointer",
                      transition: "all 0.15s"
                    }}>{lang.toUpperCase()}</button>
                  );
                })}
              </div>
            </div>

            {/* IMDb slider */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ fontSize: "8px", letterSpacing: "0.15em", color: "#999", textTransform: "uppercase", fontFamily: "'Courier New',monospace" }}>IMDb Minimum</div>
                <span style={{ fontSize: "13px", fontWeight: "bold", color: "#8B0000", fontFamily: "'Courier New',monospace" }}>★ {imdb.toFixed(1)}</span>
              </div>
              <input type="range" min="0" max="10" step="0.1" value={imdb}
                onChange={e => setImdb(parseFloat(e.target.value))}
                style={{
                  width: "100%", height: "3px", appearance: "none",
                  background: `linear-gradient(to right, #8B0000 0%, #8B0000 ${imdb * 10}%, #E0DDD4 ${imdb * 10}%, #E0DDD4 100%)`,
                  outline: "none", cursor: "pointer"
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
                {[0, 2, 4, 6, 8, 10].map(n => <span key={n} style={{ fontSize: "8px", color: "#BBB", fontFamily: "'Courier New',monospace" }}>{n}</span>)}
              </div>
            </div>

            <button onClick={handleQuickRecco} disabled={loading || creditsOver} style={{
              width: "100%", padding: "12px",
              border: "none",
              background: creditsOver ? "#888" : loading ? "#C0564A" : "#8B0000",
              color: "#FFFDF8",
              fontSize: "11px", fontFamily: "'Courier New',monospace",
              fontWeight: "bold", letterSpacing: "0.2em",
              cursor: loading || creditsOver ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
            }}>
              {loading ? "LOADING THE REEL..." : creditsOver ? "CREDITS OVER. CALL GOD DRAMOLA." : reccoLabel}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ width: "100%", maxWidth: "640px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {messages.map((msg, i) => {
            const isBot = msg.role === "assistant";
            return (
              <div key={i} style={{
                display: "flex",
                justifyContent: isBot ? "flex-start" : "flex-end",
                alignItems: "flex-end", gap: "10px",
                animation: "fadeIn 0.2s ease"
              }}>
                {isBot && (
                  <div style={{
                    width: "32px", height: "32px", background: "#8B0000",
                    borderRadius: "50%", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "14px", flexShrink: 0,
                    border: "2px solid #1A1A18"
                  }}>🎬</div>
                )}
                <div style={{
                  maxWidth: "82%",
                  padding: isBot ? "13px 17px" : "10px 15px",
                  background: isBot ? "#FFFDF8" : "#1A1A18",
                  color: isBot ? "#1A1A18" : "#FFFDF8",
                  fontSize: "14px", lineHeight: "1.7",
                  fontFamily: "Georgia,serif",
                  border: isBot ? "1px solid #1A1A18" : "none",
                  boxShadow: isBot ? "3px 3px 0 rgba(26,26,24,0.12)" : "none",
                  borderRadius: isBot ? "2px 12px 12px 12px" : "12px 12px 2px 12px"
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
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", background: "#8B0000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", border: "2px solid #1A1A18" }}>🎬</div>
              <div style={{ padding: "13px 17px", background: "#FFFDF8", border: "1px solid #1A1A18", boxShadow: "3px 3px 0 rgba(26,26,24,0.12)", display: "flex", gap: "5px", alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8B0000", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {creditsOver && (
            <div style={{ textAlign: "center", padding: "24px", background: "#FFFDF8", border: "1.5px solid #1A1A18", boxShadow: "4px 4px 0 #1A1A18" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>🙏</div>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#8B0000", fontFamily: "'Courier New',monospace", letterSpacing: "0.1em" }}>CREDITS OVER</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px", fontFamily: "'Courier New',monospace" }}>Call God Dramola for more</div>
            </div>
          )}

          <div ref={bottomRef} style={{ height: "8px" }} />
        </div>

        {/* Input */}
        <div style={{ width: "100%", maxWidth: "640px", padding: "0 20px 16px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={creditsOver ? "Credits over. Call God Dramola." : "Or just type what you are in the mood for..."}
              disabled={creditsOver} rows={1}
              style={{
                flex: 1, padding: "12px 14px",
                border: "1.5px solid #1A1A18",
                background: "#FFFDF8", color: "#1A1A18",
                fontSize: "14px", fontFamily: "Georgia,serif",
                fontStyle: "italic", resize: "none", outline: "none",
                lineHeight: "1.5", transition: "border-color 0.2s"
              }}
              onFocus={e => e.target.style.borderColor = "#8B0000"}
              onBlur={e => e.target.style.borderColor = "#1A1A18"}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim() || creditsOver} style={{
              width: "48px", height: "46px",
              border: "none",
              background: loading || !input.trim() || creditsOver ? "#CCC9C0" : "#8B0000",
              color: "#FFFDF8", fontSize: "18px",
              cursor: loading || !input.trim() || creditsOver ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.2s"
            }}>→</button>
          </div>
        </div>

        {/* Bottom film strip + credits */}
        <div style={{ width: "100%", background: "#111", padding: "10px 0 8px", marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
            {Array(20).fill(0).map((_, i) => (
              <div key={i} style={{ width: "9px", height: "7px", background: "#F4F2ED", borderRadius: "1px", flexShrink: 0 }} />
            ))}
          </div>
          <div style={{ textAlign: "center", fontSize: "9px", color: "#555", fontFamily: "'Courier New',monospace", letterSpacing: "0.3em" }}>
            A DRAMOLA PRODUCTION · EST. 2026
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-6px); } }
        input[type=range]::-webkit-slider-thumb { appearance:none; width:14px; height:14px; border-radius:50%; background:#8B0000; cursor:pointer; border:2px solid #FFFDF8; box-shadow:0 0 0 1px #8B0000; }
        input[type=range]::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:#8B0000; cursor:pointer; border:2px solid #FFFDF8; }
        select option { background:#FFFDF8; color:#1A1A18; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#CCC9C0; border-radius:2px; }
        textarea { overflow:hidden; }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );
}
