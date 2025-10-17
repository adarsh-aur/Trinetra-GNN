import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Chart from 'chart.js/auto';
import * as d3 from 'd3';
import '../styles/dashboard.css';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize charts
    initializeCharts();
    initializeNetworkGraph();
  }, []);

  const initializeCharts = () => {
    // Attack Types Chart
    const attackTypesCtx = document.getElementById('attackTypesChart');
    if (attackTypesCtx) {
      new Chart(attackTypesCtx.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['SQL Injection', 'Command Injection', 'Directory Traversal', 'File Upload', 'XSS', 'CSRF', 'RFI', 'Brute Force', 'Credential Stuffing', 'RCE', 'Port Scan', 'LFI'],
          datasets: [{
            data: [18, 15, 12, 10, 8, 7, 6, 5, 5, 4, 3, 2],
            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#e5e7eb',
                padding: 20,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            }
          },
          cutout: '70%'
        }
      });
    }

    // Severity Over Time Chart
    const severityCtx = document.getElementById('severityOverTimeChart');
    if (severityCtx) {
      new Chart(severityCtx.getContext('2d'), {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
          datasets: [
            {
              label: 'Critical',
              data: [2, 3, 1, 4, 3, 5, 2, 6, 5],
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.3,
              fill: true
            },
            {
              label: 'High',
              data: [5, 4, 6, 5, 7, 4, 6, 5, 7],
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              tension: 0.3,
              fill: true
            },
            {
              label: 'Medium',
              data: [8, 7, 9, 8, 6, 7, 9, 8, 10],
              borderColor: '#eab308',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              tension: 0.3,
              fill: true
            },
            {
              label: 'Low',
              data: [12, 10, 11, 13, 12, 14, 11, 13, 15],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.3,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#e5e7eb',
                usePointStyle: true,
                pointStyle: 'circle'
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#9ca3af' }
            },
            y: {
              grid: { color: 'rgba(156, 163, 175, 0.1)' },
              ticks: { color: '#9ca3af' }
            }
          }
        }
      });
    }
  };

  const initializeNetworkGraph = () => {
    const container = document.getElementById('networkGraph');
    if (!container) return;

    const width = container.clientWidth;
    const height = 384;

    const nodes = [
      { id: 1, name: "Node1", group: 1 },
      { id: 2, name: "Node2", group: 1 },
      { id: 3, name: "Node3", group: 1 },
      { id: 4, name: "Node4", group: 1 },
      { id: 5, name: "Node5", group: 1 },
      { id: 6, name: "Node6", group: 1 },
      { id: 7, name: "Node7", group: 1 },
      { id: 8, name: "Node8", group: 1 },
      { id: 9, name: "Node9", group: 1 },
      { id: 10, name: "Node10", group: 1 },
      { id: 11, name: "Service1", group: 2 },
      { id: 12, name: "Service2", group: 2 },
      { id: 13, name: "Service3", group: 2 },
      { id: 14, name: "Service4", group: 2 },
      { id: 15, name: "Service5", group: 2 }
    ];

    const links = [
      { source: 1, target: 11, value: 5 },
      { source: 1, target: 15, value: 3 },
      { source: 2, target: 11, value: 7 },
      { source: 2, target: 14, value: 4 },
      { source: 3, target: 12, value: 2 },
      { source: 4, target: 11, value: 9 },
      { source: 4, target: 13, value: 6 },
      { source: 5, target: 12, value: 8 },
      { source: 5, target: 14, value: 5 },
      { source: 7, target: 12, value: 4 },
      { source: 8, target: 11, value: 5 },
      { source: 9, target: 14, value: 6 },
      { source: 10, target: 12, value: 7 }
    ];

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const svg = d3.select("#networkGraph")
      .append("svg")
      .attr("viewBox", [0, 0, width, height]);

    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", d => color(d.group))
      .call(drag(simulation));

    node.append("title").text(d => d.name);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });

    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-bg-elements">
          <div className="hero-grid"></div>
          {[...Array(12)].map((_, i) => (
            <div key={i} className="floating-icon">
              {['🛡️', '🔒', '🌐', '⚡', '🔍', '📊', '📡', '🚨', '💻', '🌟', '🔧', '📡'][i]}
            </div>
          ))}
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`floating-shape ${['shape-circle', 'shape-square', 'shape-triangle', 'shape-circle', 'shape-square'][i]}`}></div>
          ))}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="data-stream"></div>
          ))}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="pulse-dot"></div>
          ))}
        </div>
        
        <div className="hero-content">
          <h1>CloudGraph Sentinel</h1>
          <p>A unified threat intelligence platform that transforms fragmented multi-cloud security data into actionable security narratives using Graph Neural Networks.</p>
          
          <div className="hero-features">
            <div className="feature-badge">
              <span className="feature-icon">🤖</span>
              <span>AI-Powered Detection</span>
            </div>
            <div className="feature-badge">
              <span className="feature-icon">☁️</span>
              <span>Multi-Cloud Support</span>
            </div>
            <div className="feature-badge">
              <span className="feature-icon">📈</span>
              <span>Real-time Analytics</span>
            </div>
          </div>
        </div>

        <div className="scroll-indicator" onClick={() => document.querySelector('.dashboard-main').scrollIntoView({ behavior: 'smooth' })}>
          <div className="scroll-arrow"></div>
        </div>
      </div>

      {/* Dashboard Main Content */}
      <main className="dashboard-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Cyber Attack Dashboard</h1>
            <p className="text-gray-400">Real-time visualization of security threats and attack patterns</p>
            {user && <p className="text-sm text-gray-500 mt-1">Welcome, {user.fullName}</p>}
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
              Refresh
            </button>
            <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md">
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 glow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Attacks</p>
                <h3 className="text-2xl font-bold text-white mt-1">127</h3>
              </div>
              <div className="bg-blue-500 bg-opacity-20 p-3 rounded-full">
                <span className="text-blue-400 text-2xl">📊</span>
              </div>
            </div>
            <div className="mt-4 text-green-400 text-sm">
              ↑ 12% from last period
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 glow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Critical Severity</p>
                <h3 className="text-2xl font-bold text-white mt-1">23</h3>
              </div>
              <div className="bg-red-500 bg-opacity-20 p-3 rounded-full">
                <span className="text-red-400 text-2xl">🚨</span>
              </div>
            </div>
            <div className="mt-4 text-red-400 text-sm">
              ↑ 18% from last period
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 glow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Attack Types</p>
                <h3 className="text-2xl font-bold text-white mt-1">12</h3>
              </div>
              <div className="bg-yellow-500 bg-opacity-20 p-3 rounded-full">
                <span className="text-yellow-400 text-2xl">🛡️</span>
              </div>
            </div>
            <div className="mt-4 text-yellow-400 text-sm">
              5 new types detected
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 glow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Affected Nodes</p>
                <h3 className="text-2xl font-bold text-white mt-1">10</h3>
              </div>
              <div className="bg-purple-500 bg-opacity-20 p-3 rounded-full">
                <span className="text-purple-400 text-2xl">💻</span>
              </div>
            </div>
            <div className="mt-4 text-purple-400 text-sm">
              Node4 most targeted
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 glow-card">
            <h2 className="text-lg font-semibold text-white mb-4">Attack Types Distribution</h2>
            <div className="h-64">
              <canvas id="attackTypesChart"></canvas>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 glow-card">
            <h2 className="text-lg font-semibold text-white mb-4">Severity Over Time</h2>
            <div className="h-64">
              <canvas id="severityOverTimeChart"></canvas>
            </div>
          </div>
        </div>

        {/* Network Graph */}
        <div className="bg-gray-800 rounded-lg p-6 glow-card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Attack Network Visualization</h2>
          <div id="networkGraph" className="h-96 w-full rounded-md bg-gray-900"></div>
        </div>

        {/* Attack Events Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Recent Attack Events</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Event ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Source IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Attack Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Target</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                <tr className="hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-mono text-blue-400">EVT-688508</td>
                  <td className="px-6 py-4 text-sm text-gray-300">2025-09-06 13:31</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-300">63.58.36.189</td>
                  <td className="px-6 py-4"><span className="text-sm text-red-400">Command Injection</span></td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full severity-medium">Medium</span></td>
                  <td className="px-6 py-4 text-sm text-gray-300">Node4 → Service1</td>
                </tr>
                <tr className="hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-mono text-blue-400">EVT-817870</td>
                  <td className="px-6 py-4 text-sm text-gray-300">2025-09-02 16:51</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-300">54.172.69.180</td>
                  <td className="px-6 py-4"><span className="text-sm text-red-400">Command Injection</span></td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full severity-critical">Critical</span></td>
                  <td className="px-6 py-4 text-sm text-gray-300">Node5 → Service4</td>
                </tr>
                <tr className="hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-mono text-blue-400">EVT-881177</td>
                  <td className="px-6 py-4 text-sm text-gray-300">2025-08-27 01:45</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-300">55.234.242.146</td>
                  <td className="px-6 py-4"><span className="text-sm text-orange-400">SQL Injection</span></td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full severity-high">High</span></td>
                  <td className="px-6 py-4 text-sm text-gray-300">Node3 → Service4</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;