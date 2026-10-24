/**
 * Plantae Agrocrédito - Vercel Serverless Function for Image Upload
 * Handles POST /api/admin/upload
 * Accepts base64-encoded image data and saves to the uploads directory.
 * Note: In Vercel serverless, files saved to /tmp are ephemeral.
 * For persistent storage, configure a CDN or object storage.
 */

const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-admin-gate, x-admin-pwd');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const { filename, data } = body;

    if (!data || !filename) {
      return res.status(400).json({ error: 'Data and filename are required' });
    }

    // Validate base64 image format
    const matches = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image data format' });
    }

    const buffer = Buffer.from(matches[2], 'base64');

    // Sanitize filename to prevent path traversal
    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9_.\-]/g, '_');
    const ext = safeFilename.split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

    if (!allowedExts.includes(ext)) {
      return res.status(400).json({ error: 'File type not allowed. Use: jpg, png, gif, webp, svg' });
    }

    // Try to write to /uploads in project root first, fallback to /tmp
    let targetPath;
    let filepath;

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) {}
    }

    if (fs.existsSync(uploadsDir)) {
      targetPath = path.join(uploadsDir, safeFilename);
      filepath = 'uploads/' + safeFilename;
    } else {
      // Fallback to /tmp (Vercel ephemeral storage)
      targetPath = path.join('/tmp', safeFilename);
      filepath = '/tmp/' + safeFilename;
    }

    fs.writeFileSync(targetPath, buffer);

    return res.status(200).json({
      success: true,
      filepath: filepath,
      filename: safeFilename,
      size: buffer.length
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
};
