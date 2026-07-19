const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Models registered before routes so discriminators load
require('./models/User');
require('./models/Donor');
require('./models/Patient');
require('./models/Hospital');
require('./models/BloodBank');
require('./models/Admin');

const donorRoutes = require('./routes/donorRoutes');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('BloodBridge API is running'));

app.use('/api/donors', donorRoutes);

app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));