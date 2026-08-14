import express, { Request, Response } from 'express';
import { verifyConnection, executeCypher } from '../config/database';
import * as graphService from '../services/graphService';

const router = express.Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    const status = await verifyConnection();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: status
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

router.get('/graph/full', async (req: Request, res: Response) => {
  try {
    const data = await graphService.getFullGraph();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/detect/circular', async (req: Request, res: Response) => {
  try {
    const minAmount = Number(req.query.minAmount) || 50000;
    const limit = Number(req.query.limit) || 10;
    const data = await graphService.detectCircularLaundering(minAmount, limit);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/detect/sybil', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const data = await graphService.detectSybilRings(limit);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/path/shortest', async (req: Request, res: Response) => {
  try {
    const sourceId = req.query.sourceId as string;
    const targetId = req.query.targetId as string;
    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId parameters are required' });
    }
    const data = await graphService.findShortestPath(sourceId, targetId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/blast-radius', async (req: Request, res: Response) => {
  try {
    const flaggedId = (req.query.flaggedId as string) || 'ACC-101';
    const limit = Number(req.query.limit) || 10;
    const data = await graphService.calculateBlastRadius(flaggedId, limit);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/explain/:entityId', (req: Request, res: Response) => {
  const entityId = String(req.params.entityId);
  const evidence = graphService.getEntityExplainability(entityId);
  res.json({ entityId, evidence });
});

router.post('/cypher/execute', async (req: Request, res: Response) => {
  try {
    const { cypher, params } = req.body;
    if (!cypher) {
      return res.status(400).json({ error: 'Cypher query parameter is required' });
    }

    const conn = await verifyConnection();
    if (!conn.isConnected) {
      return res.status(503).json({
        isLive: false,
        error: 'CognoDB Cloud database is unconfigured or unreachable.'
      });
    }

    const result = await executeCypher(cypher, params || {});
    res.json({
      isLive: true,
      mode: 'LIVE_COGNODB',
      records: result.records,
      summary: result.summary,
      cypherExecuted: cypher,
      params: params || {}
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
