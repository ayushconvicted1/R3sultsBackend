const { uploadToCloudinary } = require('../middleware/upload');

exports.uploadCSV = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'CSV file is required' });
    if (req.file.mimetype !== 'text/csv') {
      return res.status(400).json({ success: false, message: 'Only CSV files are allowed' });
    }

    const result = await uploadToCloudinary(req.file.buffer, { folder: 'r3sults/csv', resource_type: 'raw' });
    res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) { next(error); }
};

exports.parseCSV = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'CSV file is required' });
    if (req.file.mimetype !== 'text/csv') {
      return res.status(400).json({ success: false, message: 'Only CSV files are allowed' });
    }

    const content = req.file.buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }

    const columns = lines[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      columns.forEach((col, idx) => { row[col] = values[idx] || ''; });
      rows.push(row);
    }

    res.json({ success: true, data: { rows, columns } });
  } catch (error) { next(error); }
};
