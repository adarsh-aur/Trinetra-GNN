import re

# Path to your log file
path = r"D:\Final Year Project\LLM_Final_Year\LLM_final_year\multi-cloud-gnn\backend\sample_data\security_logs.log"

# --- Regex patterns ---
ip_pattern = re.compile(r'(?:\d{1,3}\.){3}\d{1,3}')
host_pattern = re.compile(r'host\.name=([\w\.-]+)')
user_pattern = re.compile(r'user(?:\.name)?=([\w\.-]+)', re.IGNORECASE)
cve_pattern = re.compile(r'CVE-\d{4}-\d+', re.IGNORECASE)

# --- Counters and containers ---
total = parsed = bad = 0
nodes = set()
edges = set()

with open(path, encoding="utf-8", errors="ignore") as f:
    for line in f:
        total += 1

        # Check for parseable UDM-type fields
        if re.search(r'(source\.ip|destination\.ip|host\.name)=', line):
            parsed += 1

            # Extract potential entities (nodes)
            ips = ip_pattern.findall(line)
            hosts = host_pattern.findall(line)
            users = user_pattern.findall(line)
            cves = cve_pattern.findall(line)

            # Add them as nodes
            for ip in ips:
                nodes.add(("ip", ip))
            for h in hosts:
                nodes.add(("host", h))
            for u in users:
                nodes.add(("user", u))
            for c in cves:
                nodes.add(("cve", c))

            # --- Create potential edges ---
            # Simple heuristics:
            # 1. If source and destination IPs exist, link them.
            # 2. If a host and CVE occur, link host→CVE.
            # 3. If user and host/IP appear, link user→host/IP.
            if "source.ip=" in line and "destination.ip=" in line:
                src = re.search(r'source\.ip=(\S+)', line)
                dst = re.search(r'destination\.ip=(\S+)', line)
                if src and dst:
                    edges.add(("ip:"+src.group(1), "ip:"+dst.group(1), "network_flow"))

            if hosts and cves:
                for h in hosts:
                    for c in cves:
                        edges.add(("host:"+h, "cve:"+c, "vulnerability"))

            if users:
                for u in users:
                    for ip in ips:
                        edges.add(("user:"+u, "ip:"+ip, "activity"))
                    for h in hosts:
                        edges.add(("user:"+u, "host:"+h, "login"))
        else:
            bad += 1

# --- Results ---
print(f"Total lines: {total}")
print(f"Parsable lines (have ip/host): {parsed}")
print(f"Skipped lines: {bad}")
print(f"Unique nodes (estimated): {len(nodes)}")
print(f"Estimated edges (post-UDM+preprocessing+NVD/CVE): {len(edges)}")