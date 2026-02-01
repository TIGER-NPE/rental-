const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'uploads', 'drivers'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Simple admin password (in production, use proper authentication)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const password = req.headers['x-admin-password'];
  if (password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

// Helper function to check database connection
const isDbConnected = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

// API Routes - Public

// Get all cars (with availability status)
app.get('/api/cars', async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(200).json({ success: true, data: [], message: 'Database not connected - using sample data' });
  }
  try {
    const { start_date } = req.query;
    
    // Return ALL cars (including unavailable) - frontend will handle display
    const [rows] = await pool.query('SELECT * FROM cars ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch cars' });
  }
});

// Get single car by ID
app.get('/api/cars/:id', async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(404).json({ success: false, message: 'Car not found' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM cars WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch car' });
  }
});

// Search cars by name or model
app.get('/api/cars/search/:query', async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(200).json({ success: true, data: [], message: 'Database not connected' });
  }
  try {
    const query = `%${req.params.query}%`;
    const [rows] = await pool.query(
      'SELECT * FROM cars WHERE available = TRUE AND (name LIKE ? OR model LIKE ?) ORDER BY price_per_day ASC',
      [query, query]
    );
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to search cars' });
  }
});

// Get WhatsApp URL for a car
app.get('/api/cars/:id/whatsapp', async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(404).json({ success: false, message: 'Car not found' });
  }
  try {
    const [rows] = await pool.query('SELECT whatsapp_number, name, model FROM cars WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }
    
    const car = rows[0];
    const phoneNumber = car.whatsapp_number.replace(/[^0-9]/g, '');
    const message = `Hi, I'm interested in renting the ${car.name} ${car.model}. Is it available?`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    res.json({ success: true, data: { whatsappUrl, phoneNumber } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate WhatsApp URL' });
  }
});

// API Routes - Admin (Protected)

// Get all cars (including unavailable)
app.get('/api/admin/cars', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM cars ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch cars' });
  }
});

// Add new car
app.post('/api/admin/cars', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    const { name, model, year, price_per_day, whatsapp_number, images, description, available } = req.body;
    
    const imagesJson = images ? JSON.stringify(images) : '[]';
    
    const [result] = await pool.query(
      `INSERT INTO cars (name, model, year, price_per_day, whatsapp_number, images, description, available, start_date, end_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, model, year, price_per_day, whatsapp_number, imagesJson, description || '', available !== false, req.body.start_date || null, req.body.end_date || null]
    );
    
    res.json({ success: true, message: 'Car added successfully', id: result.insertId });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to add car' });
  }
});

// Update car
app.put('/api/admin/cars/:id', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    const { name, model, year, price_per_day, whatsapp_number, images, description, available, start_date, end_date } = req.body;
    
    const imagesJson = images ? JSON.stringify(images) : '[]';
    
    await pool.query(
      `UPDATE cars SET name = ?, model = ?, year = ?, price_per_day = ?, whatsapp_number = ?, images = ?, description = ?, available = ?, start_date = ?, end_date = ? WHERE id = ?`,
      [name, model, year, price_per_day, whatsapp_number, imagesJson, description || '', available !== false, start_date || null, end_date || null, req.params.id]
    );
    
    res.json({ success: true, message: 'Car updated successfully' });
  } catch (error) {
    console.error('Update car error:', error);
    res.status(500).json({ success: false, message: 'Failed to update car: ' + error.message });
  }
});

// Delete car
app.delete('/api/admin/cars/:id', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    await pool.query('DELETE FROM cars WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Car deleted successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete car' });
  }
});

// Upload car photo
app.post('/api/admin/cars/:id/photo', authenticateAdmin, upload.single('photo'), async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  try {
    const photoUrl = `/uploads/cars/${req.file.filename}`;
    await pool.query('UPDATE cars SET image_url = ? WHERE id = ?', [photoUrl, req.params.id]);
    res.json({ success: true, photoUrl });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save photo' });
  }
});

// Verify admin password
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Valid password' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// ============================================
// DRIVERS API ROUTES (Admin Protected)
// ============================================

// Get all drivers
app.get('/api/admin/drivers', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM drivers ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
  }
});

// Add new driver
app.post('/api/admin/drivers', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    const { name, phone, email, license_number, vehicle_assigned, status } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO drivers (name, phone, email, license_number, vehicle_assigned, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, phone || '', email || '', license_number || '', vehicle_assigned || '', status || 'available']
    );
    
    res.json({ success: true, message: 'Driver added successfully', id: result.insertId });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to add driver' });
  }
});

// Update driver
app.put('/api/admin/drivers/:id', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    const { name, phone, email, license_number, vehicle_assigned, status } = req.body;
    
    await pool.query(
      `UPDATE drivers SET name = ?, phone = ?, email = ?, license_number = ?, vehicle_assigned = ?, status = ? WHERE id = ?`,
      [name, phone || '', email || '', license_number || '', vehicle_assigned || '', status || 'available', req.params.id]
    );
    
    res.json({ success: true, message: 'Driver updated successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update driver' });
  }
});

// Delete driver
app.delete('/api/admin/drivers/:id', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    await pool.query('DELETE FROM drivers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete driver' });
  }
});

// Upload driver photo
app.post('/api/admin/drivers/:id/photo', authenticateAdmin, upload.single('photo'), async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  try {
    const photoUrl = `/uploads/drivers/${req.file.filename}`;
    await pool.query('UPDATE drivers SET photo_url = ? WHERE id = ?', [photoUrl, req.params.id]);
    res.json({ success: true, photoUrl });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save photo' });
  }
});

// Public route to get available drivers
app.get('/api/drivers/available', async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(200).json({ success: true, data: [], message: 'Database not connected' });
  }
  try {
    const [rows] = await pool.query("SELECT * FROM drivers WHERE status = 'available' ORDER BY name");
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
  }
});

// ============================================
// TERMS API ROUTES (Admin Protected)
// ============================================

// Get all terms
app.get('/api/admin/terms', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM terms ORDER BY display_order ASC');
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch terms' });
  }
});

// Get public terms
app.get('/api/terms', async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(200).json({ success: true, data: [], message: 'Database not connected' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM terms ORDER BY display_order ASC');
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch terms' });
  }
});

// Add new term
app.post('/api/admin/terms', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    const { title, content, display_order } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO terms (title, content, display_order) VALUES (?, ?, ?)`,
      [title, content, display_order || 0]
    );
    
    res.json({ success: true, message: 'Term added successfully', id: result.insertId });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to add term' });
  }
});

// Update term
app.put('/api/admin/terms/:id', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    const { title, content, display_order } = req.body;
    
    await pool.query(
      `UPDATE terms SET title = ?, content = ?, display_order = ? WHERE id = ?`,
      [title, content, display_order || 0, req.params.id]
    );
    
    res.json({ success: true, message: 'Term updated successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update term' });
  }
});

// Delete term
app.delete('/api/admin/terms/:id', authenticateAdmin, async (req, res) => {
  const connected = await isDbConnected();
  if (!connected) {
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  try {
    await pool.query('DELETE FROM terms WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Term deleted successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete term' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT);
