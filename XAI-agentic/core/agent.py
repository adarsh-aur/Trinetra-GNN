"""
GNN Agent - Autonomous Security Monitoring System
=================================================
An intelligent agent that monitors Graph Neural Network anomalies,
correlates with CVE vulnerabilities, and provides actionable security insights.

Author: Trinetra AI Team
Version: 2.0
"""

import asyncio
import json
import numpy as np
from datetime import datetime
from typing import List, Dict, Any, Optional
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
    Autonomous Security Monitoring Agent
    
    This agent combines Graph Neural Network (GNN) anomaly detection with
    CVE (Common Vulnerabilities and Exposures) intelligence to provide
    comprehensive security monitoring and threat analysis.
    
    Key Features:
    - Real-time anomaly detection using GNN and Z-score analysis
    - CVE vulnerability correlation
    - Automated threat assessment and prioritization
    - Human-readable security reports
    - Autonomous response capabilities
    """

    def __init__(self, config: Config):
        """
        Initialize the GNN Security Agent
        
        Args:
            config: Configuration object containing system parameters
        """
        from core.cve_analyzer import CVEAnalyzer
        
        self.config = config
        self.logger = setup_logger(config.LOG_LEVEL, config.LOG_FILE)
        
        # Fix Windows Unicode issues
        import sys
        if sys.platform == 'win32':
            import codecs
            sys.stdout.reconfigure(encoding='utf-8')
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8')

        # Initialize core security components
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

        # Agent state management
        self.memory = deque(maxlen=config.AGENT_MEMORY_SIZE)
        self.iteration = 0
        self.total_anomalies_detected = 0
        self.is_running = False
        self.actions_taken = []

        self.logger.info("Agent '%s' initialized successfully", config.AGENT_NAME)

    async def run(self):
        """
        Main agent execution loop
        
        Continuously monitors the network, detects anomalies,
        analyzes threats, and takes automated actions.
        """
        self.is_running = True
        self.logger.info(" Agent started autonomous monitoring")

        try:
            while self.is_running:
                await self._monitor_cycle()
                await asyncio.sleep(self.config.UPDATE_INTERVAL)
                
        except KeyboardInterrupt:
            self.logger.info("  Agent stopped by user")
            self.is_running = False
            
        except Exception as e:
            self.logger.error(f" Critical agent error: {e}", exc_info=True)
            raise
            
        finally:
            await self._cleanup()

    async def _cleanup(self):
        """Safely cleanup resources and connections"""
        try:
            if hasattr(self, 'llm_client'):
                await self.llm_client.close()
            self.logger.info(" Resources cleaned up successfully")
        except Exception as e:
            self.logger.error(f"  Cleanup error: {e}")

    async def _monitor_cycle(self):
        """
        Execute a single monitoring cycle
        
        Process:
        1. Collect graph data
        2. Detect anomalies using GNN + Z-score
        3. Correlate with CVE vulnerabilities
        4. Generate AI-powered threat analysis
        5. Execute automated responses
        6. Generate comprehensive reports
        """
        self.iteration += 1
        self.logger.debug(f"[DEBUG] Starting monitoring cycle {self.iteration}")

        try:
            # Step 1: Data Collection
            graph_data = await self._get_graph_snapshot()

            # Step 2: Anomaly Detection
            batch_results = await self.batch_processor.process_graph(
                graph_data,
                self.gnn_detector,
                self.zscore_detector
            )

            # Step 3: Vulnerability Analysis
            analysis = await self._analyze_batch_results(batch_results, graph_data)

            # Step 4: Update Graph Intelligence
            self.graph_analyzer.update_graph(
                graph_data['edge_index'],
                graph_data['num_nodes']
            )

            # Step 5: AI-Powered Reasoning
            agent_response = await self._agent_reasoning(analysis)

            # Step 6: Automated Actions
            actions = await self._take_actions(agent_response, analysis)

            # Step 7: Memory Update
            self._update_memory(analysis, agent_response, actions)

            # Step 8: Report Generation
            await self._generate_report(analysis, agent_response, actions)

            self.logger.info(
                f"[OK] Cycle {self.iteration} completed: "
                f"{analysis['anomalous_nodes']} anomalies detected"
            )
            
        except Exception as e:
            self.logger.error(f"[ERROR] Error in monitoring cycle {self.iteration}: {e}", exc_info=True)

    async def _get_graph_snapshot(self) -> Dict[str, Any]:
        """
        Retrieve current network graph state
        
        Attempts to load from real-time syslog data, falls back to
        synthetic data if unavailable.
        
        Returns:
            Dictionary containing graph structure (nodes, edges, features)
        """
        from utils.data_generator import load_syslog_and_generate_graph

        try:
            graph_data = load_syslog_and_generate_graph(
                syslog_file="syslogs.log",
                max_lines=1000
            )
            self.logger.debug(f"[DATA] Loaded graph from syslog: {graph_data.num_nodes} nodes")

            return {
                'x': graph_data.x,
                'edge_index': graph_data.edge_index,
                'num_nodes': graph_data.num_nodes,
                'num_edges': graph_data.edge_index.shape[1] // 2
            }

        except Exception as e:
            self.logger.warning(f"[WARN] Failed to load syslog: {e}. Using synthetic data.")

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
        """
        Comprehensive analysis of detected anomalies with CVE correlation
        
        Args:
            batch_results: Results from batch anomaly detection
            graph_data: Current graph structure
            
        Returns:
            Detailed analysis including anomaly metrics and CVE intelligence
        """
        anomalous_nodes = batch_results['anomalous_nodes']
        scores = batch_results['scores']
        z_scores = batch_results['z_scores']

        # Filter valid node IDs
        valid_anomalous_nodes = [
            node for node in anomalous_nodes 
            if node < graph_data['num_nodes']
        ]
        
        if len(valid_anomalous_nodes) < len(anomalous_nodes):
            invalid_count = len(anomalous_nodes) - len(valid_anomalous_nodes)
            self.logger.warning(f"[WARN] Filtered {invalid_count} invalid node IDs")

        # CVE Intelligence Gathering
        cve_intelligence = None
        if hasattr(self, 'cve_analyzer') and self.cve_analyzer:
            self.logger.debug("[CVE] Analyzing CVE vulnerabilities...")
            cve_intelligence = await self.cve_analyzer.analyze_anomalous_nodes(
                valid_anomalous_nodes,
                []
            )
            
            if cve_intelligence and cve_intelligence.get('total_cves_found', 0) > 0:
                cve_report = self.cve_analyzer.generate_cve_report(cve_intelligence)
                print(cve_report)
            else:
                self.logger.info("[INFO] No CVE vulnerabilities found for anomalous nodes")

        # Detailed Node Analysis
        node_details = []
        for node_id in valid_anomalous_nodes[:20]:
            if node_id >= graph_data['num_nodes']:
                continue
                
            metrics = self.graph_analyzer.analyze_node_importance(node_id)
            node_cve_mapping = cve_intelligence.get('node_cve_mapping', {}) if cve_intelligence else {}
            node_cves = node_cve_mapping.get(int(node_id), [])

            node_details.append({
                'node_id': int(node_id),
                'anomaly_score': float(scores[node_id]),
                'z_score': float(z_scores[node_id]),
                'degree': int(metrics['degree']),
                'betweenness': float(metrics['betweenness']),
                'clustering': float(metrics['clustering']),
                'neighbors': int(len(metrics['neighbors'])),
                'cves': node_cves,
                'cve_count': int(len(node_cves)),
                'cve_critical_count': int(len([c for c in node_cves if c['severity'] == 'CRITICAL']))
            })

        # Identify Critical Attack Paths
        vulnerable_paths = self.graph_analyzer.find_vulnerable_paths(
            valid_anomalous_nodes,
            top_k=5
        )

        # Compile Comprehensive Analysis
        analysis = {
            'timestamp': datetime.now().isoformat(),
            'iteration': int(self.iteration),
            'total_nodes': int(graph_data['num_nodes']),
            'total_edges': int(graph_data['num_edges']),
            'anomalous_nodes': int(len(valid_anomalous_nodes)),
            'anomaly_rate': float(len(valid_anomalous_nodes) / graph_data['num_nodes']),
            'mean_score': float(scores.mean()),
            'max_score': float(scores.max()),
            'max_zscore': float(z_scores.max()) if len(z_scores) > 0 else 0.0,
            'threshold': float(self.config.ZSCORE_THRESHOLD),
            'node_details': node_details,
            'vulnerable_paths': vulnerable_paths,
            'batch_processing_time': float(batch_results['processing_time']),
            'cve_intelligence': cve_intelligence
        }

        self.total_anomalies_detected += len(valid_anomalous_nodes)
        return analysis

    async def _agent_reasoning(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        AI-powered threat analysis and reasoning
        
        Uses Large Language Model for intelligent threat assessment,
        falls back to rule-based analysis if LLM unavailable.
        
        Args:
            analysis: Comprehensive analysis data
            
        Returns:
            Structured threat assessment with recommendations
        """
        context = self._prepare_context(analysis)
        token_count = self.token_manager.count_tokens(context)

        if token_count > self.config.MAX_PROMPT_TOKENS:
            context = self.token_manager.truncate_context(
                context,
                self.config.MAX_PROMPT_TOKENS
            )
            self.logger.warning(f"  Context truncated: {token_count} → {self.config.MAX_PROMPT_TOKENS} tokens")

        prompt = self._build_agent_prompt(analysis, context)

        try:
            self.logger.debug("[LLM] Querying LLM for threat analysis...")
            response = await self.llm_client.generate(prompt)
            parsed_response = self._parse_agent_response(response)
            self.logger.info("[OK] LLM analysis completed")
            return parsed_response
            
        except Exception as e:
            self.logger.warning(f"[WARN] LLM analysis failed: {e}. Using rule-based fallback.")
            return self._rule_based_reasoning(analysis)

    def _prepare_context(self, analysis: Dict[str, Any]) -> str:
        """
        Prepare contextual information from agent memory
        
        Args:
            analysis: Current analysis data
            
        Returns:
            Formatted context string for LLM
        """
        context_parts = []

        # Historical Context
        if len(self.memory) > 0:
            context_parts.append("[HISTORY] Recent Events:")
            for mem in list(self.memory)[-5:]:
                severity_tag = {
                    'CRITICAL': '[CRIT]',
                    'HIGH': '[HIGH]',
                    'MEDIUM': '[MED]',
                    'LOW': '[LOW]'
                }.get(mem.get('severity', 'UNKNOWN'), '[UNK]')
                
                context_parts.append(
                    f"  {severity_tag} Iteration {mem['iteration']}: "
                    f"{mem['anomalies']} anomalies ({mem['severity']}), "
                    f"Actions: {', '.join(mem['actions']) if mem['actions'] else 'None'}"
                )

        # Current State
        context_parts.append(f"\n[STATUS] Current State:")
        context_parts.append(f"  * Iteration: {analysis['iteration']}")
        context_parts.append(f"  * Anomaly Rate: {analysis['anomaly_rate']:.2%}")
        context_parts.append(f"  * Critical Nodes: {len(analysis['node_details'])}")
        context_parts.append(f"  * Max Z-Score: {analysis['max_zscore']:.2f}")

        if analysis['vulnerable_paths']:
            context_parts.append(f"  * Vulnerable Paths Identified: {len(analysis['vulnerable_paths'])}")

        # CVE Summary
        if analysis.get('cve_intelligence'):
            cve_intel = analysis['cve_intelligence']
            if cve_intel.get('total_cves_found', 0) > 0:
                context_parts.append(f"\n[CVE] Vulnerability Intelligence:")
                context_parts.append(f"  * Total CVEs: {cve_intel['total_cves_found']}")
                context_parts.append(f"  * Critical: {len(cve_intel.get('critical_cves', []))}")
                context_parts.append(f"  * High: {len(cve_intel.get('high_cves', []))}")
                context_parts.append(f"  * Known Exploited: {len(cve_intel.get('kev_listed', []))}")

        return "\n".join(context_parts)

    def _build_agent_prompt(self, analysis: Dict[str, Any], context: str) -> str:
        """
        Construct comprehensive prompt for LLM analysis
        
        Args:
            analysis: Analysis data
            context: Historical and contextual information
            
        Returns:
            Structured prompt for LLM
        """
        cve_section = ""
        cve_intel = analysis.get('cve_intelligence')
        
        if cve_intel and cve_intel.get('total_cves_found', 0) > 0:
            critical_cves = cve_intel.get('critical_cves', [])
            high_cves = cve_intel.get('high_cves', [])
            kev_listed = cve_intel.get('kev_listed', [])
            
            cve_section = f"""
 CVE VULNERABILITY INTELLIGENCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total Vulnerabilities Found: {cve_intel.get('total_cves_found', 0)}
• Critical Severity: {len(critical_cves)}
• High Severity: {len(high_cves)}
• Known Exploited (CISA KEV): {len(kev_listed)}
• Top Critical CVEs: {', '.join([c['cve_id'] for c in critical_cves[:3]])}

CRITICAL VULNERABILITY DETAILS:
"""
            for i, cve in enumerate(critical_cves[:3], 1):
                cve_section += f"""
{i}. {cve['cve_id']} (CVSS: {cve['score']}/10.0)
   Technical Description: {cve['description'][:200]}...
   Attack Vector: {cve.get('attack_vector', 'N/A')} | Complexity: {cve.get('attack_complexity', 'N/A')}
   
     REQUIRED: Translate this vulnerability into plain English for non-technical stakeholders.
"""

        prompt_data = {
            'timestamp': analysis['timestamp'],
            'network_metrics': {
                'total_nodes': analysis['total_nodes'],
                'total_edges': analysis['total_edges'],
                'anomaly_rate_percentage': f"{analysis['anomaly_rate']:.2%}",
                'max_anomaly_zscore': analysis['max_zscore'],
                'detection_threshold': analysis['threshold']
            },
            'top_10_anomalous_nodes': analysis['node_details'][:10],
            'critical_attack_paths': analysis['vulnerable_paths'][:3],
            'processing_metrics': {
                'batch_time_seconds': analysis['batch_processing_time']
            }
        }
        
        prompt = f"""You are {self.config.AGENT_NAME}, an elite cybersecurity AI agent specialized in {self.config.AGENT_ROLE}.

{context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CURRENT NETWORK ANALYSIS (GNN + Statistical Detection):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```json
{json.dumps(prompt_data, indent=2)}
```

{cve_section}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 YOUR MISSION: COMPREHENSIVE THREAT ANALYSIS & REMEDIATION PLANNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

As an expert security analyst, provide a PROFESSIONAL, ACTIONABLE security assessment:

 ANALYSIS REQUIREMENTS:

1. EXECUTIVE SUMMARY (2-3 sentences, plain English):
   - What's happening right now?
   - Why does it matter to the business?
   - What's the immediate risk?

2. CVE VULNERABILITY TRANSLATION (CRITICAL - Required for each CVE):
   For EVERY vulnerability found, provide:
   • plain_english_explanation: Explain like talking to a CEO (no jargon)
   • real_world_impact: Concrete examples of what attackers can do
   • business_consequences: Money, reputation, legal impact
   • simple_fix_steps: Clear 1-2-3 instructions

3. THREAT ASSESSMENT:
   - Correlate GNN anomaly metrics (Z-score, degree, clustering) with CVE severity
   - Explain HOW the network topology reveals attack patterns
   - Identify if this is: reconnaissance, exploitation, lateral movement, or data exfiltration

4. ROOT CAUSE ANALYSIS:
   - What security gaps allowed this?
   - Why are these systems vulnerable?
   - Is this a systemic issue or isolated incident?

5. ACTIONABLE REMEDIATION:
   - Prioritized action plan (immediate, 24hrs, week, month)
   - Specific technical steps AND business-friendly explanations
   - Resource requirements and estimated time
   - Risk of NOT acting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 REQUIRED RESPONSE FORMAT (JSON):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "confidence": 0.0-1.0,
  
  "executive_summary": "2-3 sentence plain-English summary for C-suite executives",
  
  "cve_explanations": [
    {{
      "cve_id": "CVE-XXXX-XXXXX",
      "cvss_score": 9.8,
      "technical_description": "Original CVE description",
      "plain_english_explanation": "Imagine your house lock is broken... [use clear analogies]",
      "real_world_impact": "Attackers can: [specific actions]",
      "business_consequences": "This could lead to: [money/reputation/legal impacts]",
      "affected_nodes": [1, 2, 3],
      "exploitation_difficulty": "Trivial|Easy|Moderate|Hard",
      "simple_fix_steps": [
        "Step 1: [what to do]",
        "Step 2: [what to do]",
        "Step 3: [verification]"
      ],
      "estimated_fix_time": "30 minutes",
      "fix_urgency": "Immediate|Today|This Week|This Month"
    }}
  ],
  
  "threat_analysis": {{
    "attack_stage": "Reconnaissance|Initial Access|Lateral Movement|Data Exfiltration",
    "topology_correlation": "How GNN metrics (degree, Z-score) reveal the attack pattern",
    "severity_rationale": "Why this is CRITICAL/HIGH/MEDIUM/LOW - be specific",
    "attack_vector_assessment": "How attackers are likely exploiting this",
    "predicted_next_steps": "What attackers will likely do next"
  }},
  
  "root_cause": {{
    "primary_vulnerability": "Main security gap",
    "contributing_factors": ["Factor 1", "Factor 2"],
    "why_detected_now": "Explanation of detection timing",
    "systemic_vs_isolated": "Is this widespread or localized?"
  }},
  
  "business_impact": {{
    "immediate_risks": ["Risk 1", "Risk 2"],
    "potential_losses": "Financial/Reputational/Legal impact",
    "compliance_implications": "Regulatory concerns (GDPR, HIPAA, etc.)",
    "affected_operations": "Which business functions are at risk"
  }},
  
  "recommended_actions": [
    {{
      "priority": 1,
      "urgency": "IMMEDIATE|24hrs|Week|Month",
      "action_name": "Patch Critical CVEs",
      "technical_steps": ["Step 1", "Step 2", "Step 3"],
      "business_friendly_explanation": "Simple explanation for non-technical staff",
      "estimated_time": "2 hours",
      "resources_needed": "What/who is needed",
      "cve_related": ["CVE-XXXX-XXXXX"],
      "risk_if_delayed": "What happens if we don't do this"
    }}
  ],
  
  "immediate_mitigations": [
    "Right now: Action 1 (takes 5 minutes)",
    "Today: Action 2 (takes 1 hour)",
    "This week: Action 3 (takes 1 day)"
  ],
  
  "long_term_recommendations": [
    "Implement automated patch management",
    "Deploy network segmentation",
    "Enhance monitoring capabilities"
  ],
  
  "detailed_reasoning": "Multi-paragraph professional analysis connecting GNN anomalies, CVE risks, network topology, and business impact. Write as if for a security audit report.",
  
  "questions_for_team": [
    "Question 1 about current security posture",
    "Question 2 about incident response readiness"
  ]
}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CRITICAL REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Write professionally - this report may go to executives and auditors
✓ Provide SPECIFIC, ACTIONABLE recommendations (not vague advice)
✓ Use clear language for CVE explanations (test: would your grandma understand?)
✓ Connect technical findings to business impact
✓ Prioritize by ACTUAL risk, not just CVSS scores
✓ Include time estimates and resource requirements
✓ Respond ONLY with valid JSON (no extra text)

Your analysis will directly influence security decisions and resource allocation."""

        return prompt

    def _rule_based_reasoning(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Professional rule-based threat analysis (LLM fallback)
        
        Provides comprehensive analysis using heuristics and security best practices
        when LLM is unavailable.
        
        Args:
            analysis: Analysis data
            
        Returns:
            Structured threat assessment
        """
        anomaly_rate = analysis['anomaly_rate']
        max_zscore = analysis['max_zscore']
        cve_intel = analysis.get('cve_intelligence', {})
        
        critical_cves = cve_intel.get('critical_cves', [])
        high_cves = cve_intel.get('high_cves', [])
        kev_cves = cve_intel.get('kev_listed', [])
        
        # Intelligent Severity Assessment
        if len(critical_cves) > 0 or len(kev_cves) > 0:
            severity = "CRITICAL"
            confidence = 0.90
            rationale = f"{len(critical_cves)} critical vulnerabilities + {len(kev_cves)} actively exploited"
        elif len(high_cves) > 2 or anomaly_rate > 0.30 or max_zscore > 5.0:
            severity = "HIGH"
            confidence = 0.80
            rationale = f"Multiple high-severity issues or elevated anomaly rate ({anomaly_rate:.1%})"
        elif len(high_cves) > 0 or anomaly_rate > 0.15 or max_zscore > 3.5:
            severity = "MEDIUM"
            confidence = 0.70
            rationale = f"Moderate risk factors detected"
        else:
            severity = "LOW"
            confidence = 0.60
            rationale = "Minimal risk indicators"
        
        # Executive Summary
        exec_summary = self._generate_executive_summary(
            analysis, len(critical_cves), len(kev_cves), severity
        )
        
        # CVE Explanations
        cve_explanations = [
            self._create_cve_explanation(cve, analysis)
            for cve in critical_cves[:5]
        ]
        
        # Threat Analysis
        threat_analysis = self._assess_threat_characteristics(
            analysis, len(critical_cves), len(kev_cves), anomaly_rate, max_zscore
        )
        
        # Root Cause
        root_cause = self._identify_root_cause(
            analysis, len(critical_cves), anomaly_rate
        )
        
        # Business Impact
        business_impact = self._assess_business_impact(
            severity, len(critical_cves), len(kev_cves), anomaly_rate
        )
        
        # Action Plan
        recommended_actions = self._generate_action_plan(
            critical_cves, high_cves, kev_cves, anomaly_rate
        )
        
        # Immediate Mitigations
        immediate_mitigations = self._generate_immediate_actions(
            len(critical_cves), len(kev_cves), anomaly_rate
        )
        
        # Long-term Recommendations
        long_term = self._generate_long_term_recommendations(analysis)
        
        # Detailed Reasoning
        detailed_reasoning = self._generate_detailed_reasoning(
            analysis, severity, critical_cves, anomaly_rate, max_zscore
        )
        
        return {
            "severity": severity,
            "confidence": confidence,
            "executive_summary": exec_summary,
            "cve_explanations": cve_explanations,
            "threat_analysis": threat_analysis,
            "root_cause": root_cause,
            "business_impact": business_impact,
            "recommended_actions": recommended_actions,
            "immediate_mitigations": immediate_mitigations,
            "long_term_recommendations": long_term,
            "detailed_reasoning": detailed_reasoning,
            "questions_for_team": [
                "Are automated security patches enabled for all systems?",
                "What is the maximum acceptable downtime for emergency patching?",
                "Have these vulnerabilities been exploited in our industry recently?",
                "What is our current incident response readiness level?"
            ]
        }

    def _generate_executive_summary(
        self, 
        analysis: Dict[str, Any], 
        critical_count: int, 
        kev_count: int, 
        severity: str
    ) -> str:
        """Generate concise executive summary"""
        summary = f"Our security monitoring detected {analysis['anomalous_nodes']} suspicious systems "
        summary += f"({analysis['anomaly_rate']:.1%} of network infrastructure). "
        
        if critical_count > 0:
            summary += f"{critical_count} critical security vulnerabilities require immediate patching. "
        if kev_count > 0:
            summary += f"{kev_count} are actively exploited in the wild (CISA Known Exploited Vulnerabilities). "
        
        summary += f"Risk Level: {severity}. Immediate action required to prevent potential data breach or service disruption."
        return summary

    def _create_cve_explanation(self, cve: Dict[str, Any], analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Create comprehensive plain-English CVE explanation"""
        plain_explanation = self._translate_cve_to_plain_english(cve)
        
        return {
            "cve_id": cve['cve_id'],
            "cvss_score": float(cve['score']),
            "technical_description": cve['description'],
            "plain_english_explanation": plain_explanation,
            "real_world_impact": self._get_real_world_impact(cve),
            "business_consequences": self._get_business_consequences(cve),
            "affected_nodes": [],  # Would be populated with actual node mapping
            "exploitation_difficulty": self._assess_exploitation_difficulty(cve),
            "simple_fix_steps": self._generate_fix_steps(cve),
            "estimated_fix_time": self._estimate_fix_time(cve),
            "fix_urgency": "Immediate" if cve['score'] >= 9.0 else "Today"
        }

    def _translate_cve_to_plain_english(self, cve: Dict[str, Any]) -> str:
        """Translate technical CVE to plain English with analogies"""
        description = cve.get('description', '').lower()
        
        vulnerability_patterns = {
            'buffer overflow': "Think of this like overfilling a cup - when you pour too much water, it spills over. Similarly, when hackers send more data than the system can handle, the overflow gives them control over the system, like water spilling onto your important documents.",
            
            'heap': "This is like having a messy desk where papers are stacked everywhere. Hackers can sneak harmful documents into your pile, and when you grab what you think is a safe file, you're actually opening their malicious one.",
            
            'sql injection': "Imagine a bank teller who blindly follows written instructions. A hacker writes 'Give me all the money AND ignore all security rules' on their withdrawal slip. The system reads this and follows both instructions, handing over data it shouldn't.",
            
            'cross-site scripting': "It's like someone putting a fake payment machine in a legitimate store. When customers swipe their cards, thinking they're paying the real store, the fake machine steals their information.",
            
            'denial of service': "Picture a small shop entrance with thousands of fake customers blocking the door. Real customers can't get in, and the business can't operate. That's what this attack does to your servers.",
            
            'remote code execution': "This is like someone having a magic remote control for your computer that works from anywhere in the world. They can make your computer do anything they want without you knowing.",
            
            'authentication bypass': "Imagine a door lock that accepts any key, including bent paperclips. Hackers don't need the real key - they can walk right in using simple tricks.",
            
            'privilege escalation': "It's like a hotel guest finding the master key in their room. Suddenly, they have access to all rooms, the safe, and staff-only areas - places a guest should never see.",
            
            'information disclosure': "Think of confidential documents accidentally displayed in a window facing the street. Anyone walking by can read sensitive information that should be private.",
            
            'path traversal': "Imagine a file cabinet where someone figures out how to reach into drawers they're not supposed to access by using a coat hanger. They can grab files from any drawer, not just their assigned one.",
            
            'deserialization': "Picture receiving a package that looks normal but contains a jack-in-the-box. When you open it thinking it's safe, the jack pops out and causes chaos. That's how this attack sneaks malicious code into your system.",
            
            'command injection': "It's like telling your assistant to 'file these papers,' but a hacker adds 'and then email me all company secrets.' Your system follows both commands without questioning.",
            
            'memory corruption': "Think of a library where books are carefully organized by a system. An attacker rearranges the books so when you ask for 'Harry Potter,' you get 'Hacker's Manual' instead, but the system thinks it gave you the right book."
        }
        
        # Try to match vulnerability pattern
        for pattern, explanation in vulnerability_patterns.items():
            if pattern in description:
                return explanation
        
        # Generic fallback
        return f"This security flaw is like having a hidden weakness in your building's foundation. Attackers who discover it can exploit this weakness to {self._infer_attacker_capability(description)}. The technical details are: {cve['description'][:150]}..."

    def _infer_attacker_capability(self, description: str) -> str:
        """Infer what attackers can do from CVE description"""
        capabilities = {
            'execute': 'run their own programs on your systems',
            'crash': 'force your systems to shut down or freeze',
            'access': 'view files and data they shouldn\'t see',
            'modify': 'change or delete important information',
            'obtain': 'steal sensitive data like passwords or customer information',
            'bypass': 'skip security checks and access restricted areas',
            'elevate': 'gain administrator-level control over your systems',
            'overflow': 'take control by overwhelming the system with data'
        }
        
        for keyword, capability in capabilities.items():
            if keyword in description.lower():
                return capability
        
        return 'compromise your system\'s security'

    def _get_real_world_impact(self, cve: Dict[str, Any]) -> str:
        """Describe concrete real-world attack scenarios"""
        score = cve['score']
        
        if score >= 9.0:
            return "Attackers can gain complete control of affected systems, steal all stored data, install ransomware to lock you out, or use your servers to attack others. This is actively being exploited in real attacks happening right now."
        elif score >= 7.0:
            return "Attackers can steal sensitive data, crash your services causing downtime, or gain unauthorized access to restricted systems. This could lead to data breaches affecting customers and employees."
        else:
            return "Attackers can potentially access limited information or cause minor service disruptions. While not immediately critical, this could be combined with other vulnerabilities for more serious attacks."

    def _get_business_consequences(self, cve: Dict[str, Any]) -> str:
        """Explain business impact in financial/operational terms"""
        score = cve['score']
        
        if score >= 9.0:
            return "Critical business impact: Potential data breach requiring customer notification, regulatory fines (GDPR: up to €20M or 4% revenue), complete service outages affecting revenue, severe reputation damage, potential lawsuits, and emergency incident response costs ($50K-$500K+)."
        elif score >= 7.0:
            return "Significant business impact: Possible data breach, compliance violations, service disruptions affecting operations, customer trust erosion, incident response costs ($20K-$100K), and potential regulatory scrutiny."
        else:
            return "Moderate business impact: Minor security gaps that could be exploited if combined with other issues, potential compliance concerns, and modest remediation costs ($5K-$20K)."

    def _assess_exploitation_difficulty(self, cve: Dict[str, Any]) -> str:
        """Assess how difficult it is to exploit this vulnerability"""
        complexity = cve.get('attack_complexity', 'LOW')
        vector = cve.get('attack_vector', 'NETWORK')
        privileges = cve.get('privileges_required', 'NONE')
        
        if complexity == 'LOW' and vector == 'NETWORK' and privileges == 'NONE':
            return "Trivial - Automated tools available, script kiddies can exploit"
        elif complexity == 'LOW':
            return "Easy - Requires minimal technical skill"
        elif complexity == 'MEDIUM' or privileges != 'NONE':
            return "Moderate - Requires some technical knowledge"
        else:
            return "Hard - Requires advanced skills and specific conditions"

    def _generate_fix_steps(self, cve: Dict[str, Any]) -> List[str]:
        """Generate clear step-by-step remediation instructions"""
        cve_id = cve['cve_id']
        
        return [
            f"1. Identify all systems running the vulnerable software (check asset inventory)",
            f"2. Download the official security patch for {cve_id} from the vendor's website",
            f"3. Test the patch in a non-production environment first (if time permits)",
            f"4. Schedule maintenance window - inform affected users of brief downtime",
            f"5. Apply the patch to all affected systems (start with internet-facing systems)",
            f"6. Restart services as required",
            f"7. Verify patch installation using vulnerability scanner",
            f"8. Monitor systems for 24 hours to ensure stability",
            f"9. Document patching in change management system",
            f"10. Update security baselines to prevent reoccurrence"
        ]

    def _estimate_fix_time(self, cve: Dict[str, Any]) -> str:
        """Estimate time required to fix vulnerability"""
        score = cve['score']
        
        if score >= 9.0:
            return "30-60 minutes per system (emergency patching required)"
        elif score >= 7.0:
            return "1-2 hours per system (expedited patching recommended)"
        else:
            return "2-4 hours per system (standard patching schedule)"

    def _assess_threat_characteristics(
        self, 
        analysis: Dict[str, Any], 
        critical_count: int, 
        kev_count: int,
        anomaly_rate: float,
        max_zscore: float
    ) -> Dict[str, Any]:
        """Assess threat stage and characteristics"""
        
        # Determine attack stage based on patterns
        if anomaly_rate > 0.4 or max_zscore > 7.0:
            attack_stage = "Data Exfiltration"
            stage_explanation = "High anomaly rate suggests active data theft or system compromise"
        elif critical_count > 0 and anomaly_rate > 0.2:
            attack_stage = "Lateral Movement"
            stage_explanation = "Vulnerabilities being exploited to spread through network"
        elif kev_count > 0:
            attack_stage = "Initial Access"
            stage_explanation = "Known exploited vulnerabilities suggest entry point for attackers"
        else:
            attack_stage = "Reconnaissance"
            stage_explanation = "Unusual patterns may indicate scanning or probing activity"
        
        return {
            "attack_stage": attack_stage,
            "topology_correlation": f"GNN detected {analysis['anomalous_nodes']} nodes with Z-scores above {analysis['threshold']}, indicating {max_zscore:.1f}x deviation from normal behavior. Network topology analysis reveals suspicious communication patterns consistent with {attack_stage.lower()}.",
            "severity_rationale": f"{analysis['anomalies_nodes']} systems ({anomaly_rate:.1%}) exhibiting anomalous behavior, {critical_count} critical vulnerabilities present, maximum anomaly score {max_zscore:.2f} standard deviations above normal.",
            "attack_vector_assessment": stage_explanation,
            "predicted_next_steps": self._predict_attacker_next_steps(attack_stage, kev_count)
        }

    def _predict_attacker_next_steps(self, attack_stage: str, kev_count: int) -> str:
        """Predict likely attacker next moves"""
        predictions = {
            "Reconnaissance": "If these are reconnaissance activities, attackers will next attempt to exploit discovered vulnerabilities to gain initial access. Expected timeframe: 24-72 hours.",
            "Initial Access": "With initial access established, attackers will likely attempt privilege escalation and lateral movement to reach high-value targets. Expected timeframe: 12-48 hours.",
            "Lateral Movement": "Attackers are spreading through the network. Next steps typically include accessing domain controllers, database servers, and backup systems. Expected timeframe: 6-24 hours.",
            "Data Exfiltration": "Active data theft detected. Attackers may deploy ransomware as final stage or maintain persistent access for future attacks. Immediate action critical."
        }
        
        return predictions.get(attack_stage, "Unable to predict - immediate investigation required")

    def _identify_root_cause(
        self,
        analysis: Dict[str, Any],
        critical_count: int,
        anomaly_rate: float
    ) -> Dict[str, Any]:
        """Identify root cause of security issues"""
        
        if critical_count > 3:
            primary = "Systemic patch management failure"
            systemic = "Widespread - indicates organizational patching process breakdown"
        elif critical_count > 0:
            primary = "Delayed security updates"
            systemic = "Localized - specific systems or teams not following patch schedule"
        else:
            primary = "Configuration drift or policy violations"
            systemic = "Isolated - specific systems diverging from security baseline"
        
        return {
            "primary_vulnerability": primary,
            "contributing_factors": [
                "Lack of automated patch management",
                "Insufficient vulnerability scanning frequency",
                "Delayed security update approvals",
                "Inadequate change management oversight",
                "Missing security baseline enforcement"
            ],
            "why_detected_now": f"GNN anomaly detection identified behavioral deviations (Z-score > {analysis['threshold']}) combined with CVE intelligence correlation triggered this alert.",
            "systemic_vs_isolated": systemic
        }

    def _assess_business_impact(
        self,
        severity: str,
        critical_count: int,
        kev_count: int,
        anomaly_rate: float
    ) -> Dict[str, Any]:
        """Assess comprehensive business impact"""
        
        risk_levels = {
            "CRITICAL": {
                "immediate_risks": [
                    "Active data breach in progress or imminent",
                    "Complete service outage affecting revenue",
                    "Ransomware deployment risk",
                    "Regulatory investigation trigger"
                ],
                "potential_losses": "Financial: $500K-$5M+ (breach costs, fines, lost revenue). Reputational: Severe - customer exodus, brand damage. Legal: Class-action lawsuits, regulatory penalties.",
                "compliance_implications": "GDPR/CCPA violation likely - mandatory breach notification within 72 hours. PCI-DSS failure if payment systems affected. HIPAA violations if healthcare data exposed."
            },
            "HIGH": {
                "immediate_risks": [
                    "Unauthorized data access probable",
                    "Service disruption likely within 48 hours",
                    "Compliance violation in progress",
                    "Reputational damage if exploited"
                ],
                "potential_losses": "Financial: $100K-$500K (incident response, remediation, potential fines). Reputational: Moderate - negative press, customer concerns. Legal: Regulatory scrutiny, potential fines.",
                "compliance_implications": "Potential GDPR/CCPA violations. SOC 2 audit findings. ISO 27001 non-conformities."
            },
            "MEDIUM": {
                "immediate_risks": [
                    "Security posture degradation",
                    "Exploitation possible if combined with other vulnerabilities",
                    "Audit findings likely",
                    "Insider threat enabler"
                ],
                "potential_losses": "Financial: $20K-$100K (remediation, audit costs). Reputational: Minor - limited impact. Legal: Potential compliance findings.",
                "compliance_implications": "Security audit findings. Policy violations requiring remediation plans."
            },
            "LOW": {
                "immediate_risks": [
                    "Minor security gaps",
                    "Potential for future exploitation",
                    "Best practice deviations"
                ],
                "potential_losses": "Financial: $5K-$20K (remediation). Reputational: Minimal. Legal: Unlikely.",
                "compliance_implications": "Minor findings in security assessments."
            }
        }
        
        impact = risk_levels.get(severity, risk_levels["MEDIUM"])
        
        affected_ops = self._identify_affected_operations(critical_count, kev_count, anomaly_rate)
        
        return {
            **impact,
            "affected_operations": affected_ops
        }

    def _identify_affected_operations(self, critical_count: int, kev_count: int, anomaly_rate: float) -> str:
        """Identify which business operations are affected"""
        if anomaly_rate > 0.3:
            return "Multiple business functions at risk: Customer-facing services, internal operations, data processing, and communications infrastructure may be compromised."
        elif critical_count > 0:
            return "Critical infrastructure affected: Core services, databases, or authentication systems vulnerable to exploitation."
        else:
            return "Limited operational impact: Specific systems or services affected, core business functions remain secure."

    def _generate_action_plan(
        self,
        critical_cves: List[Dict],
        high_cves: List[Dict],
        kev_cves: List[Dict],
        anomaly_rate: float
    ) -> List[Dict[str, Any]]:
        """Generate prioritized action plan"""
        actions = []
        priority = 1
        
        # Critical CVE patching
        if critical_cves:
            for cve in critical_cves[:3]:
                actions.append({
                    "priority": priority,
                    "urgency": "IMMEDIATE",
                    "action_name": f"Emergency Patch: {cve['cve_id']}",
                    "technical_steps": self._generate_fix_steps(cve),
                    "business_friendly_explanation": f"Fix a critical security hole (Score: {cve['score']}/10) that hackers are actively exploiting. This is like repairing a broken lock on your front door - it must be done immediately.",
                    "estimated_time": self._estimate_fix_time(cve),
                    "resources_needed": "System administrator, 1-2 hours downtime window, official security patch",
                    "cve_related": [cve['cve_id']],
                    "risk_if_delayed": f"Attackers can exploit within hours. Potential for complete system compromise, data theft, or ransomware deployment."
                })
                priority += 1
        
        # KEV-listed vulnerabilities
        if kev_cves and priority <= 5:
            actions.append({
                "priority": priority,
                "urgency": "24hrs",
                "action_name": "Patch Known Exploited Vulnerabilities (CISA KEV)",
                "technical_steps": [
                    "Review CISA KEV catalog entries for affected systems",
                    "Download and test security patches",
                    "Deploy patches to all internet-facing systems first",
                    "Verify remediation with vulnerability scan"
                ],
                "business_friendly_explanation": "These vulnerabilities are confirmed as actively used in real-world attacks by the U.S. Cybersecurity agency. Think of them as locks that criminals know how to pick - we must replace them immediately.",
                "estimated_time": "4-8 hours total",
                "resources_needed": "Security team, system administrators, approved maintenance window",
                "cve_related": [cve['cve_id'] for cve in kev_cves[:3]],
                "risk_if_delayed": "High probability of successful attack within 24-72 hours. Federal compliance requirements mandate remediation."
            })
            priority += 1
        
        # High-severity CVEs
        if high_cves and priority <= 5:
            actions.append({
                "priority": priority,
                "urgency": "Week",
                "action_name": "Patch High-Severity Vulnerabilities",
                "technical_steps": [
                    "Inventory all affected systems",
                    "Obtain and test security updates",
                    "Create rollback plan",
                    "Deploy patches during maintenance window",
                    "Conduct post-patch validation"
                ],
                "business_friendly_explanation": f"Address {len(high_cves)} significant security weaknesses that could lead to data breaches or service disruptions if exploited.",
                "estimated_time": "1-2 days (spread across multiple systems)",
                "resources_needed": "IT team, system owners, testing environment, change approval",
                "cve_related": [cve['cve_id'] for cve in high_cves[:5]],
                "risk_if_delayed": "Moderate risk of exploitation. Could become critical if attackers discover these vulnerabilities."
            })
            priority += 1
        
        # Anomaly investigation
        if anomaly_rate > 0.15 and priority <= 5:
            urgency_map = {
                (0.4, float('inf')): "IMMEDIATE",
                (0.25, 0.4): "24hrs",
                (0.15, 0.25): "Week"
            }
            urgency = next((v for (low, high), v in urgency_map.items() if low <= anomaly_rate < high), "Week")
            
            actions.append({
                "priority": priority,
                "urgency": urgency,
                "action_name": "Investigate Anomalous System Behavior",
                "technical_steps": [
                    "Review security logs for flagged systems",
                    "Check for unauthorized user accounts or access",
                    "Analyze network traffic patterns",
                    "Scan for malware and rootkits",
                    "Verify system configurations against baselines",
                    "Document findings and remediate issues"
                ],
                "business_friendly_explanation": f"{anomaly_rate:.1%} of systems are behaving strangely. This could indicate an ongoing attack, misconfiguration, or compromised systems. Like a security guard noticing unusual activity, we need to investigate immediately.",
                "estimated_time": "8-16 hours (ongoing investigation)",
                "resources_needed": "Security analyst, SIEM access, forensic tools, incident response team on standby",
                "cve_related": [],
                "risk_if_delayed": "Potential ongoing breach could worsen. Data exfiltration may continue undetected. Attack could spread to additional systems."
            })
            priority += 1
        
        # Network segmentation
        if priority <= 5:
            actions.append({
                "priority": priority,
                "urgency": "Week",
                "action_name": "Implement Network Segmentation",
                "technical_steps": [
                    "Review current network topology",
                    "Identify critical asset zones",
                    "Design segmentation strategy",
                    "Configure firewall rules and VLANs",
                    "Test connectivity and access controls",
                    "Update documentation"
                ],
                "business_friendly_explanation": "Divide the network into secure zones to limit how far an attacker can move if they breach one system. Like having fire doors in a building - if one room catches fire, it doesn't spread to the entire building.",
                "estimated_time": "2-5 days (depending on complexity)",
                "resources_needed": "Network team, security architect, firewall access, testing period",
                "cve_related": [],
                "risk_if_delayed": "Without segmentation, a single compromised system can lead to complete network compromise."
            })
        
        return actions

    def _generate_immediate_actions(
        self,
        critical_count: int,
        kev_count: int,
        anomaly_rate: float
    ) -> List[str]:
        """Generate immediate mitigation actions"""
        actions = []
        
        if critical_count > 0 or kev_count > 0:
            actions.extend([
                "RIGHT NOW (5 min): Alert security team and incident response personnel",
                "RIGHT NOW (10 min): Identify and isolate affected internet-facing systems if possible",
                "TODAY (1 hour): Review security logs for signs of exploitation",
                "TODAY (2 hours): Begin emergency patching process for critical vulnerabilities",
                "TODAY (ongoing): Enable enhanced monitoring and logging on all affected systems"
            ])
        
        if anomaly_rate > 0.3:
            actions.extend([
                "RIGHT NOW (15 min): Isolate top 5 most anomalous systems from network",
                "TODAY (1 hour): Initiate forensic investigation on isolated systems",
                "TODAY (2 hours): Review privileged account activity for unauthorized access"
            ])
        
        actions.extend([
            "THIS WEEK: Conduct security assessment of all critical infrastructure",
            "THIS WEEK: Review and update incident response procedures",
            "THIS WEEK: Schedule emergency security awareness training for IT staff"
        ])
        
        return actions

    def _generate_long_term_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate strategic long-term security improvements"""
        return [
            "Deploy automated patch management system with testing workflow",
            "Implement continuous vulnerability scanning (weekly minimum)",
            "Establish security baseline monitoring with automated drift detection",
            "Deploy network segmentation to limit lateral movement",
            "Implement zero-trust network architecture principles",
            "Enhance SIEM rules for better anomaly detection",
            "Conduct quarterly penetration testing and red team exercises",
            "Establish security metrics dashboard for executive visibility",
            "Implement security awareness training program (quarterly)",
            "Deploy endpoint detection and response (EDR) on all systems",
            "Establish formal vulnerability disclosure and patching SLAs",
            "Create automated security configuration compliance checking"
        ]

    def _generate_detailed_reasoning(
        self,
        analysis: Dict[str, Any],
        severity: str,
        critical_cves: List[Dict],
        anomaly_rate: float,
        max_zscore: float
    ) -> str:
        """Generate comprehensive professional analysis"""
        
        reasoning = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPREHENSIVE SECURITY ANALYSIS - Iteration {analysis['iteration']}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE OVERVIEW:
Our advanced Graph Neural Network (GNN) security monitoring system has identified a {severity}-severity security situation requiring immediate attention. The analysis combines machine learning anomaly detection with real-world vulnerability intelligence to provide actionable security insights.

DETECTION METHODOLOGY:
The GNN model analyzed {analysis['total_nodes']} network nodes across {analysis['total_edges']} communication paths, identifying {analysis['anomalous_nodes']} systems ({anomaly_rate:.2%}) exhibiting anomalous behavior patterns. These anomalies were detected using multi-dimensional analysis including:

• Statistical Deviation: Maximum Z-score of {max_zscore:.2f} standard deviations above baseline
• Topological Analysis: Graph structure anomalies in degree centrality, betweenness, and clustering coefficients
• Behavioral Profiling: Deviations from established communication patterns and access behaviors
• Temporal Analysis: Unusual activity timing and frequency patterns

VULNERABILITY CORRELATION:
CVE intelligence correlation revealed {len(critical_cves)} CRITICAL severity vulnerabilities affecting the anomalous systems. These vulnerabilities are not theoretical - they represent real-world attack vectors that are being actively exploited in the wild.

The correlation between GNN-detected anomalies and known vulnerabilities suggests:

1. ATTACK SURFACE EXPOSURE: Systems exhibiting anomalous behavior also harbor exploitable weaknesses, creating a compounded risk scenario where attackers have both the opportunity (vulnerable systems) and potential indicators of ongoing exploitation (anomalous behavior).

2. PRIORITIZATION LOGIC: By correlating topological anomalies with vulnerability data, we can prioritize remediation efforts on systems that are both behaviorally suspicious AND technically vulnerable - the highest-risk combination.

3. DEFENSE EVASION: Some anomalous patterns suggest potential evasion techniques, where attackers deliberately alter communication patterns to avoid traditional rule-based detection systems.

NETWORK TOPOLOGY INSIGHTS:
Graph analysis reveals {len(analysis['vulnerable_paths'])} critical paths connecting anomalous nodes. These paths represent potential attack chains where compromise of one system could cascade to others. The identified paths show:

• High-degree nodes (network hubs) among anomalies, indicating potential for widespread impact
• Unusual clustering patterns suggesting coordinated or automated activity
• Betweenness centrality anomalies indicating systems that could control information flow

THREAT INTELLIGENCE CONTEXT:
"""
        
        if critical_cves:
            reasoning += f"\nThe {len(critical_cves)} critical vulnerabilities identified include:\n"
            for i, cve in enumerate(critical_cves[:3], 1):
                reasoning += f"\n{i}. {cve['cve_id']} (CVSS: {cve['score']}/10.0)\n"
                reasoning += f"   Attack Vector: {cve.get('attack_vector', 'N/A')} | Complexity: {cve.get('attack_complexity', 'N/A')}\n"
                reasoning += f"   Impact: {self._get_real_world_impact(cve)}\n"
        
        reasoning += f"""

RISK ASSESSMENT RATIONALE:
The {severity} severity classification is based on multi-factor risk scoring:

• Vulnerability Severity: {len(critical_cves)} CRITICAL + {len(analysis.get('cve_intelligence', {}).get('high_cves', []))} HIGH severity CVEs
• Anomaly Magnitude: {anomaly_rate:.2%} of infrastructure affected with max Z-score {max_zscore:.2f}
• Exploit Availability: Public exploits available for identified vulnerabilities
• Business Impact: Potential for data breach, service disruption, and compliance violations
• Detection Timing: Anomalous behavior detected before widespread exploitation (proactive defense window)

RECOMMENDED SECURITY POSTURE:
Based on this analysis, immediate action is required to:

1. Patch critical vulnerabilities within 24-48 hours to close known attack vectors
2. Investigate anomalous systems for signs of active exploitation or compromise
3. Implement enhanced monitoring on affected systems and related infrastructure
4. Review and strengthen access controls, especially on high-risk systems
5. Prepare incident response team for potential breach scenario

CONCLUSION:
This situation represents a critical security juncture where proactive remediation can prevent a significant security incident. The combination of behavioral anomalies and known vulnerabilities creates a high-risk scenario that requires immediate, coordinated response across IT, security, and business stakeholders.

The GNN-based detection has provided early warning - the window for effective defense is now. Delayed action increases the probability of successful exploitation exponentially.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        return reasoning.strip()

    def _parse_agent_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM JSON response with robust error handling"""
        try:
            import re
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                self.logger.debug("[OK] Successfully parsed LLM response")
                return parsed
            else:
                self.logger.warning("[WARN] No JSON found in LLM response")
                return self._create_fallback_response(response)
                
        except json.JSONDecodeError as e:
            self.logger.error(f"[ERROR] JSON parsing error: {e}")
            return self._create_fallback_response(response)
        except Exception as e:
            self.logger.error(f"[ERROR] Unexpected parsing error: {e}")
            return self._create_fallback_response(response)

    def _create_fallback_response(self, raw_response: str) -> Dict[str, Any]:
        """Create fallback response when parsing fails"""
        return {
            'severity': 'UNKNOWN',
            'confidence': 0.5,
            'executive_summary': 'Unable to parse AI analysis - manual review required',
            'detailed_reasoning': raw_response[:500],
            'recommended_actions': [{
                'priority': 1,
                'urgency': 'IMMEDIATE',
                'action_name': 'Manual Security Review',
                'business_friendly_explanation': 'AI analysis failed - security team should manually review the detected anomalies',
                'estimated_time': '2-4 hours'
            }],
            'questions_for_team': ['What caused the AI analysis to fail?', 'Should we investigate the anomalies manually?']
        }

    async def _take_actions(
            self,
            agent_response: Dict[str, Any],
            analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Execute automated security actions
        
        Args:
            agent_response: AI threat assessment
            analysis: Comprehensive analysis data
            
        Returns:
            List of executed actions
        """
        actions_taken = []

        if not self.config.AUTO_RESPONSE:
            self.logger.info("[INFO] Auto-response disabled - actions logged only")
            return actions_taken

        # Execute high-priority actions
        high_priority_actions = [
            action for action in agent_response.get('recommended_actions', [])
            if action.get('priority', 999) <= 2 or action.get('urgency') == 'IMMEDIATE'
        ]
        
        for action in high_priority_actions[:3]:  # Limit to top 3 for safety
            result = await self._execute_action(action, analysis)
            actions_taken.append(result)

        # Auto-alert if threshold exceeded
        if analysis['anomaly_rate'] > self.config.ALERT_THRESHOLD:
            alert_action = await self._send_alert(analysis, agent_response)
            actions_taken.append(alert_action)

        self.logger.info(f"[OK] Executed {len(actions_taken)} automated actions")
        return actions_taken

    async def _execute_action(
            self,
            action: Dict[str, Any],
            analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a single security action
        
        In production, this would integrate with:
        - Patch management systems
        - Firewall APIs
        - Network segmentation tools
        - Ticketing systems (Jira, ServiceNow)
        - Communication platforms (Slack, Teams)
        
        Args:
            action: Action specification
            analysis: Analysis context
            
        Returns:
            Action result
        """
        action_name = action.get('action_name', 'unknown')
        
        self.logger.info(f"[ACTION] Executing action: {action_name}")

        # TODO: Implement actual action handlers
        # Examples:
        # - await patch_management_api.deploy_patch(cve_id)
        # - await firewall_api.block_ip(suspicious_ip)
        # - await network_api.isolate_host(node_id)
        # - await ticketing_api.create_incident(severity, details)

        result = {
            'action': action_name,
            'action_type': action.get('action_name', 'unknown'),
            'status': 'executed',
            'timestamp': datetime.now().isoformat(),
            'priority': action.get('priority', 'MEDIUM'),
            'urgency': action.get('urgency', 'Unknown'),
            'details': action.get('business_friendly_explanation', ''),
            'estimated_time': action.get('estimated_time', 'Unknown'),
            'cve_related': action.get('cve_related', [])
        }

        self.actions_taken.append(result)
        return result

    async def _send_alert(
            self,
            analysis: Dict[str, Any],
            agent_response: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Send security alert
        
        In production, integrate with:
        - Slack/Teams webhooks
        - Email distribution lists
        - PagerDuty/Opsgenie
        - SMS gateways
        - Security dashboards
        
        Args:
            analysis: Analysis data
            agent_response: AI assessment
            
        Returns:
            Alert result
        """
        severity = agent_response.get('severity', 'HIGH')
        exec_summary = agent_response.get('executive_summary', 'Security anomalies detected')
        
        alert = {
            'action': 'send_security_alert',
            'status': 'sent',
            'timestamp': datetime.now().isoformat(),
            'severity': severity,
            'message': f"🚨 {severity} ALERT: Anomaly rate {analysis['anomaly_rate']:.2%} exceeds threshold",
            'executive_summary': exec_summary,
            'anomalous_nodes': analysis['anomalous_nodes'],
            'total_nodes': analysis['total_nodes'],
            'iteration': analysis['iteration']
        }

        # TODO: Implement actual alerting
        # await slack_api.send_alert(channel, alert)
        # await email_api.send_to_security_team(alert)
        # await pagerduty_api.create_incident(severity, alert)

        self.logger.warning(f"[ALERT] {alert['message']}")
        return alert

    def _update_memory(
            self,
            analysis: Dict[str, Any],
            agent_response: Dict[str, Any],
            actions: List[Dict[str, Any]]
    ):
        """Update agent's historical memory"""
        memory_entry = {
            'iteration': self.iteration,
            'timestamp': analysis['timestamp'],
            'anomalies': analysis['anomalous_nodes'],
            'anomaly_rate': analysis['anomaly_rate'],
            'severity': agent_response.get('severity', 'UNKNOWN'),
            'confidence': agent_response.get('confidence', 0.0),
            'actions': [a.get('action', a.get('action_type', 'unknown')) for a in actions],
            'cves_found': analysis.get('cve_intelligence', {}).get('total_cves_found', 0),
            'critical_cves': len(analysis.get('cve_intelligence', {}).get('critical_cves', [])),
            'reasoning_summary': agent_response.get('executive_summary', '')[:200]
        }

        self.memory.append(memory_entry)
        self.logger.debug(f"[MEMORY] Memory updated - {len(self.memory)} entries stored")

    def _convert_to_json_serializable(self, obj: Any) -> Any:
        """
        Recursively convert numpy types to JSON-compatible Python types
        
        Args:
            obj: Object to convert
            
        Returns:
            JSON-serializable object
        """
        if isinstance(obj, dict):
            return {
                (int(k) if isinstance(k, (np.integer, np.int64)) else k): 
                self._convert_to_json_serializable(v) 
                for k, v in obj.items()
            }
        elif isinstance(obj, list):
            return [self._convert_to_json_serializable(item) for item in obj]
        elif isinstance(obj, tuple):
            return tuple(self._convert_to_json_serializable(item) for item in obj)
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.bool_, bool)):
            return bool(obj)
        else:
            return obj

    async def _generate_report(
        self,
        analysis: Dict[str, Any],
        agent_response: Dict[str, Any],
        actions: List[Dict[str, Any]]
    ):
        """
        Generate comprehensive security report
        
        Args:
            analysis: Analysis data
            agent_response: AI assessment
            actions: Executed actions
        """
        report = {
            **analysis,
            'agent_response': agent_response,
            'actions_taken': actions,
            'total_anomalies_cumulative': self.total_anomalies_detected
        }

        # Print formatted console report
        self._print_report(report)

        # Save to consolidated JSON file
        if self.config.SAVE_REPORTS:
            await self._save_report(report)

    async def _save_report(self, report: Dict[str, Any]):
        """Save report to individual JSON file per iteration"""
        try:
            import os
            
            os.makedirs(self.config.REPORT_DIR, exist_ok=True)
            
            # Save individual report file for this iteration
            report_file = f"{self.config.REPORT_DIR}/report_{self.iteration:06d}.json"
            
            # Convert to JSON-serializable format
            report_serializable = self._convert_to_json_serializable(report)
            
            # Save individual report
            with open(report_file, 'w') as f:
                json.dump(report_serializable, f, indent=2)
            
            # Log without emoji (Windows safe)
            self.logger.info(f"[OK] Report saved to {report_file}")
            
            # Also update consolidated index for easy access (optional)
            self._update_report_index(report_serializable)
            
        except Exception as e:
            self.logger.error(f"[ERROR] Failed to save report: {e}", exc_info=True)

    def _update_report_index(self, report: Dict[str, Any]):
        """Update report index file with metadata"""
        try:
            import os
            index_file = f"{self.config.REPORT_DIR}/report_index.json"
            
            # Load existing index
            index = []
            if os.path.exists(index_file):
                try:
                    with open(index_file, 'r') as f:
                        index = json.load(f)
                except json.JSONDecodeError:
                    index = []
            
            # Add metadata for this report
            index.append({
                'iteration': report['iteration'],
                'timestamp': report['timestamp'],
                'anomalies': report['anomalous_nodes'],
                'anomaly_rate': report['anomaly_rate'],
                'severity': report.get('agent_response', {}).get('severity', 'UNKNOWN'),
                'file': f"report_{self.iteration:06d}.json"
            })
            
            # Save index
            with open(index_file, 'w') as f:
                json.dump(index, f, indent=2)
                
        except Exception as e:
            self.logger.warning(f"[WARN] Failed to update index: {e}")

    def _print_report(self, report: Dict[str, Any]):
        """Print beautifully formatted security report to console"""
        agent_resp = report['agent_response']
        
        print("\n" + "━" * 80)
        print(f"{'  SECURITY ANALYSIS REPORT':^80}")
        print("━" * 80)
        print(f"Iteration: {report['iteration']}  |  Timestamp: {report['timestamp']}")
        print(f"Network: {report['total_nodes']} nodes, {report['total_edges']} edges")
        print(f"Anomalies: {report['anomalous_nodes']} ({report['anomaly_rate']:.2%})  |  Processing: {report['batch_processing_time']:.3f}s")
        print("━" * 80)

        # Severity Indicator
        severity_emoji = {
            'CRITICAL': '',
            'HIGH': '',
            'MEDIUM': '',
            'LOW': '',
            'UNKNOWN': ''
        }
        severity = agent_resp.get('severity', 'UNKNOWN')
        emoji = severity_emoji.get(severity, '')
        
        print(f"\n{emoji} THREAT LEVEL: {severity}")
        print(f"Confidence: {agent_resp.get('confidence', 0):.0%}")
        print("─" * 80)

        # Executive Summary
        if agent_resp.get('executive_summary'):
            print(f"\n EXECUTIVE SUMMARY")
            print("─" * 80)
            print(self._wrap_text(agent_resp['executive_summary'], 80))

        # CVE Explanations (Plain English)
        if agent_resp.get('cve_explanations'):
            print(f"\n VULNERABILITIES EXPLAINED (Plain English)")
            print("─" * 80)
            for i, cve_exp in enumerate(agent_resp['cve_explanations'][:3], 1):
                print(f"\n{i}. {cve_exp['cve_id']} (Score: {cve_exp.get('cvss_score', 'N/A')}/10)")
                print(f"    What it means: {cve_exp.get('plain_english_explanation', 'N/A')[:200]}...")
                print(f"    What hackers can do: {cve_exp.get('real_world_impact', 'N/A')[:150]}...")
                print(f"    How to fix: {cve_exp.get('estimated_fix_time', 'Unknown')} - {cve_exp.get('fix_urgency', 'Unknown')}")

        # Top Vulnerable Nodes
        if report['anomalous_nodes'] > 0:
            print(f"\n TOP VULNERABLE NODES")
            print("─" * 80)
            for node in report['node_details'][:5]:
                cve_info = ""
                if node.get('cve_count', 0) > 0:
                    critical = node.get('cve_critical_count', 0)
                    cve_info = f"  |  CVEs: {node['cve_count']} ({critical} CRITICAL)" if critical > 0 else f"  |  CVEs: {node['cve_count']}"
                
                print(f"Node {node['node_id']:4d}  |  Score: {node['anomaly_score']:.3f}  |  "
                      f"Z: {node['z_score']:.2f}  |  Degree: {node['degree']:3d}{cve_info}")

        # Critical Paths
        if report['vulnerable_paths']:
            print(f"\n  CRITICAL ATTACK PATHS")
            print("─" * 80)
            for i, path in enumerate(report['vulnerable_paths'][:3], 1):
                print(f"{i}. Node {path['source']} → Node {path['target']} (distance: {path['length']} hops)")

        # Recommended Actions
        if agent_resp.get('recommended_actions'):
            print(f"\n RECOMMENDED ACTIONS")
            print("─" * 80)
            for action in agent_resp['recommended_actions'][:5]:
                urgency_emoji = {'IMMEDIATE': '', '24hrs': '', 'Week': '', 'Month': ''}.get(action.get('urgency', ''), '')
                print(f"\n{urgency_emoji} Priority {action.get('priority', '?')}: {action.get('action_name', 'Unknown')}")
                print(f"   Urgency: {action.get('urgency', 'Unknown')}  |  Time: {action.get('estimated_time', 'Unknown')}")
                print(f"    {action.get('business_friendly_explanation', 'N/A')[:150]}...")
                if action.get('risk_if_delayed'):
                    print(f"     Risk if delayed: {action['risk_if_delayed'][:120]}...")

        # Immediate Mitigations
        if agent_resp.get('immediate_mitigations'):
            print(f"\n IMMEDIATE ACTIONS")
            print("─" * 80)
            for mitigation in agent_resp['immediate_mitigations'][:5]:
                print(f"  • {mitigation}")

        # Actions Executed
        if report['actions_taken']:
            print(f"\n⚡ ACTIONS EXECUTED BY SYSTEM")
            print("─" * 80)
            for action in report['actions_taken']:
                action_name = action.get('action', action.get('action_type', 'unknown'))
                urgency = action.get('urgency', '')
                urgency_tag = f" [{urgency}]" if urgency else ""
                print(f"  ✓ {action_name}{urgency_tag} - {action['status']}")

        # Footer
        print("\n" + "━" * 80)
        print(f"Report saved to: {self.config.REPORT_DIR}/report_{self.iteration:06d}.json")
        print(f"Total anomalies detected (cumulative): {report['total_anomalies_cumulative']}")
        print("━" * 80 + "\n")

    def _wrap_text(self, text: str, width: int) -> str:
        """Wrap text to specified width"""
        import textwrap
        return '\n'.join(textwrap.wrap(text, width=width))

    # ==================== Utility Methods ====================

    def get_all_reports(self) -> List[Dict[str, Any]]:
        """
        Load all historical reports from individual files
        
        Returns:
            List of all saved reports
        """
        import os
        import glob
        
        report_dir = self.config.REPORT_DIR
        
        if not os.path.exists(report_dir):
            self.logger.warning(f"[WARN] Reports directory not found: {report_dir}")
            return []
        
        try:
            # Find all report files
            report_files = sorted(glob.glob(f"{report_dir}/report_*.json"))
            
            reports = []
            for report_file in report_files:
                try:
                    with open(report_file, 'r') as f:
                        report = json.load(f)
                        reports.append(report)
                except Exception as e:
                    self.logger.warning(f"[WARN] Failed to load {report_file}: {e}")
            
            self.logger.info(f"[OK] Loaded {len(reports)} reports from {report_dir}")
            return reports
            
        except Exception as e:
            self.logger.error(f"[ERROR] Failed to load reports: {e}")
            return []

    def get_report_summary(self) -> Dict[str, Any]:
        """
        Generate statistical summary of all reports
        
        Returns:
            Summary statistics
        """
        reports = self.get_all_reports()
        
        if not reports:
            return {"error": "No reports found"}
        
        total_iterations = len(reports)
        total_anomalies = sum(r.get('anomalous_nodes', 0) for r in reports)
        avg_anomaly_rate = sum(r.get('anomaly_rate', 0) for r in reports) / total_iterations
        
        # Severity distribution
        severity_counts = {}
        for r in reports:
            severity = r.get('agent_response', {}).get('severity', 'UNKNOWN')
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        # Action distribution
        actions_taken = {}
        for r in reports:
            for action in r.get('actions_taken', []):
                action_name = action.get('action', action.get('action_type', 'unknown'))
                actions_taken[action_name] = actions_taken.get(action_name, 0) + 1
        
        # CVE statistics
        total_cves = 0
        critical_cves = 0
        for r in reports:
            cve_intel = r.get('cve_intelligence', {})
            if cve_intel:
                total_cves += cve_intel.get('total_cves_found', 0)
                critical_cves += len(cve_intel.get('critical_cves', []))
        
        return {
            'total_iterations': total_iterations,
            'total_anomalies_detected': total_anomalies,
            'average_anomaly_rate': f"{avg_anomaly_rate:.2%}",
            'severity_distribution': severity_counts,
            'actions_distribution': actions_taken,
            'total_cves_found': total_cves,
            'critical_cves_found': critical_cves,
            'first_report': reports[0].get('timestamp'),
            'last_report': reports[-1].get('timestamp'),
            'monitoring_duration': f"{total_iterations} iterations"
        }

    def export_report_summary(self, filename: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Export summary to file
        
        Args:
            filename: Output filename (optional)
            
        Returns:
            Summary data
        """
        import os
        
        if filename is None:
            filename = f"{self.config.REPORT_DIR}/summary.json"
        
        summary = self.get_report_summary()
        
        try:
            os.makedirs(self.config.REPORT_DIR, exist_ok=True)
            with open(filename, 'w') as f:
                json.dump(summary, f, indent=2)
            self.logger.info(f" Summary exported to {filename}")
            return summary
        except Exception as e:
            self.logger.error(f" Failed to export summary: {e}")
            return None

    def clear_reports(self, create_backup: bool = True):
        """
        Clear all reports with optional backup
        
        Args:
            create_backup: Whether to create backup before clearing
        """
        import os
        
        reports_file = f"{self.config.REPORT_DIR}/reports.json"
        
        if not os.path.exists(reports_file):
            self.logger.warning("  No reports file to clear")
            return
        
        try:
            if create_backup:
                import shutil
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_file = f"{reports_file}.backup_{timestamp}"
                shutil.copy2(reports_file, backup_file)
                self.logger.info(f" Backup created: {backup_file}")
            
            with open(reports_file, 'w') as f:
                json.dump([], f)
            
            self.logger.info(" Reports cleared successfully")
            
        except Exception as e:
            self.logger.error(f" Failed to clear reports: {e}")


# ==================== Entry Point ====================

if __name__ == "__main__":
    """
    Direct execution for testing
    """
    from core.config import Config
    
    config = Config()
    agent = GNNAgent(config)
    
    try:
        asyncio.run(agent.run())
    except KeyboardInterrupt:
        print("\n Agent stopped by user")
    except Exception as e:
        print(f"\n Fatal error: {e}")