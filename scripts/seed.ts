/**
 * FinGraph AI - CognoDB / Neo4j Graph Seeding Script (TypeScript)
 * Run using: `npm run seed`
 */

import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

async function runSeed() {
  console.log('----------------------------------------------------');
  console.log('🚀 FinGraph AI: Seeding CognoDB Graph Database...');
  console.log('----------------------------------------------------');

  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER || 'cognodb';
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !password || uri.includes('your-instance-id')) {
    console.error('❌ Error: COGNODB_URI and COGNODB_PASSWORD must be configured in .env before seeding live database.');
    console.log('💡 Tip: Obtain your CognoDB Bolt URI and generated password from https://console.cognodb.com');
    process.exit(1);
  }

  console.log(`📡 Connecting to: ${uri}`);
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connection verified successfully.');

    console.log('🧹 Clearing existing nodes & relationships...');
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('✅ Graph database reset.');

    console.log('⚡ Creating graph indexes...');
    const indexQueries = [
      'CREATE INDEX account_id_idx IF NOT EXISTS FOR (a:Account) ON (a.id)',
      'CREATE INDEX person_id_idx IF NOT EXISTS FOR (p:Person) ON (p.id)',
      'CREATE INDEX company_id_idx IF NOT EXISTS FOR (c:Company) ON (c.id)',
      'CREATE INDEX device_id_idx IF NOT EXISTS FOR (d:Device) ON (d.id)',
      'CREATE INDEX ip_id_idx IF NOT EXISTS FOR (i:IPAddress) ON (i.id)'
    ];

    for (const q of indexQueries) {
      try {
        await session.run(q);
      } catch (e) {
        // Fallback for openCypher index syntax variations
      }
    }

    console.log('🌱 Seeding Graph Entities (Enterprise Identifiers - No PII)...');

    // Persons
    await session.run(`
      UNWIND $persons AS p
      CREATE (person:Person {
        id: p.id,
        customerRef: p.customerRef,
        fullName: p.fullName,
        nationality: p.nationality,
        riskCategory: p.riskCategory
      })
    `, {
      persons: [
        { id: 'PER-001', customerRef: 'CUST-10041', fullName: 'Alexander Vance', nationality: 'US', riskCategory: 'HIGH' },
        { id: 'PER-002', customerRef: 'CUST-10042', fullName: 'Elena Rostova', nationality: 'RU', riskCategory: 'CRITICAL' },
        { id: 'PER-003', customerRef: 'CUST-10043', fullName: 'Marcus Chen', nationality: 'SG', riskCategory: 'MEDIUM' },
        { id: 'PER-004', customerRef: 'CUST-10044', fullName: 'Sarah Jenkins', nationality: 'UK', riskCategory: 'LOW' },
        { id: 'PER-005', customerRef: 'CUST-10045', fullName: 'Carlos Delgado', nationality: 'MX', riskCategory: 'HIGH' },
        { id: 'PER-006', customerRef: 'CUST-10046', fullName: 'Dmitri Volkov', nationality: 'CY', riskCategory: 'CRITICAL' }
      ]
    });

    // Companies
    await session.run(`
      UNWIND $companies AS c
      CREATE (comp:Company {
        id: c.id,
        name: c.name,
        registrationNo: c.registrationNo,
        jurisdiction: c.jurisdiction,
        isShellCompany: c.isShellCompany
      })
    `, {
      companies: [
        { id: 'CMP-101', name: 'Apex Zenith Capital LLC', registrationNo: 'BVI-88912', jurisdiction: 'British Virgin Islands', isShellCompany: true },
        { id: 'CMP-102', name: 'Vanguard Global Trade Corp', registrationNo: 'CY-33910', jurisdiction: 'Cyprus', isShellCompany: true },
        { id: 'CMP-103', name: 'Quantum Nexus Holdings', registrationNo: 'PAN-1092', jurisdiction: 'Panama', isShellCompany: true },
        { id: 'CMP-104', name: 'Blue Sky Tech Solutions', registrationNo: 'DE-90182', jurisdiction: 'Delaware, US', isShellCompany: false }
      ]
    });

    // Accounts
    await session.run(`
      UNWIND $accounts AS a
      CREATE (acc:Account {
        id: a.id,
        accountNumber: a.accountNumber,
        ownerName: a.ownerName,
        bankName: a.bankName,
        balance: a.balance,
        riskScore: a.riskScore,
        status: a.status,
        type: a.type
      })
    `, {
      accounts: [
        { id: 'ACC-101', accountNumber: 'US-991201', ownerName: 'Apex Zenith Capital', bankName: 'Standard Chartered', balance: 1450000.00, riskScore: 92, status: 'FLAGGED', type: 'CORPORATE' },
        { id: 'ACC-102', accountNumber: 'KY-881202', ownerName: 'Vanguard Trade', bankName: 'Cayman First Bank', balance: 890000.00, riskScore: 84, status: 'FLAGGED', type: 'CORPORATE' },
        { id: 'ACC-103', accountNumber: 'CH-441203', ownerName: 'Quantum Nexus', bankName: 'Credit Suisse', balance: 1200000.00, riskScore: 78, status: 'SUSPICIOUS', type: 'CORPORATE' },
        { id: 'ACC-104', accountNumber: 'SG-221204', ownerName: 'Alexander Vance', bankName: 'DBS Bank', balance: 450000.00, riskScore: 88, status: 'FLAGGED', type: 'PERSONAL' },

        { id: 'ACC-201', accountNumber: 'PA-110201', ownerName: 'Elena Rostova', bankName: 'Panama Offshore Bank', balance: 3200000.00, riskScore: 96, status: 'FLAGGED', type: 'PERSONAL' },
        { id: 'ACC-202', accountNumber: 'AE-550202', ownerName: 'Dmitri Volkov', bankName: 'Emirates NBD', balance: 2100000.00, riskScore: 89, status: 'FLAGGED', type: 'PERSONAL' },
        { id: 'ACC-203', accountNumber: 'CY-330203', ownerName: 'Cyprus Trade Ltd', bankName: 'Bank of Cyprus', balance: 1850000.00, riskScore: 81, status: 'SUSPICIOUS', type: 'CORPORATE' },

        { id: 'ACC-301', accountNumber: 'MX-770301', ownerName: 'Carlos Delgado', bankName: 'BBVA Mexico', balance: 65000.00, riskScore: 74, status: 'SUSPICIOUS', type: 'PERSONAL' },
        { id: 'ACC-302', accountNumber: 'US-770302', ownerName: 'Syndicate Front A', bankName: 'Wells Fargo', balance: 120000.00, riskScore: 85, status: 'FLAGGED', type: 'SHELL' },
        { id: 'ACC-303', accountNumber: 'US-770303', ownerName: 'Syndicate Front B', bankName: 'JPMorgan Chase', balance: 98000.00, riskScore: 82, status: 'FLAGGED', type: 'SHELL' },
        { id: 'ACC-304', accountNumber: 'UK-770304', ownerName: 'Syndicate Front C', bankName: 'Barclays UK', balance: 210000.00, riskScore: 88, status: 'FLAGGED', type: 'SHELL' },

        { id: 'ACC-401', accountNumber: 'US-100401', ownerName: 'Sarah Jenkins', bankName: 'Bank of America', balance: 45000.00, riskScore: 12, status: 'NORMAL', type: 'PERSONAL' },
        { id: 'ACC-402', accountNumber: 'US-100402', ownerName: 'Blue Sky Tech', bankName: 'Silicon Valley Bank', balance: 540000.00, riskScore: 18, status: 'NORMAL', type: 'CORPORATE' },
        { id: 'ACC-501', accountNumber: 'DE-200501', ownerName: 'Marcus Chen', bankName: 'Deutsche Bank', balance: 180000.00, riskScore: 45, status: 'NORMAL', type: 'PERSONAL' },

        { id: 'ACC-999', accountNumber: 'OFAC-SANCTIONED', ownerName: 'Darknet Treasury Vault', bankName: 'Unregulated Crypto Vault', balance: 9500000.00, riskScore: 100, status: 'SANCTIONED', type: 'VAULT' }
      ]
    });

    // Devices & IPs
    await session.run(`
      UNWIND $devices AS d
      CREATE (dev:Device { id: d.id, fingerprint: d.fingerprint, deviceType: d.deviceType, os: d.os })
    `, {
      devices: [
        { id: 'DEV-901', fingerprint: 'fp_mac_m3_99a812', deviceType: 'MacBook Pro', os: 'macOS 15.1' },
        { id: 'DEV-909', fingerprint: 'fp_android_sybil_root_x9', deviceType: 'Rooted Android Emulator', os: 'Android 14 (Custom ROM)' },
        { id: 'DEV-903', fingerprint: 'fp_win_server_v2', deviceType: 'Windows Workstation', os: 'Windows Server 2022' }
      ]
    });

    await session.run(`
      UNWIND $ips AS i
      CREATE (ip:IPAddress { id: i.id, ip: i.ip, country: i.country, isVpnOrProxy: i.isVpnOrProxy })
    `, {
      ips: [
        { id: 'IP-001', ip: '198.51.100.42', country: 'United States', isVpnOrProxy: false },
        { id: 'IP-002', ip: '185.220.101.4', country: 'Germany (Tor Exit Node)', isVpnOrProxy: true },
        { id: 'IP-003', ip: '88.198.1.1', country: 'Romania (Mullvad VPN)', isVpnOrProxy: true }
      ]
    });

    // Relationships (Executed as single statements)
    console.log('🔗 Creating Relationships (One query per transaction for CognoDB compatibility)...');

    const relQueries = [
      "MATCH (p:Person {id: 'PER-001'}), (a:Account {id: 'ACC-104'}) CREATE (p)-[:OWNS]->(a)",
      "MATCH (p:Person {id: 'PER-002'}), (a:Account {id: 'ACC-201'}) CREATE (p)-[:OWNS]->(a)",
      "MATCH (p:Person {id: 'PER-003'}), (a:Account {id: 'ACC-501'}) CREATE (p)-[:OWNS]->(a)",
      "MATCH (p:Person {id: 'PER-004'}), (a:Account {id: 'ACC-401'}) CREATE (p)-[:OWNS]->(a)",
      "MATCH (p:Person {id: 'PER-005'}), (a:Account {id: 'ACC-301'}) CREATE (p)-[:OWNS]->(a)",
      "MATCH (p:Person {id: 'PER-006'}), (a:Account {id: 'ACC-202'}) CREATE (p)-[:OWNS]->(a)",

      "MATCH (c:Company {id: 'CMP-101'}), (a:Account {id: 'ACC-101'}) CREATE (c)-[:OWNS]->(a)",
      "MATCH (c:Company {id: 'CMP-102'}), (a:Account {id: 'ACC-102'}) CREATE (c)-[:OWNS]->(a)",
      "MATCH (c:Company {id: 'CMP-103'}), (a:Account {id: 'ACC-103'}) CREATE (c)-[:OWNS]->(a)",
      "MATCH (c:Company {id: 'CMP-104'}), (a:Account {id: 'ACC-402'}) CREATE (c)-[:OWNS]->(a)",

      "MATCH (p:Person {id: 'PER-001'}), (c:Company {id: 'CMP-101'}) CREATE (p)-[:BENEFICIAL_OWNER_OF {ownershipPct: 100}]->(c)",
      "MATCH (p:Person {id: 'PER-006'}), (c:Company {id: 'CMP-102'}) CREATE (p)-[:BENEFICIAL_OWNER_OF {ownershipPct: 85}]->(c)",

      // Loop 1
      "MATCH (a1:Account {id: 'ACC-101'}), (a2:Account {id: 'ACC-102'}) CREATE (a1)-[:TRANSFERRED_TO {transactionId: 'TX-1001', amount: 250000.00, currency: 'USD', timestamp: '2026-08-01T10:15:00Z', channel: 'SWIFT'}]->(a2)",
      "MATCH (a2:Account {id: 'ACC-102'}), (a3:Account {id: 'ACC-103'}) CREATE (a2)-[:TRANSFERRED_TO {transactionId: 'TX-1002', amount: 245000.00, currency: 'USD', timestamp: '2026-08-02T11:20:00Z', channel: 'WIRE'}]->(a3)",
      "MATCH (a3:Account {id: 'ACC-103'}), (a4:Account {id: 'ACC-104'}) CREATE (a3)-[:TRANSFERRED_TO {transactionId: 'TX-1003', amount: 240000.00, currency: 'USD', timestamp: '2026-08-03T14:45:00Z', channel: 'CRYPTO_OFFRAMP'}]->(a4)",
      "MATCH (a4:Account {id: 'ACC-104'}), (a1:Account {id: 'ACC-101'}) CREATE (a4)-[:TRANSFERRED_TO {transactionId: 'TX-1004', amount: 235000.00, currency: 'USD', timestamp: '2026-08-04T09:10:00Z', channel: 'SHELL_INVOICE'}]->(a1)",

      // Loop 2
      "MATCH (a1:Account {id: 'ACC-201'}), (a2:Account {id: 'ACC-202'}) CREATE (a1)-[:TRANSFERRED_TO {transactionId: 'TX-2001', amount: 500000.00, currency: 'EUR', timestamp: '2026-08-05T08:00:00Z', channel: 'HAWALA'}]->(a2)",
      "MATCH (a2:Account {id: 'ACC-202'}), (a3:Account {id: 'ACC-203'}) CREATE (a2)-[:TRANSFERRED_TO {transactionId: 'TX-2002', amount: 495000.00, currency: 'EUR', timestamp: '2026-08-05T16:30:00Z', channel: 'OFFSHORE_CORRESPONDENT'}]->(a3)",
      "MATCH (a3:Account {id: 'ACC-203'}), (a1:Account {id: 'ACC-201'}) CREATE (a3)-[:TRANSFERRED_TO {transactionId: 'TX-2003', amount: 490000.00, currency: 'EUR', timestamp: '2026-08-06T12:15:00Z', channel: 'CONSULTING_FEE'}]->(a1)",

      // Sybil Ring
      "MATCH (dev:Device {id: 'DEV-909'}), (a:Account {id: 'ACC-301'}) CREATE (a)-[:USED_DEVICE {lastUsed: '2026-08-10'}]->(dev)",
      "MATCH (dev:Device {id: 'DEV-909'}), (a:Account {id: 'ACC-302'}) CREATE (a)-[:USED_DEVICE {lastUsed: '2026-08-10'}]->(dev)",
      "MATCH (dev:Device {id: 'DEV-909'}), (a:Account {id: 'ACC-303'}) CREATE (a)-[:USED_DEVICE {lastUsed: '2026-08-11'}]->(dev)",
      "MATCH (dev:Device {id: 'DEV-909'}), (a:Account {id: 'ACC-304'}) CREATE (a)-[:USED_DEVICE {lastUsed: '2026-08-12'}]->(dev)",

      "MATCH (ip:IPAddress {id: 'IP-002'}), (a:Account {id: 'ACC-301'}) CREATE (a)-[:LOGGED_IN_FROM {lastLogin: '2026-08-12'}]->(ip)",
      "MATCH (ip:IPAddress {id: 'IP-002'}), (a:Account {id: 'ACC-302'}) CREATE (a)-[:LOGGED_IN_FROM {lastLogin: '2026-08-12'}]->(ip)",
      "MATCH (ip:IPAddress {id: 'IP-002'}), (a:Account {id: 'ACC-303'}) CREATE (a)-[:LOGGED_IN_FROM {lastLogin: '2026-08-12'}]->(ip)",
      "MATCH (ip:IPAddress {id: 'IP-002'}), (a:Account {id: 'ACC-304'}) CREATE (a)-[:LOGGED_IN_FROM {lastLogin: '2026-08-12'}]->(ip)",

      "MATCH (a1:Account {id: 'ACC-301'}), (a2:Account {id: 'ACC-302'}) CREATE (a1)-[:TRANSFERRED_TO {transactionId: 'TX-3001', amount: 15000.00, currency: 'USD', timestamp: '2026-08-11T10:00:00Z', channel: 'P2P'}]->(a2)",
      "MATCH (a2:Account {id: 'ACC-302'}), (a3:Account {id: 'ACC-303'}) CREATE (a2)-[:TRANSFERRED_TO {transactionId: 'TX-3002', amount: 14800.00, currency: 'USD', timestamp: '2026-08-11T11:00:00Z', channel: 'P2P'}]->(a3)",
      "MATCH (a3:Account {id: 'ACC-303'}), (a4:Account {id: 'ACC-304'}) CREATE (a3)-[:TRANSFERRED_TO {transactionId: 'TX-3003', amount: 14500.00, currency: 'USD', timestamp: '2026-08-11T12:00:00Z', channel: 'P2P'}]->(a4)",

      // Path to Sanctioned
      "MATCH (a104:Account {id: 'ACC-104'}), (a501:Account {id: 'ACC-501'}) CREATE (a104)-[:TRANSFERRED_TO {transactionId: 'TX-9001', amount: 180000.00, currency: 'USD', timestamp: '2026-08-08T15:00:00Z', channel: 'SWIFT'}]->(a501)",
      "MATCH (a501:Account {id: 'ACC-501'}), (a999:Account {id: 'ACC-999'}) CREATE (a501)-[:TRANSFERRED_TO {transactionId: 'TX-9002', amount: 175000.00, currency: 'USD', timestamp: '2026-08-09T09:30:00Z', channel: 'CRYPTO_MIXER'}]->(a999)",

      // Legitimate
      "MATCH (dev1:Device {id: 'DEV-901'}), (a401:Account {id: 'ACC-401'}) CREATE (a401)-[:USED_DEVICE {lastUsed: '2026-08-13'}]->(dev1)",
      "MATCH (ip1:IPAddress {id: 'IP-001'}), (a401:Account {id: 'ACC-401'}) CREATE (a401)-[:LOGGED_IN_FROM {lastLogin: '2026-08-13'}]->(ip1)",
      "MATCH (ip1:IPAddress {id: 'IP-001'}), (a402:Account {id: 'ACC-402'}) CREATE (a402)-[:LOGGED_IN_FROM {lastLogin: '2026-08-13'}]->(ip1)"
    ];

    for (const rq of relQueries) {
      await session.run(rq);
    }

    console.log('----------------------------------------------------');
    console.log('🎉 CognoDB Cloud database successfully seeded with live graph data!');
    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('❌ Error during graph seeding:', err);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

runSeed();
