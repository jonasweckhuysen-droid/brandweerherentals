// proxy.js — ICS-proxy voor Outlook Live kalender
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// ICS-feed URL van Outlook
const ICS_URL =
  "https://calendar.google.com/calendar/u/0?cid=ZGYyZmEzNmZiOGVhNDA0NGY4Mjc2Y2YyMGQ5OTIyZDZjMzUwZTdmNzYwNGJiNWFkNGE1MzUyMTMyNGY3ODcyN0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t";

// CORS toelaten zodat werken.html dit mag ophalen
app.use(cors());

// Proxy endpoint
app.get("/agenda.ics", async (req, res) => {
  try {
    console.log("Ophalen ICS-feed...");
    const response = await fetch(ICS_URL);

    if (!response.ok) {
      throw new Error(`Fout bij ophalen ICS-feed: ${response.statusText}`);
    }

    const text = await response.text();

    // Zet juiste headers
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    // Stuur ICS-inhoud door
    res.send(text);
  } catch (err) {
    console.error("❌ Fout bij proxy:", err.message);
    res.status(500).send("Kon agenda niet laden — controleer of de ICS-link publiek toegankelijk is.");
  }
});

app.listen(PORT, () =>
  console.log(`✅ ICS-proxy actief op http://localhost:${PORT}/agenda.ics`)
);


