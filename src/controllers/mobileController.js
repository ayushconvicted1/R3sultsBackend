const prisma = require('../lib/prisma');

exports.getTasks = async (req, res, next) => {
  try {
    if (req.userType !== 'volunteer') {
      return res.status(403).json({ success: false, message: 'Only volunteers can access tasks' });
    }

    const volunteerId = req.user.id;
    const dashboardVol = await prisma.dashboardVolunteer.findUnique({
      where: { volunteer_id: volunteerId },
    });

    const activeTaskCount = dashboardVol?.assigned_disasters?.length || 0;
    const completedTaskCount = dashboardVol?.completed_missions || 0;
    const responseRating = dashboardVol?.rating ? parseFloat(dashboardVol.rating) : 0;

    const tasks = (dashboardVol?.assigned_disasters || []).map((d) => ({
      id: d.id || d,
      status: d.status || 'assigned',
      ...d,
    }));

    res.json({
      success: true,
      data: { activeTaskCount, completedTaskCount, responseRating, tasks },
    });
  } catch (error) { next(error); }
};

exports.getTaskById = async (req, res, next) => {
  try {
    if (req.userType !== 'volunteer') {
      return res.status(403).json({ success: false, message: 'Only volunteers can access tasks' });
    }

    const { disasterId } = req.params;
    const dashboardVol = await prisma.dashboardVolunteer.findUnique({
      where: { volunteer_id: req.user.id },
    });

    const task = (dashboardVol?.assigned_disasters || []).find((d) => (d.id || d) === disasterId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found or not assigned to you' });

    res.json({ success: true, data: task });
  } catch (error) { next(error); }
};

exports.acceptTask = async (req, res, next) => {
  try {
    if (req.userType !== 'volunteer') {
      return res.status(403).json({ success: false, message: 'Only volunteers can access tasks' });
    }

    const { disasterId } = req.body;
    const dashboardVol = await prisma.dashboardVolunteer.findUnique({
      where: { volunteer_id: req.user.id },
    });
    if (!dashboardVol) return res.status(404).json({ success: false, message: 'Volunteer not found in dashboard' });

    const disasters = dashboardVol.assigned_disasters || [];
    const updated = disasters.map((d) => {
      if ((d.id || d) === disasterId) return { ...d, status: 'active' };
      return d;
    });

    await prisma.dashboardVolunteer.update({
      where: { volunteer_id: req.user.id },
      data: { assigned_disasters: updated },
    });

    res.json({ success: true, message: 'Task accepted', data: { disasterId, status: 'active' } });
  } catch (error) { next(error); }
};

exports.declineTask = async (req, res, next) => {
  try {
    if (req.userType !== 'volunteer') {
      return res.status(403).json({ success: false, message: 'Only volunteers can access tasks' });
    }

    const { disasterId } = req.body;
    const dashboardVol = await prisma.dashboardVolunteer.findUnique({
      where: { volunteer_id: req.user.id },
    });
    if (!dashboardVol) return res.status(404).json({ success: false, message: 'Volunteer not found in dashboard' });

    const disasters = (dashboardVol.assigned_disasters || []).map((d) => {
      if ((d.id || d) === disasterId) return { ...d, status: 'cancelled' };
      return d;
    });

    await prisma.dashboardVolunteer.update({
      where: { volunteer_id: req.user.id },
      data: { assigned_disasters: disasters },
    });

    res.json({ success: true, message: 'Task declined', data: { disasterId, status: 'cancelled' } });
  } catch (error) { next(error); }
};

exports.getAlerts = async (req, res, next) => {
  try {
    const { lat, lon, limit: lim, filter } = req.query;
    const alertLimit = parseInt(lim, 10) || 50;

    // Fetch weather alerts from NWS API if coordinates provided
    let weatherAlerts = [];
    if (lat && lon) {
      try {
        const response = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}&limit=${alertLimit}`);
        if (response.ok) {
          const data = await response.json();
          weatherAlerts = (data.features || []).map((f) => ({
            alertId: f.id,
            type: 'weather',
            title: f.properties.headline,
            description: f.properties.description,
            severity: f.properties.severity,
            timestamp: f.properties.sent,
            iconType: f.properties.event?.toLowerCase().includes('tornado') ? 'tornado'
              : f.properties.event?.toLowerCase().includes('flood') ? 'flood'
              : f.properties.event?.toLowerCase().includes('hurricane') ? 'hurricane'
              : 'weather',
          }));
        }
      } catch (e) {
        console.error('Weather API error:', e.message);
      }
    }

    // Filter if requested
    let alerts = weatherAlerts;
    if (filter) {
      alerts = alerts.filter((a) => a.type === filter || a.iconType === filter);
    }

    res.json({ success: true, data: alerts.slice(0, alertLimit) });
  } catch (error) { next(error); }
};
