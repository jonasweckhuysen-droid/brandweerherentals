// proxy.js — simpele ICS-proxy voor Outlook
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000; // kies een poort

// ICS-feed URL van Outlook
const ICS_URL = "https://outlook.live.com/owa/calendar/00000000-0000-0000-0000-000000000000/e5cc3b0e-7304-4c1c-94eb-3974df154403/cid-7FF1D857A9BC86AF/calendar.ics";

// Proxy endpoint
app.get("/agenda.ics", async (req, res) => {
  try {
    const response = await fetch(ICS_URL);
    if (!response.ok) throw new Error("Fout bij ophalen ICS-feed");
    const text = await response.text();
    res.setHeader("Content-Type", "text/calendar");
    res.send(text);
  } catch (err) {
    console.error(err);
    res.status(500).send("Kon agenda niet laden");
  }
});

app.listen(PORT, () => console.log(`ICS-proxy draait op http://localhost:${PORT}/agenda.ics`));


