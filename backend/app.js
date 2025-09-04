const express = require('express');
const mysql = require('mysql');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Mysql@1qaz', // Your MySQL password
  database: 'parcel_system_db'
});

db.connect(err => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', err);
  } else {
    console.log('✅ Connected to MySQL Database!');
  }
});

// API to fetch recent parcel data
app.get('/api/parcels', (req, res) => {
  const query = `
    SELECT 
      id, 
      length_cm, 
      width_cm, 
      height_cm, 
      volume_cm3, 
      weight_grams,
      price, 
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at 
    FROM parcel_data 
    ORDER BY created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Query error:', err);
      res.status(500).json({ error: 'Failed to fetch parcels' });
    } else {
      res.json(results);
    }
  });
});

// Serial communication
const port = new SerialPort({
  path: 'COM5', // Change to your actual Arduino port
  baudRate: 9600
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', line => {
  console.log(`📥 Received from Arduino: ${line}`);

  const data = {};
  line.split(',').forEach(part => {
    const [key, value] = part.trim().split(':');
    if (key && value) {
      data[key.toLowerCase()] = parseFloat(value);
    }
  });

  const originalLength = data.l || data.length;
  const originalWidth = data.w || data.width;
  const originalHeight = data.h || data.height;

  const FIXED_VALUE = 30;
  const density = 0.0025;

  if (originalLength && originalWidth && originalHeight) {
    // Subtract from 30
    const length = FIXED_VALUE - originalLength;
    const width = FIXED_VALUE - originalWidth;
    const height = FIXED_VALUE - originalHeight;

    const volume = length * width * height;
    const weight = volume * density;
    const price = calculatePrice(weight);

    console.log(`📏 Modified - Length: ${length}, Width: ${width}, Height: ${height}`);
    console.log(`📦 Volume: ${volume}, Weight: ${weight}, ₹ Price: ${price}`);

    
    const sql = 'INSERT INTO parcel_data (length_cm, width_cm, height_cm, volume_cm3, weight_grams, price) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [length, width, height, volume, weight, price];


    db.query(sql, values, err => {
      if (err) {
        console.error('📛 Error inserting parcel data:', err);
      } else {
        console.log('✅ Parcel data saved to database!');
      }
    });

    io.emit('newParcel', {
      length,
      width,
      height,
      volume,
      weight,
      price
    });
  }
});

// 💰 Dynamic pricing based on volume
function calculatePrice(weight) {
  const RATE = 15; // ₹ per cm³
  return parseFloat((weight * RATE).toFixed(2)); // Round to 2 decimals
}

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
