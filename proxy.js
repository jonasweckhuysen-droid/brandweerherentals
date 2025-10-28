// proxy.js — simpele ICS-proxy voor Outlook
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000; // kies een poort

// ICS-feed URL van Outlook
const ICS_URL = "https://outlook.office365.com/owa/calendar/8a2b99e533cc4de49da60ef221300ac3@brandweerzonekempen.be/52f46cccb1a846aab7a79ff1a8d37a9513138115846516051108/calendar.ics";

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

