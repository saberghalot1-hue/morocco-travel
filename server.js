const express = require('express');
const path = require('path');
const { CosmosClient } = require('@azure/cosmos');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(__dirname));

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const databaseId = process.env.COSMOS_DATABASE || 'morocco';
const containerId = process.env.COSMOS_CONTAINER || 'monuments';

let container = null;
if (connectionString) {
  const client = new CosmosClient(connectionString);
  container = client.database(databaseId).container(containerId);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, cosmosConfigured: Boolean(container) });
});

app.get('/api/monuments', async (req, res) => {
  if (!container) {
    return res.status(500).json({ error: 'Cosmos DB not configured' });
  }
  try {
    const { resources } = await container.items.readAll().fetchAll();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
