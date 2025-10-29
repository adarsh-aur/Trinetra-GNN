import nvdlib
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import logging
import json


class CVEAnalyzer:
    """
    Integrates NVD CVE database for vulnerability intelligence
    Maps graph anomalies to known CVEs and provides solutions
    """

    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)

        # CVE cache to avoid repeated API calls
        self.cve_cache = {}
        self.cache_timeout = timedelta(hours=24)

        # Track which nodes map to which software/services
        self.node_to_software = {}  # node_id -> {'name': 'Apache', 'version': '2.4.49'}

        # Known CVE mappings
        self.vulnerability_database = defaultdict(list)

        self.logger.info("CVE Analyzer initialized")

    def register_node_software(self, node_id: int, software_info: Dict[str, str]):
        """
        Register what software/service a node is running
        Example: register_node_software(45, {'name': 'Apache', 'version': '2.4.49'})
        """
        self.node_to_software[node_id] = software_info
        self.logger.debug(f"Registered node {node_id}: {software_info}")

    async def analyze_anomalous_nodes(
            self,
            anomalous_nodes: List[int],
            node_details: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze anomalous nodes for known CVEs
        Returns CVE intelligence for each node
        """

        cve_intelligence = {
            'total_cves_found': 0,
            'critical_cves': [],
            'high_cves': [],
            'node_cve_mapping': {},
            'exploit_available': [],
            'kev_listed': [],  # CISA Known Exploited Vulnerabilities
            'recommended_actions': []
        }

        # Process each anomalous node
        for node_id in anomalous_nodes[:20]:  # Limit to avoid rate limiting
            if node_id in self.node_to_software:
                software_info = self.node_to_software[node_id]

                # Search for CVEs
                cves = await self._search_cves_for_software(software_info)

                if cves:
                    cve_intelligence['node_cve_mapping'][node_id] = cves
                    cve_intelligence['total_cves_found'] += len(cves)

                    # Categorize by severity
                    for cve_data in cves:
                        if cve_data['severity'] == 'CRITICAL':
                            cve_intelligence['critical_cves'].append(cve_data)
                        elif cve_data['severity'] == 'HIGH':
                            cve_intelligence['high_cves'].append(cve_data)

                        # Check for exploits
                        if cve_data.get('exploit_available'):
                            cve_intelligence['exploit_available'].append(cve_data)

                        # Check KEV catalog
                        if cve_data.get('kev_listed'):
                            cve_intelligence['kev_listed'].append(cve_data)

        # Generate recommendations
        cve_intelligence['recommended_actions'] = self._generate_cve_actions(
            cve_intelligence
        )

        return cve_intelligence

    async def _search_cves_for_software(
            self,
            software_info: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Search NVD for CVEs related to specific software"""

        cache_key = f"{software_info['name']}:{software_info.get('version', 'any')}"

        # Check cache
        if cache_key in self.cve_cache:
            cached = self.cve_cache[cache_key]
            if datetime.now() - cached['timestamp'] < self.cache_timeout:
                return cached['data']

        cve_results = []

        try:
            # Search by keyword
            keyword = software_info['name']

            # Rate limiting: 6 seconds without API key, 0.6 with key
            delay = 0.6 if self.config.NVD_API_KEY else 6

            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            search_results = await loop.run_in_executor(
                None,
                lambda: nvdlib.searchCVE(
                    keywordSearch=keyword,
                    key=self.config.NVD_API_KEY if self.config.NVD_API_KEY else None,
                    delay=delay,
                    limit=10  # Limit results per software
                )
            )

            # Process results
            for cve in search_results:
                cve_data = self._extract_cve_info(cve)

                # Filter by version if specified
                if 'version' in software_info:
                    if self._version_affected(cve, software_info['version']):
                        cve_results.append(cve_data)
                else:
                    cve_results.append(cve_data)

            # Cache results
            self.cve_cache[cache_key] = {
                'timestamp': datetime.now(),
                'data': cve_results
            }

            self.logger.info(
                f"Found {len(cve_results)} CVEs for {software_info['name']}"
            )

        except Exception as e:
            self.logger.error(f"CVE search failed for {software_info}: {e}")

        return cve_results

    def _extract_cve_info(self, cve) -> Dict[str, Any]:
        """Extract relevant information from CVE object"""

        # Get CVSS score and severity
        severity = 'UNKNOWN'
        score = 0.0
        vector = ''

        if hasattr(cve, 'v31severity') and cve.v31severity:
            severity = cve.v31severity
            score = cve.v31score if hasattr(cve, 'v31score') else 0.0
            vector = cve.v31vector if hasattr(cve, 'v31vector') else ''
        elif hasattr(cve, 'v2severity') and cve.v2severity:
            severity = cve.v2severity
            score = cve.v2score if hasattr(cve, 'v2score') else 0.0

        # Get description
        description = ''
        if hasattr(cve, 'descriptions') and cve.descriptions:
            description = cve.descriptions[0].value

        # Check KEV catalog
        kev_listed = hasattr(cve, 'exploitAdd') and cve.exploitAdd

        # Extract attack complexity and other metrics
        metrics = self._parse_cvss_vector(vector)

        return {
            'cve_id': cve.id,
            'severity': severity,
            'score': score,
            'vector': vector,
            'description': description,
            'published': cve.published if hasattr(cve, 'published') else None,
            'lastModified': cve.lastModified if hasattr(cve, 'lastModified') else None,
            'kev_listed': kev_listed,
            'exploit_available': kev_listed,  # If in KEV, exploit exists
            'attack_vector': metrics.get('AV', 'UNKNOWN'),
            'attack_complexity': metrics.get('AC', 'UNKNOWN'),
            'privileges_required': metrics.get('PR', 'UNKNOWN'),
            'user_interaction': metrics.get('UI', 'UNKNOWN'),
            'references': [ref.url for ref in cve.references] if hasattr(cve, 'references') else [],
            'cwe': cve.cwe[0].value if hasattr(cve, 'cwe') and cve.cwe else None
        }

    def _parse_cvss_vector(self, vector: str) -> Dict[str, str]:
        """Parse CVSS vector string into components"""
        metrics = {}
        if vector:
            parts = vector.split('/')
            for part in parts[1:]:  # Skip CVSS:3.1
                if ':' in part:
                    key, value = part.split(':')
                    metrics[key] = value
        return metrics

    def _version_affected(self, cve, version: str) -> bool:
        """Check if specific version is affected (simplified)"""
        # This is a simplified version check
        # In production, use proper CPE matching

        if not hasattr(cve, 'cpe'):
            return True  # Assume affected if no CPE data

        # Check CPE configurations
        # This is simplified - proper implementation should use CPE matching
        return True

    def _generate_cve_actions(self, cve_intelligence: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate recommended actions based on CVE findings"""

        actions = []

        # Critical CVEs - immediate action
        if cve_intelligence['critical_cves']:
            actions.append({
                'priority': 'CRITICAL',
                'action': 'patch_critical_vulnerabilities',
                'reason': f"{len(cve_intelligence['critical_cves'])} critical CVEs found",
                'cves': [cve['cve_id'] for cve in cve_intelligence['critical_cves'][:5]],
                'timeline': 'Immediate - within 24 hours'
            })

        # KEV-listed CVEs - high priority
        if cve_intelligence['kev_listed']:
            actions.append({
                'priority': 'HIGH',
                'action': 'address_known_exploited_vulnerabilities',
                'reason': f"{len(cve_intelligence['kev_listed'])} CVEs in CISA KEV catalog",
                'cves': [cve['cve_id'] for cve in cve_intelligence['kev_listed'][:5]],
                'timeline': 'High priority - within 72 hours'
            })

        # Exploits available - high priority
        if cve_intelligence['exploit_available']:
            actions.append({
                'priority': 'HIGH',
                'action': 'mitigate_exploitable_vulnerabilities',
                'reason': 'Public exploits available',
                'cves': [cve['cve_id'] for cve in cve_intelligence['exploit_available'][:5]],
                'timeline': 'Within 1 week'
            })

        # High severity CVEs - medium priority
        if cve_intelligence['high_cves']:
            actions.append({
                'priority': 'MEDIUM',
                'action': 'schedule_high_severity_patches',
                'reason': f"{len(cve_intelligence['high_cves'])} high severity CVEs",
                'cves': [cve['cve_id'] for cve in cve_intelligence['high_cves'][:5]],
                'timeline': 'Within 30 days'
            })

        return actions

    def get_cve_details(self, cve_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific CVE"""
        try:
            cve = nvdlib.searchCVE(cveId=cve_id, key=self.config.NVD_API_KEY)[0]
            return self._extract_cve_info(cve)
        except Exception as e:
            self.logger.error(f"Failed to get CVE {cve_id}: {e}")
            return None

    def generate_cve_report(self, cve_intelligence: Dict[str, Any]) -> str:
        """Generate human-readable CVE report"""

        report = []
        report.append("=" * 80)
        report.append("CVE INTELLIGENCE REPORT")
        report.append("=" * 80)
        report.append(f"Total CVEs Found: {cve_intelligence['total_cves_found']}")
        report.append(f"Critical: {len(cve_intelligence['critical_cves'])}")
        report.append(f"High: {len(cve_intelligence['high_cves'])}")
        report.append(f"Known Exploited (KEV): {len(cve_intelligence['kev_listed'])}")
        report.append("")

        # Critical CVEs
        if cve_intelligence['critical_cves']:
            report.append("CRITICAL VULNERABILITIES:")
            report.append("-" * 80)
            for cve in cve_intelligence['critical_cves'][:5]:
                report.append(f"  {cve['cve_id']} - Score: {cve['score']}")
                report.append(f"  Attack Vector: {cve['attack_vector']} | "
                              f"Complexity: {cve['attack_complexity']}")
                report.append(f"  {cve['description'][:100]}...")
                report.append("")

        # KEV Listed
        if cve_intelligence['kev_listed']:
            report.append("KNOWN EXPLOITED VULNERABILITIES (CISA KEV):")
            report.append("-" * 80)
            for cve in cve_intelligence['kev_listed'][:5]:
                report.append(f"  ⚠️  {cve['cve_id']} - EXPLOIT EXISTS IN THE WILD")
                report.append(f"  {cve['description'][:100]}...")
                report.append("")

        # Recommended Actions
        if cve_intelligence['recommended_actions']:
            report.append("RECOMMENDED ACTIONS:")
            report.append("-" * 80)
            for action in cve_intelligence['recommended_actions']:
                report.append(f"  [{action['priority']}] {action['action']}")
                report.append(f"  Reason: {action['reason']}")
                report.append(f"  Timeline: {action['timeline']}")
                report.append(f"  CVEs: {', '.join(action['cves'][:3])}")
                report.append("")

        report.append("=" * 80)

        return "\n".join(report)


"""
Enhanced core/config.py - Add NVD API configuration
"""


@dataclass
class Config:
    """Agent configuration with CVE integration"""

    # ... (previous config) ...

    # NVD API Configuration
    NVD_API_KEY: Optional[str] = os.getenv("NVD_API_KEY", None)  # Optional but recommended
    NVD_CACHE_TIMEOUT: int = 24  # hours
    NVD_ENABLED: bool = True

    # CVE Analysis
    ANALYZE_CVES: bool = True
    MAX_CVES_PER_NODE: int = 10
    CVE_SEVERITY_FILTER: List[str] = None  # ['CRITICAL', 'HIGH'] or None for all


"""
Enhanced core/agent.py - Integrate CVE Analysis
Add to existing GNNAgent class:
"""


class GNNAgent:
    """Enhanced with CVE intelligence"""

    def __init__(self, config: Config):
        # ... (existing init) ...

        # Add CVE analyzer
        if config.ANALYZE_CVES and config.NVD_ENABLED:
            self.cve_analyzer = CVEAnalyzer(config)
            self.logger.info("CVE analysis enabled")
        else:
            self.cve_analyzer = None
            self.logger.info("CVE analysis disabled")

    async def _analyze_batch_results(
            self,
            batch_results: Dict[str, Any],
            graph_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enhanced with CVE analysis"""

        # ... (existing analysis code) ...

        # Add CVE intelligence
        if self.cve_analyzer:
            cve_intelligence = await self.cve_analyzer.analyze_anomalous_nodes(
                anomalous_nodes,
                node_details
            )
            analysis['cve_intelligence'] = cve_intelligence

            # Print CVE report
            cve_report = self.cve_analyzer.generate_cve_report(cve_intelligence)
            print(cve_report)
        else:
            analysis['cve_intelligence'] = None

        return analysis

    def _build_agent_prompt(self, analysis: Dict[str, Any], context: str) -> str:
        """Enhanced prompt with CVE data"""

        cve_section = ""
        if analysis.get('cve_intelligence'):
            cve_intel = analysis['cve_intelligence']
            cve_section = f"""
CVE INTELLIGENCE:
- Total CVEs: {cve_intel['total_cves_found']}
- Critical: {len(cve_intel['critical_cves'])}
- High: {len(cve_intel['high_cves'])}
- Known Exploited: {len(cve_intel['kev_listed'])}
- Top CVEs: {[cve['cve_id'] for cve in cve_intel['critical_cves'][:3]]}
"""

        prompt = f"""You are {self.config.AGENT_NAME}, an autonomous AI agent specialized in {self.config.AGENT_ROLE}.

{context}

CURRENT ANALYSIS:
```json
{json.dumps({
            'timestamp': analysis['timestamp'],
            'graph_size': f"{analysis['total_nodes']} nodes, {analysis['total_edges']} edges",
            'anomalies': analysis['anomalous_nodes'],
            'anomaly_rate': f"{analysis['anomaly_rate']:.2%}",
            'max_zscore': analysis['max_zscore'],
            'top_vulnerable_nodes': analysis['node_details'][:5],
            'critical_paths': analysis['vulnerable_paths'][:3]
        }, indent=2)}
```

{cve_section}

As an autonomous agent with CVE intelligence, analyze this situation and respond in JSON format:

{{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "confidence": 0.0-1.0,
  "reasoning": "Your analysis including CVE context",
  "threats_identified": ["threat1 (CVE-XXXX-XXXXX)", "threat2"],
  "cve_analysis": "How detected anomalies relate to known CVEs",
  "recommended_actions": [
    {{"action": "action_name", "priority": "HIGH|MEDIUM|LOW", "reason": "why", "cve_related": "CVE-XXXX-XXXXX"}}
  ],
  "patch_priority": ["CVE-XXXX-XXXXX", "CVE-YYYY-YYYYY"],
  "predictions": "What might happen next",
  "questions": ["Any uncertainties"]
}}

Respond ONLY with valid JSON."""

        return prompt


"""
Example usage in main.py:
"""


async def setup_node_software_mapping(agent):
    """
    Register which software each node is running
    This would come from your asset inventory or discovery system
    """

    # Example: Map nodes to software
    software_mappings = {
        45: {'name': 'Apache', 'version': '2.4.49'},
        67: {'name': 'OpenSSH', 'version': '7.4'},
        89: {'name': 'Microsoft Exchange', 'version': '2019'},
        12: {'name': 'nginx', 'version': '1.18.0'},
        34: {'name': 'WordPress', 'version': '5.8'},
        # Add more mappings...
    }

    for node_id, software in software_mappings.items():
        agent.cve_analyzer.register_node_software(node_id, software)

    print(f"Registered {len(software_mappings)} node-software mappings")


async def main():
    """Enhanced main with CVE intelligence"""
    config = Config()
    agent = GNNAgent(config)

    # Setup software mappings
    if agent.cve_analyzer:
        await setup_node_software_mapping(agent)

    print("=" * 80)
    print("AGENTIC AI GNN MONITORING SYSTEM WITH CVE INTELLIGENCE")
    print("=" * 80)
    print(f"Agent: {config.AGENT_NAME}")
    print(f"LLM: Groq ({config.GROQ_MODEL})")
    print(f"CVE Analysis: {'Enabled' if config.ANALYZE_CVES else 'Disabled'}")
    print(f"NVD API Key: {'Configured' if config.NVD_API_KEY else 'Not configured (rate limited)'}")
    print("=" * 80 + "\n")

    await agent.run()


"""
Enhanced requirements.txt - Add nvdlib
"""
REQUIREMENTS = """torch>=2.0.0
torch-geometric>=2.3.0
networkx>=3.0
numpy>=1.24.0
scipy>=1.10.0
aiohttp>=3.8.0
tiktoken>=0.5.0
python-dotenv>=1.0.0
nvdlib>=0.7.4
"""

"""
Enhanced .env.example
"""
ENV_EXAMPLE = """# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here

# NVD API Configuration (Optional but recommended)
# Get free key from: https://nvd.nist.gov/developers/request-an-api-key
NVD_API_KEY=your_nvd_api_key_here

# Configuration
ZSCORE_THRESHOLD=3.0
BATCH_SIZE=32
UPDATE_INTERVAL=2.0
LOG_LEVEL=INFO
ANALYZE_CVES=true
"""

if __name__ == "__main__":
    print("=" * 80)
    print("CVE-ENHANCED AGENTIC AI GNN SYSTEM")
    print("=" * 80)
    print("\nThis enhanced system adds CVE intelligence capabilities!")
    print("\nNew Features:")
    print("  ✓ Real-time CVE lookup for anomalous nodes")
    print("  ✓ CVSS severity scoring")
    print("  ✓ CISA KEV catalog integration")
    print("  ✓ Exploit availability detection")
    print("  ✓ Automated patch prioritization")
    print("  ✓ Type-specific solutions from NVD")
    print("\n" + "=" * 80)