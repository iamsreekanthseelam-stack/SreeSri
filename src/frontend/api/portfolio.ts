import { put, list } from "@vercel/blob";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const filename = "Portfolio.json";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const { blobs } = await list();
      const portfolioBlob = blobs.find((b) => b.pathname === filename);
      if (!portfolioBlob) {
        return res.status(404).json({ error: "File not found" });
      }
      const response = await fetch(portfolioBlob.url);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error("Fetch Error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  if (req.method === "POST") {
    try {
      const blob = await put(filename, JSON.stringify(req.body), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });
      return res.status(200).json({ success: true, url: blob.url });
    } catch (err) {
      console.error("Save error:", err);
      return res.status(500).json({ error: "Save failed" });
    }
  }

  return res.status(405).end();
}
