const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Create Boat schema
const boatSchema = new mongoose.Schema({
  userId: String,
  waypoints: [{ lat: Number, lon: Number }],
  currentLocation: { lat: Number, lon: Number },
  sailingPreferences: {
    maxWaveHeight: Number,
    maxWindSpeed: Number,
  },
});

// Create Boat model
const Boat = mongoose.model('Boat', boatSchema);

// Register a boat
app.post('/boats', async (req, res) => {
  try {
    const { userId, sailingPreferences } = req.body;
    const boat = new Boat({ userId, sailingPreferences });
    await boat.save();
    res.status(201).json(boat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register boat' });
  }
});

// Update boat waypoints
app.put('/boats/:boatId/waypoints', async (req, res) => {
  try {
    const { boatId } = req.params;
    const { waypoints } = req.body;
    const boat = await Boat.findByIdAndUpdate(
      boatId,
      { waypoints },
      { new: true }
    );
    res.json(boat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update waypoints' });
  }
});

// Update boat current GPS location
app.put('/boats/:boatId/location', async (req, res) => {
  try {
    const { boatId } = req.params;
    const { lat, lon } = req.body;
    const boat = await Boat.findByIdAndUpdate(
      boatId,
      { currentLocation: { lat, lon } },
      { new: true }
    );
    res.json(boat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update current location' });
  }
});

// Update boat sailing preferences
app.put('/boats/:boatId/preferences', async (req, res) => {
  try {
    const { boatId } = req.params;
    const { maxWaveHeight, maxWindSpeed } = req.body;
    const boat = await Boat.findByIdAndUpdate(
      boatId,
      { sailingPreferences: { maxWaveHeight, maxWindSpeed } },
      { new: true }
    );
    res.json(boat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sailing preferences' });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
