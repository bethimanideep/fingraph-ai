import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

let driver: Driver | null = null;

export interface DBStatus {
  isConnected: boolean;
  mode: 'LIVE_COGNODB' | 'MOCK_FALLBACK';
  serverInfo?: string;
  message: string;
  error?: string;
}

export function resetDriver() {
  if (driver) {
    driver.close().catch(() => {});
    driver = null;
  }
}

export function getDriver(forceNew: boolean = false): Driver | null {
  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER || 'cognodb';
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !password || uri.includes('your-instance-id')) {
    return null;
  }

  if (forceNew) {
    resetDriver();
  }

  if (!driver) {
    try {
      driver = neo4j.driver(
        uri,
        neo4j.auth.basic(user, password),
        {
          maxConnectionPoolSize: 10,
          maxConnectionLifetime: 25 * 1000, // 25s lifetime to prevent stale serverless sockets
          connectionTimeout: 8000,
          connectionAcquisitionTimeout: 8000,
          logging: {
            level: 'warn',
            logger: (level, message) => {
              // Silence expected serverless idle socket disconnect notices
              if (!message.includes('Connection was closed by server') && !message.includes('ECONNRESET')) {
                console.warn(`[Neo4j Driver] ${message}`);
              }
            }
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to initialize Neo4j driver:', err.message);
      driver = null;
    }
  }

  return driver;
}

export async function verifyConnection(): Promise<DBStatus> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const activeDriver = getDriver(attempt > 1);
    if (!activeDriver) {
      return {
        isConnected: false,
        mode: 'MOCK_FALLBACK',
        message: 'Unconfigured environment variables. COGNODB_URI or COGNODB_PASSWORD missing.',
        error: 'COGNODB_URI or COGNODB_PASSWORD environment variable is not configured.'
      };
    }

    try {
      const serverInfo = await activeDriver.verifyConnectivity();
      return {
        isConnected: true,
        mode: 'LIVE_COGNODB',
        serverInfo: serverInfo.address || process.env.COGNODB_URI || '',
        message: 'Successfully connected to CognoDB Cloud.'
      };
    } catch (err: any) {
      resetDriver();
      if (attempt === 2) {
        return {
          isConnected: false,
          mode: 'MOCK_FALLBACK',
          message: 'Unable to connect to CognoDB Cloud graph database.',
          error: err.message
        };
      }
    }
  }

  return {
    isConnected: false,
    mode: 'MOCK_FALLBACK',
    message: 'Unable to connect to CognoDB Cloud graph database.'
  };
}

export async function executeCypher(cypher: string, params: Record<string, any> = {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const activeDriver = getDriver(attempt > 1);
    
    if (!activeDriver) {
      throw new Error('DATABASE_OFFLINE: CognoDB driver is unconfigured or unreachable.');
    }

    const session: Session = activeDriver.session({ defaultAccessMode: neo4j.session.READ });
    const startTime = Date.now();

    try {
      const result = await session.run(cypher, params);
      const executionTimeMs = Date.now() - startTime;
      
      const records = result.records.map(record => {
        const row: Record<string, any> = {};
        record.keys.forEach((key: any) => {
          row[String(key)] = formatNeo4jValue(record.get(key));
        });
        return row;
      });

      return {
        records,
        summary: {
          executionTimeMs,
          resultAvailableAfter: result.summary.resultAvailableAfter?.toNumber?.() || 0,
          resultConsumedAfter: result.summary.resultConsumedAfter?.toNumber?.() || 0,
          counters: (result.summary.counters as any)?._stats || {}
        },
        isLive: true
      };
    } catch (err: any) {
      resetDriver();
      const isRetriable = 
        err.message?.includes('closed by server') || 
        err.message?.includes('ECONNRESET') || 
        err.message?.includes('ServiceUnavailable') ||
        err.name === 'Neo4jError';

      if (attempt === 1 && isRetriable) {
        // Retry once with a fresh driver instance
        continue;
      }
      throw err;
    } finally {
      await session.close().catch(() => {});
    }
  }

  throw new Error('DATABASE_OFFLINE: Failed to execute query after reconnection attempt.');
}

export function formatNeo4jValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (neo4j.isInt(val)) return val.toNumber();
  if (Array.isArray(val)) return val.map(formatNeo4jValue);
  
  if (typeof val === 'object') {
    if (val.labels && val.properties) {
      return {
        id: val.identity ? (neo4j.isInt(val.identity) ? val.identity.toNumber() : String(val.identity)) : val.properties.id,
        labels: val.labels,
        properties: formatNeo4jValue(val.properties)
      };
    }
    if (val.type && val.properties) {
      return {
        id: val.identity ? (neo4j.isInt(val.identity) ? val.identity.toNumber() : String(val.identity)) : undefined,
        type: val.type,
        startNodeId: neo4j.isInt(val.start) ? val.start.toNumber() : val.start,
        endNodeId: neo4j.isInt(val.end) ? val.end.toNumber() : val.end,
        properties: formatNeo4jValue(val.properties)
      };
    }
    if (val.start && val.end && val.segments) {
      return {
        start: formatNeo4jValue(val.start),
        end: formatNeo4jValue(val.end),
        length: val.length,
        nodes: Array.isArray(val.nodes) ? val.nodes.map(formatNeo4jValue) : [],
        relationships: Array.isArray(val.relationships) ? val.relationships.map(formatNeo4jValue) : []
      };
    }
    const formattedObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      formattedObj[k] = formatNeo4jValue(v);
    }
    return formattedObj;
  }
  return val;
}
