const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Models registered before routes so discriminators load
require('./models/User');
require('./models/KnowledgeChunk');
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
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');
const donorRoutes = require('./routes/donorRoutes');
const donationRoutes = require('./routes/donationRoutes');
const bloodRequestRoutes = require('./routes/bloodRequestRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const app = express();
const assistantRoutes = require('./routes/assistantRoutes');
const bloodDriveRoutes = require('./routes/bloodDriveRoutes');
const mapRoutes = require('./routes/mapRoutes');
const queueRoutes = require('./routes/queueRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const compatibilityRoutes = require('./routes/compatibilityRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const badgeRoutes = require('./routes/badgeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
connectDB();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('BloodBridge API is running'));
app.use('/api/queue', queueRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/blood-drives', bloodDriveRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/requests', bloodRequestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/compatibility', compatibilityRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));