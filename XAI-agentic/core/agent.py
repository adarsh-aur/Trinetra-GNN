import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any
from collections import deque

from core.config import Config
from core.llm_client import GroqClient
from core.token_manager import TokenManager
from models.gnn_detector import GNNAnomalyDetector
from models.zscore_detector import ZScoreAnomalyDetector
from utils.graph_analyzer import GraphAnalyzer
from utils.batch_processor import BatchProcessor
from utils.logger import setup_logger


class GNNAgent:
    """
    Autonomous agent that monitors GNN changes in real-time,
    detects anomalies, analyzes vulnerabilities, and takes actions
    """

    def __init__(self, config: Config):
        from core.cve_analyzer import CVEAnalyzer  # Import here to avoid circular dependency
        self.config = config
        self.logger = setup_logger(config.LOG_LEVEL, config.LOG_FILE)

        # Core components
        self.cve_analyzer = CVEAnalyzer(config)
        self.llm_client = GroqClient(config)
        self.token_manager = TokenManager(config)
        self.gnn_detector = GNNAnomalyDetector(config)
        self.zscore_detector = ZScoreAnomalyDetector(
            threshold=config.ZSCORE_THRESHOLD,
            window_size=config.WINDOW_SIZE
        )
        self.graph_analyzer = GraphAnalyzer()
        self.batch_processor = BatchProcessor(config)

        # Agent state
        self.memory = deque(maxlen=config.AGENT_MEMORY_SIZE)
        self.iteration = 0
        self.total_anomalies_detected = 0
        self.is_running = False

        # Action history
        self.actions_taken = []

        self.logger.info(f"Agent '{config.AGENT_NAME}' initialized")

    async def run(self):
        """Main agent loop"""
        self.is_running = True
        self.logger.info("Agent started autonomous monitoring")

        try:
            while self.is_running:
                await self._monitor_cycle()
                await asyncio.sleep(self.config.UPDATE_INTERVAL)
        except KeyboardInterrupt:
            self.logger.info("Agent stopped by user")
            self.is_running = False
        except Exception as e:
            self.logger.error(f"Agent error: {e}", exc_info=True)
            raise
        finally:
            # ✅ FIX: Cleanup resources
            await self._cleanup()

    async def _cleanup(self):
        """Cleanup resources"""
        try:
            if hasattr(self, 'llm_client'):
                await self.llm_client.close()
            self.logger.info("Resources cleaned up")
        except Exception as e:
            self.logger.error(f"Cleanup error: {e}")

    async def _monitor_cycle(self):
        """Single monitoring cycle"""
        self.iteration += 1

        # 1. Get graph data (from your GNN system)
        graph_data = await self._get_graph_snapshot()

        # 2. Process in batches
        batch_results = await self.batch_processor.process_graph(
            graph_data,
            self.gnn_detector,
            self.zscore_detector
        )

        # 3. Analyze results
        analysis = await self._analyze_batch_results(batch_results, graph_data)

        # 4. Update graph structure
        self.graph_analyzer.update_graph(
            graph_data['edge_index'],
            graph_data['num_nodes']
        )

        # 5. Generate agent reasoning
        agent_response = await self._agent_reasoning(analysis)

        # 6. Take autonomous actions
        actions = await self._take_actions(agent_response, analysis)

        # 7. Update memory
        self._update_memory(analysis, agent_response, actions)

        # 8. Log and report
        await self._generate_report(analysis, agent_response, actions)

        self.logger.info(
            f"Cycle {self.iteration}: {analysis['anomalous_nodes']} anomalies detected"
        )

    async def _get_graph_snapshot(self) -> Dict[str, Any]:
        """
        Get graph data from real-time syslog instead of synthetic data.

        This method now reads from syslogs.log and converts it to graph structure.
        """
        from utils.data_generator import load_syslog_and_generate_graph

        try:
            # Load syslog and convert to graph
            # This reads the last 1000 lines from syslogs.log
            graph_data = load_syslog_and_generate_graph(
                syslog_file="syslogs.log",
                max_lines=1000  # Process last 1000 log lines
            )

            self.logger.debug(f"Loaded graph from syslog: {graph_data.num_nodes} nodes")

            return {
                'x': graph_data.x,
                'edge_index': graph_data.edge_index,
                'num_nodes': graph_data.num_nodes,
                'num_edges': graph_data.edge_index.shape[1] // 2
            }

        except Exception as e:
            self.logger.error(f"Failed to load syslog graph: {e}")
            self.logger.info("Falling back to synthetic data")

            # Fallback to synthetic if syslog not available
            from utils.data_generator import generate_synthetic_graph
            graph_data = generate_synthetic_graph(num_nodes=200, num_features=16)

            return {
                'x': graph_data.x,
                'edge_index': graph_data.edge_index,
                'num_nodes': graph_data.num_nodes,
                'num_edges': graph_data.edge_index.shape[1] // 2
            }

    async def _analyze_batch_results(
            self,
            batch_results: Dict[str, Any],
            graph_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze batch processing results, now including CVE analysis."""

        anomalous_nodes = batch_results['anomalous_nodes']
        scores = batch_results['scores']
        z_scores = batch_results['z_scores']

        # --- 1. Analyze CVEs for anomalous nodes (New Integration) ---
        cve_intelligence = None
        if hasattr(self, 'cve_analyzer') and self.cve_analyzer:
            cve_intelligence = await self.cve_analyzer.analyze_anomalous_nodes(
                anomalous_nodes,
                # Pass a placeholder list for node_details since we generate them next
                [] 
            )
            
            # Print CVE report for console visibility
            cve_report = self.cve_analyzer.generate_cve_report(cve_intelligence)
            print(cve_report)
        # -------------------------------------------------------------

        # 2. Analyze top anomalous nodes and MERGE CVE data
        node_details = []
        for node_id in anomalous_nodes[:20]:
            metrics = self.graph_analyzer.analyze_node_importance(node_id)
            
            # 🎯 CRITICAL: Look up CVE data for the specific node_id
            node_cve_mapping = cve_intelligence.get('node_cve_mapping', {}) if cve_intelligence else {}
            node_cves = node_cve_mapping.get(node_id, [])

            node_details.append({
                'node_id': int(node_id),
                'anomaly_score': float(scores[node_id]),
                'z_score': float(z_scores[node_id]),
                'degree': metrics['degree'],
                'betweenness': float(metrics['betweenness']),
                'clustering': float(metrics['clustering']),
                'neighbors': len(metrics['neighbors']),
                # ADDED CVE CONTEXT for the LLM prompt and report
                'cves': node_cves, 
                'cve_count': len(node_cves),
                'cve_critical_count': len([c for c in node_cves if c['severity'] == 'CRITICAL'])
            })

        # Find vulnerable paths (retains original logic)
        vulnerable_paths = self.graph_analyzer.find_vulnerable_paths(
            anomalous_nodes,
            top_k=5
        )

        # 3. Calculate final analysis dictionary
        analysis = {
            # ... (All existing fields like timestamp, iteration, etc. remain the same)
            'timestamp': datetime.now().isoformat(),
            'iteration': self.iteration,
            'total_nodes': graph_data['num_nodes'],
            'total_edges': graph_data['num_edges'],
            'anomalous_nodes': len(anomalous_nodes),
            'anomaly_rate': len(anomalous_nodes) / graph_data['num_nodes'],
            'mean_score': float(scores.mean()),
            'max_score': float(scores.max()),
            'max_zscore': float(z_scores.max()) if len(z_scores) > 0 else 0,
            'threshold': self.config.ZSCORE_THRESHOLD,
            'node_details': node_details,
            'vulnerable_paths': vulnerable_paths,
            'batch_processing_time': batch_results['processing_time'],
            # ADDED CVE INTELLIGENCE AT TOP LEVEL
            'cve_intelligence': cve_intelligence 
        }

        self.total_anomalies_detected += len(anomalous_nodes)
        return analysis

    async def _agent_reasoning(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Agent uses LLM to reason about the situation"""

        # Prepare context with token management
        context = self._prepare_context(analysis)

        # Count tokens
        token_count = self.token_manager.count_tokens(context)

        if token_count > self.config.MAX_PROMPT_TOKENS:
            context = self.token_manager.truncate_context(
                context,
                self.config.MAX_PROMPT_TOKENS
            )
            self.logger.warning(f"Context truncated from {token_count} tokens")

        # Build agent prompt
        prompt = self._build_agent_prompt(analysis, context)

        # Query LLM
        response = await self.llm_client.generate(prompt)

        # Parse agent response
        parsed_response = self._parse_agent_response(response)

        return parsed_response

    def _prepare_context(self, analysis: Dict[str, Any]) -> str:
        """Prepare context from memory and current analysis"""

        context_parts = []

        # Add recent memory
        if len(self.memory) > 0:
            context_parts.append("RECENT HISTORY:")
            for mem in list(self.memory)[-5:]:
                context_parts.append(
                    f"- Iteration {mem['iteration']}: "
                    f"{mem['anomalies']} anomalies, "
                    f"Actions: {mem['actions']}"
                )

        # Add current analysis
        context_parts.append(f"\nCURRENT STATE:")
        context_parts.append(f"Iteration: {analysis['iteration']}")
        context_parts.append(f"Anomaly Rate: {analysis['anomaly_rate']:.2%}")
        context_parts.append(f"Critical Nodes: {len(analysis['node_details'])}")

        if analysis['vulnerable_paths']:
            context_parts.append(f"Vulnerable Paths: {len(analysis['vulnerable_paths'])}")

        return "\n".join(context_parts)

    def _build_agent_prompt(self, analysis: Dict[str, Any], context: str) -> str:
        """Enhanced prompt with CVE data for trusted, contextual reasoning (XAI Logic)."""
        
        cve_section = ""
        cve_intel = analysis.get('cve_intelligence')  # Retrieve the intelligence added in _analyze_batch_results
        
        # Build CVE summary section only if data exists
        if cve_intel and cve_intel.get('total_cves_found', 0) > 0:
            critical_cves = [cve['cve_id'] for cve in cve_intel.get('critical_cves', [])]
            high_cves = cve_intel.get('high_cves', [])
            kev_listed = [cve['cve_id'] for cve in cve_intel.get('kev_listed', [])]
            
            cve_section = f"""
    CVE INTELLIGENCE SUMMARY (External Context):
    - Total CVEs Found: {cve_intel.get('total_cves_found', 0)}
    - Critical/High Severity Count: {len(cve_intel.get('critical_cves', [])) + len(high_cves)}
    - Known Exploited (CISA KEV): {len(kev_listed)} ({', '.join(kev_listed[:3]) if kev_listed else 'None'})

    Top Critical CVEs: {', '.join(critical_cves[:3]) if critical_cves else 'None'}
    """

        # Prepare the core analysis data structure for the LLM
        prompt_data = {
            'timestamp': analysis['timestamp'],
            'graph_metrics': {
                'size': f"{analysis['total_nodes']} nodes, {analysis['total_edges']} edges",
                'anomaly_rate': f"{analysis['anomaly_rate']:.2%}",
                'max_zscore': analysis['max_zscore'],
            },
            # CRITICAL: Pass the entire enriched top nodes list (now containing CVEs)
            'top_anomalies_and_vulnerabilities': analysis['node_details'][:10],
            'critical_paths': analysis['vulnerable_paths'][:3]
        }
        
        prompt = f"""You are {self.config.AGENT_NAME}, an autonomous AI agent specialized in {self.config.AGENT_ROLE}.

    {context}

    CURRENT ANALYSIS (GNN XAI OUTPUT):
    ```json
    {json.dumps(prompt_data, indent=2)}
    ```

    {cve_section}

    As an autonomous agent with External CVE Intelligence, analyze the GNN's topological findings and the integrated vulnerability data.

XAI Reasoning Task:

Determine Severity and Confidence by correlating the GNN's anomaly score (XAI) with the external CVE Risk Score. (e.g., High Z-score + Critical CVE = CRITICAL Severity).

Generate Reasoning that explicitly connects the GNN's topological feature (e.g., 'degree: 0', 'clustering: 0') to the identified CVE. (e.g., "Isolated node [ID] running vulnerable software [CVE] suggests an external staging point.").

Populate the cve_analysis field describing how the vulnerability contributes to the threat.

Populate the patch_priority list with the top 3 CVE IDs that require immediate patching.

Response Format (JSON only): {{   "severity": "CRITICAL|HIGH|MEDIUM|LOW",   "confidence": 0.0-1.0,   "reasoning": "A human-readable, multi-paragraph analysis connecting GNN metrics to CVEs.",   "threats_identified": ["Exploitation via CVE-XXXX-XXXXX", "Unpatched High-Risk Asset"], "cve_analysis": "Detailed explanation of CVE impact on the anomalous nodes.",   "recommended_actions": [     {{"action": "action_name", "priority": "HIGH|MEDIUM|LOW", "reason": "why", "cve_related": "CVE-XXXX-XXXXX"}}   ],   "patch_priority": ["CVE-XXXX-XXXXX", "CVE-YYYY-YYYYY"],   "predictions": "What might happen next (e.g., Lateral movement via exploit).",   "questions": ["Any uncertainties"] }}

Respond ONLY with valid JSON."""


        return prompt

    def _parse_agent_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response into structured format"""
        try:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # Fallback
                return {
                    'severity': 'UNKNOWN',
                    'confidence': 0.5,
                    'reasoning': response,
                    'threats_identified': [],
                    'recommended_actions': [],
                    'predictions': '',
                    'questions': []
                }
        except Exception as e:
            self.logger.error(f"Failed to parse agent response: {e}")
            return {
                'severity': 'ERROR',
                'confidence': 0.0,
                'reasoning': f"Parse error: {str(e)}",
                'threats_identified': [],
                'recommended_actions': [],
                'predictions': '',
                'questions': []
            }

    async def _take_actions(
            self,
            agent_response: Dict[str, Any],
            analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute recommended actions autonomously"""

        actions_taken = []

        if not self.config.AUTO_RESPONSE:
            return actions_taken

        # Execute high-priority actions
        for action in agent_response.get('recommended_actions', []):
            if action.get('priority') == 'HIGH':
                result = await self._execute_action(action, analysis)
                actions_taken.append(result)

        # Auto-alert if threshold exceeded
        if analysis['anomaly_rate'] > self.config.ALERT_THRESHOLD:
            alert_action = await self._send_alert(analysis, agent_response)
            actions_taken.append(alert_action)

        return actions_taken

    async def _execute_action(
            self,
            action: Dict[str, Any],
            analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a single action"""

        action_name = action.get('action', 'unknown')

        self.logger.info(f"Executing action: {action_name}")

        # Implement your action handlers here
        # Examples:
        # - Block suspicious nodes
        # - Isolate network segments
        # - Update firewall rules
        # - Scale monitoring resources

        result = {
            'action': action_name,
            'status': 'executed',
            'timestamp': datetime.now().isoformat(),
            'details': action.get('reason', '')
        }

        self.actions_taken.append(result)

        return result

    async def _send_alert(
            self,
            analysis: Dict[str, Any],
            agent_response: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send alert for critical situations"""

        alert = {
            'action': 'send_alert',
            'status': 'sent',
            'timestamp': datetime.now().isoformat(),
            'severity': agent_response.get('severity', 'HIGH'),
            'message': f"Anomaly rate {analysis['anomaly_rate']:.2%} exceeds threshold"
        }

        # Implement your alerting mechanism here
        # Examples: Slack, Email, PagerDuty, SMS

        self.logger.warning(f"ALERT: {alert['message']}")

        return alert

    def _update_memory(
            self,
            analysis: Dict[str, Any],
            agent_response: Dict[str, Any],
            actions: List[Dict[str, Any]]
    ):
        """Update agent's memory"""

        memory_entry = {
            'iteration': self.iteration,
            'timestamp': analysis['timestamp'],
            'anomalies': analysis['anomalous_nodes'],
            'severity': agent_response.get('severity', 'UNKNOWN'),
            'actions': [a['action'] for a in actions],
            'reasoning_summary': agent_response.get('reasoning', '')[:200]
        }

        self.memory.append(memory_entry)

    async def _generate_report(
        self,
        analysis: Dict[str, Any],
        agent_response: Dict[str, Any],
        actions: List[Dict[str, Any]]
):
        """Generate and display report"""

        report = {
            **analysis,
            'agent_response': agent_response,
            'actions_taken': actions,
            'total_anomalies_cumulative': self.total_anomalies_detected
        }

        # Print to console
        self._print_report(report)

        # Save to file
        if self.config.SAVE_REPORTS:
            try:
                # ✅ FIX: Create directory if it doesn't exist
                import os
                os.makedirs(self.config.REPORT_DIR, exist_ok=True)
                
                filename = f"{self.config.REPORT_DIR}/report_{self.iteration:06d}.json"
                with open(filename, 'w') as f:
                    json.dump(report, f, indent=2)
                
                self.logger.info(f"Report saved to {filename}")
            except Exception as e:
                self.logger.error(f"Failed to save report: {e}", exc_info=True)
        else:
            self.logger.debug("Report saving disabled (SAVE_REPORTS=False)")

    def _print_report(self, report: Dict[str, Any]):
        """Print formatted report"""

        print("\n" + "=" * 80)
        print(f"AGENT REPORT - Iteration {report['iteration']}")
        print("=" * 80)
        print(f"Timestamp: {report['timestamp']}")
        print(f"Graph: {report['total_nodes']} nodes, {report['total_edges']} edges")
        print(f"Anomalies: {report['anomalous_nodes']} nodes ({report['anomaly_rate']:.2%})")
        print(f"Batch Processing: {report['batch_processing_time']:.3f}s")

        agent_resp = report['agent_response']
        print(f"\n{'AGENT ANALYSIS':^80}")
        print("-" * 80)
        print(f"Severity: {agent_resp.get('severity', 'UNKNOWN')}")
        print(f"Confidence: {agent_resp.get('confidence', 0):.2f}")
        print(f"\nReasoning:\n{agent_resp.get('reasoning', 'N/A')}")

        if report['anomalous_nodes'] > 0:
            print(f"\n{'TOP VULNERABLE NODES':^80}")
            print("-" * 80)
            for node in report['node_details'][:5]:
                print(f"Node {node['node_id']:4d} | "
                      f"Score: {node['anomaly_score']:.4f} | "
                      f"Z: {node['z_score']:.2f} | "
                      f"Degree: {node['degree']:3d}")

        if report['vulnerable_paths']:
            print(f"\n{'CRITICAL PATHS':^80}")
            print("-" * 80)
            for i, path in enumerate(report['vulnerable_paths'][:3], 1):
                print(f"{i}. {path['source']} → {path['target']} (len: {path['length']})")

        if report['actions_taken']:
            print(f"\n{'ACTIONS TAKEN':^80}")
            print("-" * 80)
            for action in report['actions_taken']:
                print(f"✓ {action['action']} - {action['status']}")

        print("=" * 80 + "\n")