import asyncio
import sys
import shutil
import os
from pathlib import Path
from core.agent import GNNAgent
from core.config import Config


async def setup_node_software_mapping(agent):
    """
    Register which software each node is running.
    In production, this would come from your asset inventory or discovery system.
    """

    # Check if CVE analyzer is available
    if not hasattr(agent, 'cve_analyzer') or agent.cve_analyzer is None:
        print("⚠️  CVE Analyzer not available - skipping software mapping")
        print("    (This is OK - system will work without CVE intelligence)")
        print()
        return

    # Example software mappings - replace with your actual asset inventory
    software_mappings = {
        # Node ID: {'name': 'Software Name', 'version': 'Version'}
        45: {'name': 'Apache HTTP Server', 'version': '2.4.49'},
        67: {'name': 'OpenSSH', 'version': '7.4'},
        89: {'name': 'Microsoft Exchange Server', 'version': '2019'},
        12: {'name': 'nginx', 'version': '1.18.0'},
        34: {'name': 'WordPress', 'version': '5.8'},
        56: {'name': 'MySQL', 'version': '8.0.23'},
        78: {'name': 'PostgreSQL', 'version': '13.0'},
        23: {'name': 'Redis', 'version': '6.0.9'},
        90: {'name': 'Docker', 'version': '20.10.7'},
        101: {'name': 'Kubernetes', 'version': '1.21.0'},
    }

    for node_id, software in software_mappings.items():
        agent.cve_analyzer.register_node_software(node_id, software)

    print(f"✓ Registered {len(software_mappings)} node-software mappings\n")


async def main():
    """Main entry point"""

    try:
        # Load configuration
        config = Config()
        report_path = Path(config.REPORT_DIR)
        if report_path.exists() and config.SAVE_REPORTS:
            print(f"Clearing old reports in: {report_path.resolve()}")
            shutil.rmtree(report_path)

        os.makedirs(report_path, exist_ok=True)

        # Create agent
        agent = GNNAgent(config)

        # Setup software mappings for CVE analysis (if available)
        await setup_node_software_mapping(agent)

        # Print banner
        print("=" * 80)
        print("🤖 AGENTIC AI GNN MONITORING SYSTEM WITH CVE INTELLIGENCE")
        print("=" * 80)
        print(f"Agent: {config.AGENT_NAME}")
        print(f"LLM: Groq ({config.GROQ_MODEL})")
        print(f"Batch Size: {config.BATCH_SIZE}")
        print(f"Z-score Threshold: {config.ZSCORE_THRESHOLD}")

        # Check CVE status
        if hasattr(agent, 'cve_analyzer') and agent.cve_analyzer:
            print(f"CVE Analysis: Enabled ✓")
            print(f"NVD API: {'Configured ✓' if config.NVD_API_KEY else 'Not configured (rate limited)'}")
        else:
            print(f"CVE Analysis: Disabled (check nvdlib installation)")

        print("=" * 80)
        print()
        print("Press Ctrl+C to stop")
        print()

        # Run agent
        await agent.run()

    except KeyboardInterrupt:
        print("\n\n" + "=" * 80)
        print("🛑 Agent stopped by user")
        print("=" * 80)
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

    async def main():
        agent = GNNAgent(Config())
        try:
            await agent.run()
        except asyncio.CancelledError:
            print("Agent run was cancelled. Cleaning up...")
            # Optional: do cleanup here
        return

    async def main():
        agent = GNNAgent(Config())
        try:
            await agent.run()
        except asyncio.CancelledError:
            print("Agent run was cancelled. Cleaning up...")
        # Optional: do cleanup here
        return
if __name__ == "__main__":
    asyncio.run(main())