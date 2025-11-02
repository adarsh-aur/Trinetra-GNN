import nvdlib
import asyncio
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import logging
import json
import numpy as np


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
        self.cache_timeout = timedelta(hours=self.config.NVD_CACHE_TIMEOUT if hasattr(self.config, 'NVD_CACHE_TIMEOUT') else 24)

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
        # 🔧 FIX: Ensure node_id is native Python int
        node_id_int = int(node_id)
        self.node_to_software[node_id_int] = software_info
        self.logger.debug(f"Registered node {node_id_int}: {software_info}")

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
            'node_cve_mapping': {},  # This will store int keys, not int64
            'exploit_available': [],
            'kev_listed': [],  # CISA Known Exploited Vulnerabilities
            'recommended_actions': []
        }

        # Process each anomalous node
        for node_id in anomalous_nodes[:20]:  # Limit to avoid rate limiting
            # 🔧 FIX: Convert numpy int64 to native Python int
            node_id_int = int(node_id)
            
            if node_id_int in self.node_to_software:
                software_info = self.node_to_software[node_id_int]

                # Search for CVEs
                cves = await self._search_cves_for_software(software_info)

                if cves:
                    # 🔧 FIX: Use native Python int as key, not numpy int64
                    cve_intelligence['node_cve_mapping'][node_id_int] = cves
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

        # 🔧 FIX: Ensure all data is JSON serializable before returning
        cve_intelligence = self._ensure_json_serializable(cve_intelligence)

        return cve_intelligence

    def _ensure_json_serializable(self, cve_intelligence: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensure all data in CVE intelligence is JSON serializable
        Converts numpy types to native Python types
        """
        # Convert node_cve_mapping keys from int64 to int
        if 'node_cve_mapping' in cve_intelligence:
            cve_intelligence['node_cve_mapping'] = {
                int(k): v for k, v in cve_intelligence['node_cve_mapping'].items()
            }
        
        # Ensure all numeric values are native Python types
        for key in ['total_cves_found']:
            if key in cve_intelligence and isinstance(cve_intelligence[key], np.integer):
                cve_intelligence[key] = int(cve_intelligence[key])
        
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

            # Rate limiting logic
            api_key = self.config.NVD_API_KEY if hasattr(self.config, 'NVD_API_KEY') else None
            delay = 0.6 if api_key else 6

            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            search_results = await loop.run_in_executor(
                None,
                lambda: nvdlib.searchCVE(
                    keywordSearch=keyword,
                    key=api_key,
                    delay=delay,
                    limit=10  # Limit results per software
                )
            )

            # Process results
            for cve in search_results:
                cve_data = self._extract_cve_info(cve)

                # Filter by version if specified (simplified check)
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
        """Extract relevant information from CVE object with proper type conversion"""

        # Get CVSS score and severity
        severity = 'UNKNOWN'
        score = 0.0
        vector = ''

        # Use v3.1 if available, fallback to v2
        if hasattr(cve, 'v31severity') and cve.v31severity:
            severity = str(cve.v31severity)
            score = float(cve.v31score) if hasattr(cve, 'v31score') else 0.0
            vector = str(cve.v31vector) if hasattr(cve, 'v31vector') else ''
        elif hasattr(cve, 'v2severity') and cve.v2severity:
            severity = str(cve.v2severity)
            score = float(cve.v2score) if hasattr(cve, 'v2score') else 0.0

        # Get description
        description = ''
        if hasattr(cve, 'descriptions') and cve.descriptions:
            description = str(cve.descriptions[0].value)

        # Check KEV catalog (simplified)
        kev_listed = bool(hasattr(cve, 'exploitAdd') and cve.exploitAdd)

        # Extract attack complexity and other metrics
        metrics = self._parse_cvss_vector(vector)

        # Get published and modified dates
        published = None
        if hasattr(cve, 'published'):
            published = str(cve.published) if cve.published else None
        
        last_modified = None
        if hasattr(cve, 'lastModified'):
            last_modified = str(cve.lastModified) if cve.lastModified else None

        # Get references (URLs)
        references = []
        if hasattr(cve, 'references') and cve.references:
            references = [str(ref.url) for ref in cve.references]

        # Get CWE
        cwe = None
        if hasattr(cve, 'cwe') and cve.cwe and len(cve.cwe) > 0:
            cwe = str(cve.cwe[0].value) if hasattr(cve.cwe[0], 'value') else None

        return {
            'cve_id': str(cve.id),
            'severity': severity,
            'score': float(score),
            'vector': vector,
            'description': description,
            'published': published,
            'lastModified': last_modified,
            'kev_listed': bool(kev_listed),
            'exploit_available': bool(kev_listed),  # If in KEV, exploit exists
            'attack_vector': str(metrics.get('AV', 'UNKNOWN')),
            'attack_complexity': str(metrics.get('AC', 'UNKNOWN')),
            'privileges_required': str(metrics.get('PR', 'UNKNOWN')),
            'user_interaction': str(metrics.get('UI', 'UNKNOWN')),
            'references': references,
            'cwe': cwe
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
        if not hasattr(cve, 'cpe'):
            return True  # Assume affected if no CPE data
        return True  # Simplified check

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
            api_key = self.config.NVD_API_KEY if hasattr(self.config, 'NVD_API_KEY') else None
            cve = nvdlib.searchCVE(cveId=cve_id, key=api_key)[0]
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