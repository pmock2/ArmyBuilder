const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { validateRoster, BATTLE_SIZE_LIMITS } = require('./validator');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const dataDir = path.join(__dirname, 'data');
const factionsDir = path.join(dataDir, 'factions');
const keywordsPath = path.resolve(__dirname, '..', 'keywords.json');

// 1. Get All Playable Factions Index
app.get('/api/factions', (req, res) => {
  const indexPath = path.join(dataDir, 'factions_index.json');
  if (!fs.existsSync(indexPath)) {
    return res.status(500).json({ error: 'Factions index not found. Run "npm run index" first.' });
  }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  res.json(index);
});

// 2. Get Specific Faction Details
app.get('/api/factions/:id', (req, res) => {
  const factionId = req.params.id.toLowerCase();
  const filePath = path.join(factionsDir, `${factionId}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Faction '${factionId}' not found.` });
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  res.json(data);
});

// 3. Get Keywords Compendium
app.get('/api/keywords', (req, res) => {
  if (!fs.existsSync(keywordsPath)) {
    return res.status(500).json({ error: 'Keywords compendium not found.' });
  }
  const data = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
  res.json(data);
});

// 4. Validate Roster
app.post('/api/validate', (req, res) => {
  try {
    const { roster, factionData } = req.body;
    if (!roster) {
      return res.status(400).json({ error: 'Roster payload is required.' });
    }
    const result = validateRoster(roster, factionData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Battle Size Definitions
app.get('/api/battle-sizes', (req, res) => {
  res.json(BATTLE_SIZE_LIMITS);
});

// 6. Serve Frontend Static in Production
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Warhammer 40k 11e Army Builder Server running on http://localhost:${PORT}`);
});
