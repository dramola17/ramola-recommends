export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const bodyWithTools = {
      ...req.body,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search"
        }
      ]
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(bodyWithTools)
    });

    const data = await response.json();

    const bodyText = JSON.stringify(req.body);
    const imdbMatch = bodyText.match(/IMDb minimum: (\d+(\.\d+)?)/);
    const imdbMin = imdbMatch ? parseFloat(imdbMatch[1]) : 0;

    if (imdbMin > 0 && data?.content) {
      const textBlock = data.content.find(b => b.type === "text");
      if (textBlock) {
        const lines = textBlock.text.split("\n");
        const filtered = lines.filter(line => {
          const ratingMatch = line.match(/(\d+\.\d+)\s*IMDb/i);
          if (ratingMatch) {
            return parseFloat(ratingMatch[1]) >= imdbMin;
          }
          return true;
        });
        textBlock.text = filtered.join("\n");
      }
    }

    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
}
