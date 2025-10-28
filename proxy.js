import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// ICS-feed URL van je openbare Google Calendar
const ICS_URL = "https://calendar.google.com/calendar/ical/df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727%40group.calendar.google.com/public/basic.ics";

// Proxy endpoint
app.get("/agenda.ics", async (req, res) => {
  try {
    console.log("Ophalen ICS-feed...");
    const response = await fetch(ICS_URL);
    if (!response.ok) throw new Error(`Fout bij ophalen ICS-feed: ${response.statusText}`);
    const text = await response.text();

    // Zet **CORS header expliciet** voor ALLE domeinen
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    res.send(text);
  } catch (err) {
    console.error("❌ Fout bij proxy:", err.message);
    res.status(500).send("Kon agenda niet laden.");
  }
});

app.listen(PORT, () =>
  console.log(`✅ ICS-proxy actief op port ${PORT}`)
);
