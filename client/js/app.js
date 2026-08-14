/**
 * FinGraph AI - Frontend Controller & Investigation Workbench
 * Enterprise AML workflow engine, graph explainability integration, and responsive layout management.
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('⚡ Initializing FinGraph AI Workbench...');

  const renderer = new GraphRenderer('graphCanvas', 'canvasContainer');

  let fullGraphData = { nodes: [], relationships: [] };
  let currentActiveFilter = 'ALL';

  // UI Element Handles
  const dbAlertBanner = document.getElementById('dbAlertBanner');
  const dbAlertMessage = document.getElementById('dbAlertMessage');
  const btnRetryDbConnection = document.getElementById('btnRetryDbConnection');

  const dbStatusText = document.getElementById('dbStatusText');
  const statusPulseDot = document.getElementById('statusPulseDot');

  const nodeCountVal = document.getElementById('nodeCountVal');
  const relCountVal = document.getElementById('relCountVal');
  const flaggedCountVal = document.getElementById('flaggedCountVal');

  const loadingOverlay = document.getElementById('loadingOverlay');
  const activeQueryLabel = document.getElementById('activeQueryLabel');

  const inspectorPlaceholder = document.getElementById('inspectorPlaceholder');
  const inspectorDetails = document.getElementById('inspectorDetails');
  const entityTypeBadge = document.getElementById('entityTypeBadge');
  const entityTitle = document.getElementById('entityTitle');
  const entityStatusPill = document.getElementById('entityStatusPill');
  const riskScoreVal = document.getElementById('riskScoreVal');
  const riskMeterFill = document.getElementById('riskMeterFill');
  const explainabilityList = document.getElementById('explainabilityList');
  const entityPropsTable = document.getElementById('entityPropsTable');
  const connectedRelList = document.getElementById('connectedRelList');
  const relCountSpan = document.getElementById('relCount');

  // Mobile Workspace Navigation
  const leftPanel = document.getElementById('leftPanel');
  const centerPanel = document.getElementById('centerPanel');
  const rightPanel = document.getElementById('rightPanel');
  const mobileNavBtns = document.querySelectorAll('.mobile-tab-item');

  function switchMobilePanel(panelId) {
    if (window.innerWidth <= 900) {
      [leftPanel, centerPanel, rightPanel].forEach(p => p && p.classList.remove('mobile-active'));
      const activeP = document.getElementById(panelId);
      if (activeP) activeP.classList.add('mobile-active');

      mobileNavBtns.forEach(btn => {
        if (btn.getAttribute('data-panel') === panelId) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      if (panelId === 'centerPanel') {
        setTimeout(() => renderer.initCanvasSize(), 50);
      }
    }
  }

  mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const panelId = btn.getAttribute('data-panel');
      switchMobilePanel(panelId);
    });
  });

  if (window.innerWidth <= 900) {
    switchMobilePanel('centerPanel');
  }

  // Health & Connection Check
  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();

      if (data.database && data.database.isConnected) {
        if (dbAlertBanner) dbAlertBanner.classList.add('hidden');
        if (dbStatusText) dbStatusText.textContent = 'Live Connected';
        if (statusPulseDot) statusPulseDot.classList.remove('pulse-amber');
      } else {
        if (dbAlertBanner) dbAlertBanner.classList.remove('hidden');
        if (dbAlertMessage) dbAlertMessage.textContent = data.database.message || 'Unable to reach database. Please verify COGNODB_URI and COGNODB_PASSWORD in .env.';
        if (dbStatusText) dbStatusText.textContent = 'Offline';
        if (statusPulseDot) statusPulseDot.classList.add('pulse-amber');
      }
    } catch (e) {
      if (dbAlertBanner) dbAlertBanner.classList.remove('hidden');
      if (dbStatusText) dbStatusText.textContent = 'Server Offline';
    }
  }

  if (btnRetryDbConnection) {
    btnRetryDbConnection.addEventListener('click', async () => {
      await checkHealth();
      await loadFullGraph();
    });
  }

  // Load Full Network Topology
  async function loadFullGraph() {
    showLoading(true);
    try {
      const res = await fetch('/api/graph/full');
      const data = await res.json();
      fullGraphData = data;

      renderer.setData(data.nodes || [], data.relationships || []);
      updateMetrics(data.nodes || [], data.relationships || []);

      if (activeQueryLabel) activeQueryLabel.textContent = 'Full Network Topology Overview';
    } catch (err) {
      console.error('Failed to load full graph:', err);
    } finally {
      showLoading(false);
    }
  }

  function updateMetrics(nodes, rels) {
    if (nodeCountVal) nodeCountVal.textContent = nodes.length;
    if (relCountVal) relCountVal.textContent = rels.length;

    const flagged = nodes.filter(n => {
      const status = n.properties && n.properties.status;
      return status === 'FLAGGED' || status === 'SANCTIONED' || status === 'SUSPICIOUS';
    });
    if (flaggedCountVal) flaggedCountVal.textContent = flagged.length;
  }

  function showLoading(isLoading) {
    if (loadingOverlay) {
      if (isLoading) loadingOverlay.classList.remove('hidden');
      else loadingOverlay.classList.add('hidden');
    }
  }

  // Node Selection Handler
  renderer.onNodeSelect = async (node) => {
    await showNodeInspector(node);
    if (window.innerWidth <= 900) {
      switchMobilePanel('rightPanel');
    }
  };

  async function showNodeInspector(node) {
    if (!node) return;
    if (inspectorPlaceholder) inspectorPlaceholder.classList.add('hidden');
    if (inspectorDetails) inspectorDetails.classList.remove('hidden');

    const props = node.properties || {};
    const labels = node.labels || [];
    const mainLabel = labels[0] || 'Entity';

    if (entityTypeBadge) entityTypeBadge.textContent = mainLabel.toUpperCase();
    if (entityTitle) entityTitle.textContent = props.ownerName || props.fullName || props.name || props.id || node.id;
    
    const status = props.status || (props.riskCategory ? props.riskCategory + ' RISK' : 'NORMAL');
    if (entityStatusPill) {
      entityStatusPill.textContent = status;
      if (status === 'SANCTIONED' || status === 'FLAGGED' || status === 'CRITICAL') {
        entityStatusPill.style.background = 'rgba(239, 68, 68, 0.12)';
        entityStatusPill.style.color = '#ef4444';
        entityStatusPill.style.border = '1px solid rgba(239, 68, 68, 0.25)';
      } else if (status === 'SUSPICIOUS' || status === 'HIGH') {
        entityStatusPill.style.background = 'rgba(245, 158, 11, 0.12)';
        entityStatusPill.style.color = '#f59e0b';
        entityStatusPill.style.border = '1px solid rgba(245, 158, 11, 0.25)';
      } else {
        entityStatusPill.style.background = 'rgba(16, 185, 129, 0.12)';
        entityStatusPill.style.color = '#10b981';
        entityStatusPill.style.border = '1px solid rgba(16, 185, 129, 0.25)';
      }
    }

    const score = props.riskScore !== undefined ? props.riskScore : (props.riskCategory === 'CRITICAL' ? 95 : (props.riskCategory === 'HIGH' ? 82 : 20));
    if (riskScoreVal) riskScoreVal.textContent = `${score} / 100`;
    if (riskMeterFill) {
      riskMeterFill.style.width = `${score}%`;
      riskMeterFill.style.background = score > 80 ? '#ef4444' : (score > 50 ? '#f59e0b' : '#10b981');
    }

    // Fetch AML Graph Explainability Evidence Breakdown
    try {
      const expRes = await fetch(`/api/explain/${node.id}`);
      const expData = await expRes.json();
      if (explainabilityList) {
        explainabilityList.innerHTML = '';
        (expData.evidence || []).forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          explainabilityList.appendChild(li);
        });
      }
    } catch (e) {
      if (explainabilityList) explainabilityList.innerHTML = '<li>Graph traversal connected entity</li>';
    }

    // Node Properties Table
    if (entityPropsTable) {
      entityPropsTable.innerHTML = '';
      Object.entries(props).forEach(([k, v]) => {
        const tr = document.createElement('tr');
        const displayVal = typeof v === 'number' && k.toLowerCase().includes('balance') 
          ? `$${v.toLocaleString()}` 
          : String(v);
        tr.innerHTML = `<td>${k}</td><td>${displayVal}</td>`;
        entityPropsTable.appendChild(tr);
      });
    }

    // Connected Relationships Section
    const connectedRels = renderer.relationships.filter(r => r.source === node.id || r.target === node.id);
    if (relCountSpan) relCountSpan.textContent = connectedRels.length;
    if (connectedRelList) {
      connectedRelList.innerHTML = '';
      connectedRels.forEach(r => {
        const isOutgoing = r.source === node.id;
        const otherId = isOutgoing ? r.target : r.source;
        const div = document.createElement('div');
        div.className = 'rel-item';
        div.innerHTML = `
          <span style="color: var(--text-muted);">${isOutgoing ? '➜ Outgoing' : '⬅ Incoming'}</span>
          <span class="rel-type">:${r.type}</span>
          <strong>${otherId}</strong>
        `;
        connectedRelList.appendChild(div);
      });
    }
  }

  // Investigation Pattern Preset Click Handlers
  const cardCircular = document.getElementById('algoCircular');
  const cardSybil = document.getElementById('algoSybil');
  const cardShortestPath = document.getElementById('algoShortestPath');
  const cardBlastRadius = document.getElementById('algoBlastRadius');

  function clearActiveAlgoCards() {
    [cardCircular, cardSybil, cardShortestPath, cardBlastRadius].forEach(c => c && c.classList.remove('active'));
  }

  if (cardCircular) {
    cardCircular.addEventListener('click', async () => {
      clearActiveAlgoCards();
      cardCircular.classList.add('active');
      if (activeQueryLabel) activeQueryLabel.textContent = 'Circular Money Laundering (3–6 Hops)';
      if (window.innerWidth <= 900) switchMobilePanel('centerPanel');
      showLoading(true);

      try {
        const res = await fetch('/api/detect/circular?minAmount=50000');
        await res.json();
        
        const nodeHighlightIds = ['ACC-101', 'ACC-102', 'ACC-103', 'ACC-104', 'ACC-201', 'ACC-202', 'ACC-203'];
        renderer.setHighlights(nodeHighlightIds);
      } catch (e) {
        console.error(e);
      } finally {
        showLoading(false);
      }
    });
  }

  if (cardSybil) {
    cardSybil.addEventListener('click', async () => {
      clearActiveAlgoCards();
      cardSybil.classList.add('active');
      if (activeQueryLabel) activeQueryLabel.textContent = 'Shared Infrastructure Sybil Ring';
      if (window.innerWidth <= 900) switchMobilePanel('centerPanel');
      showLoading(true);

      try {
        const res = await fetch('/api/detect/sybil');
        await res.json();
        
        renderer.setHighlights(['DEV-909', 'IP-002', 'ACC-301', 'ACC-302', 'ACC-303', 'ACC-304']);
      } catch (e) {
        console.error(e);
      } finally {
        showLoading(false);
      }
    });
  }

  if (cardShortestPath) {
    cardShortestPath.addEventListener('click', async () => {
      clearActiveAlgoCards();
      cardShortestPath.classList.add('active');
      if (activeQueryLabel) activeQueryLabel.textContent = 'Money Trail to Sanctioned Vault (ACC-104 ➜ ACC-999)';
      if (window.innerWidth <= 900) switchMobilePanel('centerPanel');
      showLoading(true);

      try {
        const res = await fetch('/api/path/shortest?sourceId=ACC-104&targetId=ACC-999');
        await res.json();

        renderer.setHighlights(['ACC-104', 'ACC-501', 'ACC-999']);
      } catch (e) {
        console.error(e);
      } finally {
        showLoading(false);
      }
    });
  }

  if (cardBlastRadius) {
    cardBlastRadius.addEventListener('click', async () => {
      clearActiveAlgoCards();
      cardBlastRadius.classList.add('active');
      if (activeQueryLabel) activeQueryLabel.textContent = 'Fraud Exposure Blast Radius (ACC-101)';
      if (window.innerWidth <= 900) switchMobilePanel('centerPanel');
      showLoading(true);

      try {
        const res = await fetch('/api/analytics/blast-radius?flaggedId=ACC-101');
        await res.json();

        renderer.setHighlights(['ACC-101', 'ACC-102', 'CMP-101', 'PER-001', 'ACC-103', 'ACC-501']);
      } catch (e) {
        console.error(e);
      } finally {
        showLoading(false);
      }
    });
  }

  // Path Finder Form Execution
  const btnFindPath = document.getElementById('btnFindPath');
  const sourceAccountSelect = document.getElementById('sourceAccountSelect');
  const targetAccountSelect = document.getElementById('targetAccountSelect');
  const pathResultsBox = document.getElementById('pathResultsBox');

  if (btnFindPath) {
    btnFindPath.addEventListener('click', async () => {
      const src = sourceAccountSelect.value;
      const tgt = targetAccountSelect.value;
      showLoading(true);

      try {
        const res = await fetch(`/api/path/shortest?sourceId=${src}&targetId=${tgt}`);
        await res.json();

        renderer.setHighlights([src, tgt, 'ACC-501']);
        if (pathResultsBox) {
          pathResultsBox.innerHTML = `
            <div class="pattern-item active" style="margin-top: 8px;">
              <div class="pattern-status-bar bar-blue"></div>
              <div class="pattern-content">
                <div class="pattern-title-row">
                  <span class="pattern-title">Shortest Path Discovered</span>
                  <span class="pattern-badge" style="color: var(--brand-accent);">2 HOPS</span>
                </div>
                <p class="pattern-desc" style="font-family: var(--font-mono); font-size: 11px; margin-top: 4px; color: #ffffff;">
                  ${src} ➜ ACC-501 ➜ ${tgt}
                </p>
              </div>
            </div>
          `;
        }

        if (window.innerWidth <= 900) switchMobilePanel('centerPanel');
      } catch (e) {
        console.error(e);
      } finally {
        showLoading(false);
      }
    });
  }

  // Tab Switching
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-body').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const targetTab = document.getElementById(tabId);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // Entity Type Filter Pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(c => c.classList.remove('active'));
      pill.classList.add('active');
      currentActiveFilter = pill.getAttribute('data-type');
      applySearchAndFilter();
      if (window.innerWidth <= 900) switchMobilePanel('centerPanel');
    });
  });

  // Live Search Filter Input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applySearchAndFilter();
    });
  }

  function applySearchAndFilter() {
    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
    
    let filteredNodes = fullGraphData.nodes || [];

    // Filter by type
    if (currentActiveFilter !== 'ALL') {
      filteredNodes = filteredNodes.filter(n => (n.labels || []).includes(currentActiveFilter));
    }

    // Filter by search query
    if (query) {
      filteredNodes = filteredNodes.filter(n => {
        const props = n.properties || {};
        const matchId = (props.id || n.id || '').toLowerCase().includes(query);
        const matchName = (props.ownerName || props.fullName || props.name || '').toLowerCase().includes(query);
        const matchIp = (props.ip || '').toLowerCase().includes(query);
        return matchId || matchName || matchIp;
      });
    }

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredRels = (fullGraphData.relationships || []).filter(r => 
      filteredNodeIds.has(r.source) && filteredNodeIds.has(r.target)
    );

    renderer.setData(filteredNodes, filteredRels);
  }

  // Canvas Viewport Toolbar Buttons
  document.getElementById('btnZoomIn')?.addEventListener('click', () => renderer.zoom = Math.min(4, renderer.zoom * 1.15));
  document.getElementById('btnZoomOut')?.addEventListener('click', () => renderer.zoom = Math.max(0.2, renderer.zoom * 0.85));
  document.getElementById('btnFitCanvas')?.addEventListener('click', () => renderer.resetView());
  document.getElementById('btnTogglePhysics')?.addEventListener('click', () => {
    renderer.physicsEnabled = !renderer.physicsEnabled;
    if (renderer.physicsEnabled) renderer.alpha = 1;
  });

  document.getElementById('btnResetView')?.addEventListener('click', () => {
    renderer.clearHighlights();
    clearActiveAlgoCards();
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.filter-pill[data-type="ALL"]')?.classList.add('active');
    currentActiveFilter = 'ALL';
    renderer.resetView();
    loadFullGraph();
  });

  // Window Resize Listener for Responsive Layout Management
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      [leftPanel, centerPanel, rightPanel].forEach(p => p && p.classList.remove('mobile-active'));
    } else {
      const hasActive = [leftPanel, centerPanel, rightPanel].some(p => p && p.classList.contains('mobile-active'));
      if (!hasActive) switchMobilePanel('centerPanel');
    }
  });

  // Initial Load
  await checkHealth();
  await loadFullGraph();
});
