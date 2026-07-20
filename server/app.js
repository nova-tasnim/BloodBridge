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
require('./models/DonationRecord');
require('./models/BloodRequest');
require('./models/Inventory');
require('./models/Campaign');
require('./models/DonorResponse');
require('./models/CampaignRegistration');

const donorRoutes = require('./routes/donorRoutes');
const donationRoutes = require('./routes/donationRoutes');
const bloodRequestRoutes = require('./routes/bloodRequestRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const app = express();
const campaignRoutes = require('./routes/campaignRoutes');
const compatibilityRoutes = require('./routes/compatibilityRoutes');
connectDB();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('BloodBridge API is running'));

app.use('/api/donors', donorRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/requests', bloodRequestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/compatibility', compatibilityRoutes);
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));