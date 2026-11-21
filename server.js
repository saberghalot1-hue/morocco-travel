const express = require('express');
const path = require('path');
const { CosmosClient } = require('@azure/cosmos');
const { BlobServiceClient } = require('@azure/storage-blob');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Cosmos DB
const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING;
const databaseId = process.env.COSMOS_DATABASE || 'morocco';
const containerId = process.env.COSMOS_CONTAINER || 'monuments';
let container = null;
if (cosmosConnectionString) {
  const client = new CosmosClient(cosmosConnectionString);
  container = client.database(databaseId).container(containerId);
}

// Blob Storage
const storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const storageContainerName = process.env.AZURE_STORAGE_CONTAINER || 'uploads';
let blobContainerClient = null;
if (storageConnectionString) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
  blobContainerClient = blobServiceClient.getContainerClient(storageContainerName);
}

// AI Vision
const visionEndpoint = (process.env.VISION_ENDPOINT || '').replace(/\/$/, '');
const visionKey = process.env.VISION_KEY || '';

// Translator
const translatorEndpoint = (process.env.TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com').replace(/\/$/, '');
const translatorKey = process.env.TRANSLATOR_KEY || '';
const translatorRegion = process.env.TRANSLATOR_REGION || '';

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    cosmosConfigured: Boolean(container),
    blobConfigured: Boolean(blobContainerClient),
    visionConfigured: Boolean(visionEndpoint && visionKey),
    translatorConfigured: Boolean(translatorKey && translatorRegion),
  });
});

app.get('/api/monuments', async (req, res) => {
  if (!container) return res.status(500).json({ error: 'Cosmos DB not configured' });
  try {
    const { resources } = await container.items.readAll().fetchAll();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    if (!visionEndpoint || !visionKey) {
      return res.status(500).json({ error: 'Vision not configured' });
    }
    const { image } = req.body; // data URL or base64
    if (!image) return res.status(400).json({ error: 'Missing image' });

    const base64 = image.includes(',') ? image.split(',')[1] : image;
    const buffer = Buffer.from(base64, 'base64');

    const url = `${visionEndpoint}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=caption,tags,read`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': visionKey,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/translate', async (req, res) => {
  try {
    if (!translatorKey || !translatorRegion) {
      return res.status(500).json({ error: 'Translator not configured' });
    }
    const { text, to = 'en', from } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const params = new URLSearchParams({ 'api-version': '3.0', to });
    if (from) params.set('from', from);

    const response = await fetch(`${translatorEndpoint}/translate?${params}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': translatorKey,
        'Ocp-Apim-Subscription-Region': translatorRegion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ Text: text }]),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', async (req, res) => {
  try {
    if (!blobContainerClient) {
      return res.status(500).json({ error: 'Blob Storage not configured' });
    }
    const { fileName, dataUrl } = req.body;
    if (!fileName || !dataUrl) return res.status(400).json({ error: 'Missing fileName or dataUrl' });

    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid dataUrl' });

    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const blockBlobClient = blobContainerClient.getBlockBlobClient(safeName);
    await blockBlobClient.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });

    res.json({ ok: true, name: safeName, url: blockBlobClient.url });
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
