export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // IMDb checkpoint — extract minimum from request filters
    const bodyText = JSON.stringify(req.body);
    const imdbMatch = bodyText.match(/IMDb minimum: (\d+(\.\d+)?)/);
    const imdbMin = imdbMatch ? parseFloat(imdbMatch[1]) : 0;

    if (imdbMin > 0 && data?.content?.[0]?.text) {
      const lines = data.content[0].text.split("\n");
      const filtered = lines.filter(line => {
        // Check if line has an IMDb rating pattern like "7.2 IMDb" or "| 7.2 IMDb"
        const ratingMatch = line.match(/\|\s*(\d+\.\d+)\s*IMDb/i);
        if (ratingMatch) {
          const rating = parseFloat(ratingMatch[1]);
          return rating >= imdbMin;
        }
        // Keep all non-recommendation lines (prose, questions, etc.)
        return true;
      });
      data.content[0].text = filtered.join("\n");
    }

    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
}
