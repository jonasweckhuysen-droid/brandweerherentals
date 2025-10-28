// proxy.js — ICS-proxy voor Outlook Live kalender
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// ICS-feed URL van Outlook
const ICS_URL =
  "https://calendar.google.com/calendar/ical/df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727%40group.calendar.google.com/public/basic.ics";

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



