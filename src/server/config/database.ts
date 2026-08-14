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

export function getDriver(): Driver | null {
  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER || 'cognodb';
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !password || uri.includes('your-instance-id')) {
    return null;
  }

  if (!driver) {
    try {
      driver = neo4j.driver(
        uri,
        neo4j.auth.basic(user, password),
        {
          maxConnectionPoolSize: 50,
          connectionTimeout: 5000,
          logging: {
            level: 'info',
            logger: (level, message) => {
              if (level === 'error') console.error(`[Neo4j Driver ${level}]`, message);
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
  const activeDriver = getDriver();
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
    console.warn('⚠️ CognoDB connection verification failed:', err.message);
    return {
      isConnected: false,
      mode: 'MOCK_FALLBACK',
      message: 'Unable to connect to CognoDB Cloud graph database.',
      error: err.message
    };
  }
}

export async function executeCypher(cypher: string, params: Record<string, any> = {}) {
  const activeDriver = getDriver();
  
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
    console.error('Cypher Execution Error:', err.message);
    throw err;
  } finally {
    await session.close();
  }
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
    if (val.start !== undefined && val.end !== undefined) {
      return {
        start: formatNeo4jValue(val.start),
        end: formatNeo4jValue(val.end),
        length: val.length,
        nodes: Array.isArray(val.nodes) ? val.nodes.map(formatNeo4jValue) : [],
        relationships: Array.isArray(val.relationships) ? val.relationships.map(formatNeo4jValue) : []
      };
    }
    const formattedObj: Record<string, any> = {};
    Object.keys(val).forEach(k => {
      formattedObj[k] = formatNeo4jValue((val as any)[k]);
    });
    return formattedObj;
  }
  
  return val;
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
