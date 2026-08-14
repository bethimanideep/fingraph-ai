/**
 * FinGraph AI - Enterprise HTML5 2D Canvas Force-Directed Graph Engine
 * High-performance, anti-aliased, restrained visual design with touch & mouse controls.
 */
class GraphRenderer {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById(containerId);
    this.ctx = this.canvas.getContext('2d');

    this.nodes = [];
    this.relationships = [];
    this.nodeMap = new Map();

    // Selection & Highlight State
    this.selectedNode = null;
    this.highlightNodes = new Set();
    this.highlightLinks = new Set();
    this.hoverNode = null;

    // Viewport transform
    this.zoom = 0.85;
    this.panX = 0;
    this.panY = 0;

    // Pan / Drag State
    this.isPanning = false;
    this.draggedNode = null;
    this.startMouseX = 0;
    this.startMouseY = 0;

    // Touch State
    this.touchDist = 0;

    // Physics Engine Controls (Spacious, airy enterprise layout)
    this.physicsEnabled = true;
    this.alpha = 1;
    this.repulsion = -1200;
    this.springLength = 220;
    this.springStiffness = 0.04;
    this.damping = 0.85;

    // Callbacks
    this.onNodeSelect = null;
    this.onNodeHover = null;

    this.initCanvasSize();
    this.setupEventListeners();
    this.startAnimationLoop();
  }

  initCanvasSize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || (window.innerHeight - 100);
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    if (this.panX === 0 && this.panY === 0) {
      this.panX = this.width / 2;
      this.panY = this.height / 2;
    }
  }

  setData(nodesData, relsData) {
    this.nodeMap.clear();
    this.nodes = nodesData.map(n => {
      const existing = this.nodeMap.get(n.id);
      const x = existing ? existing.x : (Math.random() - 0.5) * (this.width * 0.8);
      const y = existing ? existing.y : (Math.random() - 0.5) * (this.height * 0.8);
      const nodeObj = {
        ...n,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: this.getNodeRadius(n)
      };
      this.nodeMap.set(n.id, nodeObj);
      return nodeObj;
    });

    this.relationships = relsData.map(r => {
      return {
        ...r,
        sourceNode: this.nodeMap.get(r.source),
        targetNode: this.nodeMap.get(r.target)
      };
    }).filter(r => r.sourceNode && r.targetNode);

    this.alpha = 1;
    this.clearHighlights();
  }

  getNodeRadius(node) {
    const labels = node.labels || [];
    const props = node.properties || {};
    if (labels.includes('Account')) {
      if (props.status === 'SANCTIONED') return 18;
      if (props.status === 'FLAGGED') return 15;
      return 13;
    }
    if (labels.includes('Company')) return 14;
    if (labels.includes('Person')) return 13;
    return 12;
  }

  getNodeColor(node) {
    const labels = node.labels || [];
    const props = node.properties || {};

    if (labels.includes('Account')) {
      if (props.status === 'SANCTIONED') return '#ef4444';
      if (props.status === 'FLAGGED') return '#f87171';
      if (props.status === 'SUSPICIOUS') return '#f59e0b';
      return '#38bdf8';
    }
    if (labels.includes('Person')) return '#34d399';
    if (labels.includes('Company')) return '#fbbf24';
    if (labels.includes('Device')) return '#c084fc';
    if (labels.includes('IPAddress')) return '#f472b6';
    return '#94a3b8';
  }

  setHighlights(nodeIds = [], linkIds = []) {
    this.highlightNodes = new Set(nodeIds);
    this.highlightLinks = new Set(linkIds);
  }

  clearHighlights() {
    this.highlightNodes.clear();
    this.highlightLinks.clear();
  }

  isNodeHighlighted(node) {
    if (this.highlightNodes.size === 0) return false;
    const propId = node.properties && node.properties.id;
    return this.highlightNodes.has(node.id) || (propId && this.highlightNodes.has(propId));
  }

  stepPhysics() {
    if (!this.physicsEnabled || this.alpha < 0.005) return;

    for (let i = 0; i < this.nodes.length; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const n2 = this.nodes[j];
        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 600) {
          let force = (this.repulsion / (dist * dist)) * this.alpha;
          let fx = (dx / dist) * force;
          let fy = (dy / dist) * force;
          n1.vx += fx;
          n1.vy += fy;
          n2.vx -= fx;
          n2.vy -= fy;
        }
      }
    }

    this.relationships.forEach(rel => {
      const s = rel.sourceNode;
      const t = rel.targetNode;
      let dx = t.x - s.x;
      let dy = t.y - s.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let force = (dist - this.springLength) * this.springStiffness * this.alpha;
      let fx = (dx / dist) * force;
      let fy = (dy / dist) * force;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    });

    this.nodes.forEach(n => {
      if (n === this.draggedNode) return;
      n.vx -= n.x * 0.0006 * this.alpha;
      n.vy -= n.y * 0.0006 * this.alpha;

      n.vx *= this.damping;
      n.vy *= this.damping;
      n.x += n.vx;
      n.y += n.vy;
    });

    this.alpha *= 0.98;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);

    const hasActiveHighlights = this.highlightNodes.size > 0;

    // Draw Relationships (Edges)
    this.relationships.forEach(rel => {
      const s = rel.sourceNode;
      const t = rel.targetNode;
      const sHighlighted = this.isNodeHighlighted(s);
      const tHighlighted = this.isNodeHighlighted(t);
      const isHighlighted = this.highlightLinks.has(rel.id) || (sHighlighted && tHighlighted);
      const isDimmed = hasActiveHighlights && !isHighlighted;

      this.ctx.beginPath();
      this.ctx.moveTo(s.x, s.y);
      this.ctx.lineTo(t.x, t.y);

      if (isHighlighted) {
        this.ctx.strokeStyle = '#38bdf8';
        this.ctx.lineWidth = 2 / this.zoom;
        this.ctx.setLineDash([5, 3]);
      } else {
        this.ctx.strokeStyle = isDimmed ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.12)';
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.setLineDash([]);
      }
      this.ctx.stroke();

      // Draw Directional Arrowhead
      const angle = Math.atan2(t.y - s.y, t.x - s.x);
      const arrowDist = t.radius + 4;
      const arrowX = t.x - Math.cos(angle) * arrowDist;
      const arrowY = t.y - Math.sin(angle) * arrowDist;

      this.ctx.save();
      this.ctx.translate(arrowX, arrowY);
      this.ctx.rotate(angle);
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-6, -3.5);
      this.ctx.lineTo(-6, 3.5);
      this.ctx.closePath();
      this.ctx.fillStyle = isHighlighted ? '#38bdf8' : (isDimmed ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.25)');
      this.ctx.fill();
      this.ctx.restore();

      // Relationship Type Text Label
      if (isHighlighted || (this.zoom > 0.75 && !isDimmed)) {
        const midX = (s.x + t.x) / 2;
        const midY = (s.y + t.y) / 2;
        this.ctx.font = `${8 / this.zoom}px JetBrains Mono, monospace`;
        this.ctx.fillStyle = isHighlighted ? '#fbbf24' : 'rgba(148, 163, 184, 0.65)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(rel.type, midX, midY - 4);
      }
    });

    // Draw Nodes
    this.nodes.forEach(node => {
      const isSelected = this.selectedNode && this.selectedNode.id === node.id;
      const isHighlighted = this.isNodeHighlighted(node);
      const isHover = this.hoverNode && this.hoverNode.id === node.id;
      const isDimmed = hasActiveHighlights && !isHighlighted && !isSelected;
      const color = this.getNodeColor(node);

      // Clean selection / highlight outline ring
      if (isSelected || isHighlighted || isHover) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
        this.ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(56, 189, 248, 0.6)';
        this.ctx.lineWidth = 1.5 / this.zoom;
        this.ctx.stroke();
      }

      // Main Node Circle
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.globalAlpha = isDimmed ? 0.15 : 1;
      this.ctx.fillStyle = color;
      this.ctx.fill();

      // 1px Solid Perimeter Stroke
      this.ctx.lineWidth = isSelected ? 2 / this.zoom : 1 / this.zoom;
      this.ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(0, 0, 0, 0.5)';
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;

      // Primary Node Text Label
      if (isSelected || isHighlighted || (!isDimmed && this.zoom > 0.55)) {
        this.ctx.font = `500 ${10 / this.zoom}px Inter, sans-serif`;
        this.ctx.globalAlpha = isDimmed ? 0.15 : 1;
        this.ctx.fillStyle = isSelected ? '#ffffff' : (isHighlighted ? '#f8fafc' : '#cbd5e1');
        this.ctx.textAlign = 'center';
        const propId = node.properties.id || '';
        const labelText = node.properties.ownerName || node.properties.fullName || node.properties.name || propId || node.id;
        this.ctx.fillText(labelText, node.x, node.y + node.radius + 12);

        // Secondary Monospace ID Badge (for highlighted active nodes)
        if (isHighlighted && propId) {
          this.ctx.font = `600 ${8.5 / this.zoom}px JetBrains Mono, monospace`;
          this.ctx.fillStyle = '#fbbf24';
          this.ctx.fillText(propId, node.x, node.y + node.radius + 23);
        }
        this.ctx.globalAlpha = 1;
      }
    });

    this.ctx.restore();
  }

  startAnimationLoop() {
    const loop = () => {
      this.stepPhysics();
      this.draw();
      requestAnimationFrame(loop);
    };
    loop();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.initCanvasSize());

    // Mouse Wheel Zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.max(0.2, Math.min(4, this.zoom * zoomFactor));

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;
    });

    // Mouse Down
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldPos = this.screenToWorld(mouseX, mouseY);
      const clickedNode = this.findNodeAt(worldPos.x, worldPos.y);

      if (clickedNode) {
        this.draggedNode = clickedNode;
        this.selectedNode = clickedNode;
        this.alpha = 0.5;
        if (this.onNodeSelect) this.onNodeSelect(clickedNode);
      } else {
        this.isPanning = true;
        this.startMouseX = mouseX - this.panX;
        this.startMouseY = mouseY - this.panY;
      }
    });

    // Mouse Move
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (this.draggedNode) {
        const worldPos = this.screenToWorld(mouseX, mouseY);
        this.draggedNode.x = worldPos.x;
        this.draggedNode.y = worldPos.y;
      } else if (this.isPanning) {
        this.panX = mouseX - this.startMouseX;
        this.panY = mouseY - this.startMouseY;
      } else {
        const worldPos = this.screenToWorld(mouseX, mouseY);
        const hover = this.findNodeAt(worldPos.x, worldPos.y);
        if (hover !== this.hoverNode) {
          this.hoverNode = hover;
          this.canvas.style.cursor = hover ? 'pointer' : 'default';
        }
      }
    });

    // Mouse Up
    window.addEventListener('mouseup', () => {
      this.draggedNode = null;
      this.isPanning = false;
    });

    // Touch Event Handling for Tablets & Mobile
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const rect = this.canvas.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const touchY = e.touches[0].clientY - rect.top;

        const worldPos = this.screenToWorld(touchX, touchY);
        const clickedNode = this.findNodeAt(worldPos.x, worldPos.y);

        if (clickedNode) {
          this.draggedNode = clickedNode;
          this.selectedNode = clickedNode;
          this.alpha = 0.5;
          if (this.onNodeSelect) this.onNodeSelect(clickedNode);
        } else {
          this.isPanning = true;
          this.startMouseX = touchX - this.panX;
          this.startMouseY = touchY - this.panY;
        }
      } else if (e.touches.length === 2) {
        this.touchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const rect = this.canvas.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const touchY = e.touches[0].clientY - rect.top;

        if (this.draggedNode) {
          const worldPos = this.screenToWorld(touchX, touchY);
          this.draggedNode.x = worldPos.x;
          this.draggedNode.y = worldPos.y;
        } else if (this.isPanning) {
          this.panX = touchX - this.startMouseX;
          this.panY = touchY - this.startMouseY;
        }
      } else if (e.touches.length === 2) {
        const newDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (this.touchDist > 0) {
          const zoomFactor = newDist / this.touchDist;
          this.zoom = Math.max(0.2, Math.min(4, this.zoom * zoomFactor));
        }
        this.touchDist = newDist;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.draggedNode = null;
      this.isPanning = false;
      this.touchDist = 0;
    });
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom
    };
  }

  findNodeAt(wx, wy) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = n.x - wx;
      const dy = n.y - wy;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 6) {
        return n;
      }
    }
    return null;
  }

  resetView() {
    this.zoom = 0.85;
    this.panX = this.width / 2;
    this.panY = this.height / 2;
    this.alpha = 1;
  }
}
