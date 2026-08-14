import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import apiRoutes from './routes/api';
import { verifyConnection } from './config/database';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files reliably
const clientPath = path.resolve(process.cwd(), 'client');
app.use(express.static(clientPath));

// API Routes
app.use('/api', apiRoutes);

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Start Server locally when not running in Vercel serverless environment
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log('====================================================');
    console.log(`⚡ FinGraph AI Server running on http://localhost:${PORT}`);
    console.log('====================================================');
    
    const dbStatus = await verifyConnection();
    if (dbStatus.isConnected) {
      console.log(`🟢 Database Status: Connected to CognoDB Cloud (${dbStatus.serverInfo})`);
    } else {
      console.log(`🟡 Database Status: ${dbStatus.message}`);
    }
    console.log('====================================================');
  });
}

export default app;
