const BloodDrive = require('../models/BloodDrive');

// Create a new blood drive
exports.createBloodDrive = async (req, res) => {
  try {
    const { organizerId, title, location, date } = req.body;
    const drive = await BloodDrive.create({ organizerId, title, location, date });
    res.status(201).json(drive);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all upcoming blood drives
exports.getUpcomingDrives = async (req, res) => {
  try {
    const drives = await BloodDrive.find({ date: { $gte: new Date() } })
      .sort({ date: 1 })
      .populate('organizerId', 'name');
    res.json(drives);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Register a donor for a blood drive
exports.registerDonor = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { donorId } = req.body;

    const drive = await BloodDrive.findById(driveId);
    if (!drive) return res.status(404).json({ message: 'Blood drive not found' });

    if (drive.registeredDonors.includes(donorId)) {
      return res.status(400).json({ message: 'Donor already registered' });
    }

    drive.registeredDonors.push(donorId);
    await drive.save();

    res.json(drive);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get details of a specific drive (including registered donors)
exports.getDriveDetails = async (req, res) => {
  try {
    const drive = await BloodDrive.findById(req.params.driveId)
      .populate('registeredDonors', 'name bloodGroup')
      .populate('organizerId', 'name');
    if (!drive) return res.status(404).json({ message: 'Blood drive not found' });
    res.json(drive);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};