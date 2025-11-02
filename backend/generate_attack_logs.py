#!/usr/bin/env python3
"""
Generate synthetic attack logs with CVE identifiers and MITRE ATT&CK techniques
Save to: backend/sample_data/attack_scenario.log
"""

import random
from datetime import datetime, timedelta

# Real CVE database with severity scores
CVE_DATABASE = {
    "ssh": [
        ("CVE-2024-6387", 8.1, "OpenSSH RCE vulnerability"),
        ("CVE-2023-48795", 5.9, "SSH protocol weakness"),
        ("CVE-2023-51385", 6.5, "SSH key verification bypass")
    ],
    "web": [
        ("CVE-2024-23897", 9.8, "Jenkins arbitrary file read"),
        ("CVE-2023-46604", 10.0, "Apache ActiveMQ RCE"),
        ("CVE-2024-1234", 7.5, "HTTP request smuggling")
    ],
    "db": [
        ("CVE-2024-21123", 8.8, "MySQL privilege escalation"),
        ("CVE-2023-5432", 9.1, "PostgreSQL arbitrary code execution"),
        ("CVE-2024-1086", 7.8, "Database access control bypass")
    ],
    "kernel": [
        ("CVE-2024-1086", 7.8, "Linux kernel use-after-free"),
        ("CVE-2023-4623", 7.8, "Netfilter privilege escalation"),
        ("CVE-2024-0193", 6.7, "NVIDIA kernel driver vulnerability")
    ],
    "container": [
        ("CVE-2024-21626", 8.6, "Docker/runc container escape"),
        ("CVE-2023-5528", 7.5, "Kubernetes privilege escalation"),
        ("CVE-2024-3094", 10.0, "XZ Utils backdoor")
    ]
}

# MITRE ATT&CK techniques
ATTACK_TECHNIQUES = {
    "Initial_Access": [
        ("T1078.004", "Valid Accounts: Cloud Accounts"),
        ("T1190", "Exploit Public-Facing Application"),
        ("T1133", "External Remote Services")
    ],
    "Execution": [
        ("T1059.004", "Command and Scripting Interpreter: Unix Shell"),
        ("T1053.003", "Scheduled Task/Job: Cron"),
        ("T1203", "Exploitation for Client Execution")
    ],
    "Persistence": [
        ("T1136.001", "Create Account: Local Account"),
        ("T1098", "Account Manipulation"),
        ("T1547.001", "Boot or Logon Autostart Execution")
    ],
    "Privilege_Escalation": [
        ("T1068", "Exploitation for Privilege Escalation"),
        ("T1548.001", "Abuse Elevation Control Mechanism: Setuid"),
        ("T1611", "Escape to Host")
    ],
    "Defense_Evasion": [
        ("T1070.004", "Indicator Removal: File Deletion"),
        ("T1562.001", "Impair Defenses: Disable Tools"),
        ("T1036", "Masquerading")
    ],
    "Credential_Access": [
        ("T1110.001", "Brute Force: Password Guessing"),
        ("T1555", "Credentials from Password Stores"),
        ("T1003", "OS Credential Dumping")
    ],
    "Lateral_Movement": [
        ("T1021.004", "Remote Services: SSH"),
        ("T1563", "Remote Service Session Hijacking"),
        ("T1080", "Taint Shared Content")
    ],
    "Exfiltration": [
        ("T1567.002", "Exfiltration Over Web Service: Cloud Storage"),
        ("T1041", "Exfiltration Over C2 Channel"),
        ("T1048", "Exfiltration Over Alternative Protocol")
    ]
}

# Attack source IPs
ATTACKER_IPS = [
    "203.0.113.45",  # Suspicious external IP
    "198.51.100.23",  # Known malicious IP
    "192.0.2.100",   # Test network IP
    "185.220.101.45" # Tor exit node
]

# Target infrastructure
AWS_IPS = ["172.31.42.16", "10.0.1.100", "10.0.2.50"]
AWS_INSTANCES = ["i-0abc123def456", "i-0xyz789ghi012"]
AWS_REGIONS = ["us-east-1", "eu-west-1", "ap-south-1"]

def generate_timestamp(base_time, offset_minutes):
    """Generate syslog timestamp"""
    new_time = base_time + timedelta(minutes=offset_minutes)
    return new_time.strftime("%b %d %H:%M:%S")

def generate_ssh_exploit():
    """SSH exploitation with CVE"""
    cve_id, score, desc = random.choice(CVE_DATABASE["ssh"])
    technique, tactic = random.choice(ATTACK_TECHNIQUES["Initial_Access"])
    attacker = random.choice(ATTACKER_IPS)
    target = random.choice(AWS_IPS)
    
    logs = []
    base = datetime.now() - timedelta(hours=2)
    
    # Failed attempts
    for i in range(3):
        ts = generate_timestamp(base, i)
        logs.append(
            f"<86>{ts} aws-instance sshd[12345]: Failed password for invalid user admin from {attacker} port 52847 ssh2 cve={cve_id} severity=HIGH"
        )
    
    # Successful breach
    ts = generate_timestamp(base, 5)
    logs.append(
        f"<86>{ts} aws-instance sshd[12345]: Accepted password for root from {attacker} port 52847 ssh2 cve={cve_id} technique={technique} tactic=Initial_Access status=BREACH severity=CRITICAL"
    )
    
    return logs

def generate_web_exploit():
    """Web application exploitation"""
    cve_id, score, desc = random.choice(CVE_DATABASE["web"])
    technique, tactic = random.choice(ATTACK_TECHNIQUES["Execution"])
    attacker = random.choice(ATTACKER_IPS)
    target = random.choice(AWS_IPS)
    
    logs = []
    base = datetime.now() - timedelta(hours=1, minutes=30)
    
    ts = generate_timestamp(base, 0)
    logs.append(
        f"<134>{ts} aws-web-server httpd[8080]: GET /api/exploit?cmd=whoami from {attacker} cve={cve_id} technique={technique} tactic=Execution status=EXPLOITED user=www-data target={target}"
    )
    
    ts = generate_timestamp(base, 2)
    logs.append(
        f"<134>{ts} aws-web-server httpd[8080]: POST /upload/shell.php from {attacker} cve={cve_id} technique=T1059.004 tactic=Execution status=WEBSHELL_UPLOADED size=4096"
    )
    
    return logs

def generate_privilege_escalation():
    """Kernel exploit for privilege escalation"""
    cve_id, score, desc = random.choice(CVE_DATABASE["kernel"])
    technique, tactic = random.choice(ATTACK_TECHNIQUES["Privilege_Escalation"])
    target = random.choice(AWS_IPS)
    
    logs = []
    base = datetime.now() - timedelta(hours=1)
    
    ts = generate_timestamp(base, 0)
    logs.append(
        f"<131>{ts} aws-instance kernel: [exploit] Attempting privilege escalation cve={cve_id} technique={technique} tactic=Privilege_Escalation process=exploit user=www-data target_user=root"
    )
    
    ts = generate_timestamp(base, 1)
    logs.append(
        f"<131>{ts} aws-instance kernel: [exploit] UID changed: www-data (33) -> root (0) cve={cve_id} status=ROOT_OBTAINED severity=CRITICAL"
    )
    
    return logs

def generate_container_escape():
    """Container escape to host"""
    cve_id, score, desc = random.choice(CVE_DATABASE["container"])
    technique, tactic = ("T1611", "Escape to Host")
    instance = random.choice(AWS_INSTANCES)
    
    logs = []
    base = datetime.now() - timedelta(minutes=45)
    
    ts = generate_timestamp(base, 0)
    logs.append(
        f"<133>{ts} aws-ecs-host dockerd[2341]: Container escape attempt detected cve={cve_id} technique={technique} tactic=Privilege_Escalation container_id=c8f3a9b2d1e4 instance={instance}"
    )
    
    ts = generate_timestamp(base, 2)
    logs.append(
        f"<133>{ts} aws-ecs-host dockerd[2341]: Host filesystem mounted in container cve={cve_id} technique={technique} status=ESCAPED path=/host severity=CRITICAL"
    )
    
    return logs

def generate_database_breach():
    """Database exploitation"""
    cve_id, score, desc = random.choice(CVE_DATABASE["db"])
    technique, tactic = random.choice(ATTACK_TECHNIQUES["Credential_Access"])
    attacker = random.choice(ATTACKER_IPS)
    target = random.choice(AWS_IPS)
    
    logs = []
    base = datetime.now() - timedelta(minutes=30)
    
    ts = generate_timestamp(base, 0)
    logs.append(
        f"<134>{ts} aws-rds-mysql mysqld[5432]: Unauthorized SQL injection attempt from {attacker} cve={cve_id} technique={technique} query='UNION SELECT password FROM users' status=BLOCKED"
    )
    
    ts = generate_timestamp(base, 5)
    logs.append(
        f"<134>{ts} aws-rds-mysql mysqld[5432]: Authentication bypass successful cve={cve_id} technique={technique} tactic=Credential_Access user=admin from={attacker} status=BREACH severity=HIGH"
    )
    
    return logs

def generate_lateral_movement():
    """Lateral movement between instances"""
    technique, tactic = random.choice(ATTACK_TECHNIQUES["Lateral_Movement"])
    source = AWS_IPS[0]
    target = AWS_IPS[1]
    
    logs = []
    base = datetime.now() - timedelta(minutes=15)
    
    ts = generate_timestamp(base, 0)
    logs.append(
        f"<86>{ts} aws-instance sshd[9876]: Connection from {source} port 44123 technique={technique} tactic=Lateral_Movement status=INTERNAL_MOVEMENT user=compromised_user"
    )
    
    ts = generate_timestamp(base, 1)
    logs.append(
        f"<86>{ts} aws-instance-2 sshd[9877]: Accepted publickey for root from {source} port 44123 ssh2: RSA SHA256:suspicious_key technique={technique} status=LATERAL_SUCCESS"
    )
    
    return logs

def generate_data_exfiltration():
    """Data exfiltration to cloud storage"""
    technique, tactic = random.choice(ATTACK_TECHNIQUES["Exfiltration"])
    attacker = random.choice(ATTACKER_IPS)
    
    logs = []
    base = datetime.now() - timedelta(minutes=5)
    
    ts = generate_timestamp(base, 0)
    logs.append(
        f"<134>{ts} aws-instance s3-sync[4321]: Large data transfer detected technique={technique} tactic=Exfiltration destination=s3://attacker-bucket size=15GB files=10532 status=EXFILTRATING"
    )
    
    ts = generate_timestamp(base, 3)
    logs.append(
        f"<134>{ts} aws-instance s3-sync[4321]: Transfer complete to external bucket technique={technique} tactic=Exfiltration destination=s3://attacker-bucket status=DATA_STOLEN severity=CRITICAL"
    )
    
    return logs

def generate_defense_evasion():
    """Defense evasion - log deletion"""
    technique, tactic = random.choice(ATTACK_TECHNIQUES["Defense_Evasion"])
    
    logs = []
    base = datetime.now() - timedelta(minutes=2)
    
    ts = generate_timestamp(base, 0)
    logs.append(
        f"<131>{ts} aws-instance systemd[1]: CloudWatch agent stopped unexpectedly technique={technique} tactic=Defense_Evasion status=MONITORING_DISABLED"
    )
    
    ts = generate_timestamp(base, 1)
    logs.append(
        f"<131>{ts} aws-instance kernel: [audit] Log files deleted: /var/log/auth.log* technique={technique} tactic=Defense_Evasion count=15 status=EVIDENCE_DESTROYED severity=HIGH"
    )
    
    return logs

def generate_complete_attack_scenario():
    """Generate a complete multi-stage attack"""
    all_logs = []
    
    print("=" * 70)
    print("GENERATING MULTI-STAGE ATTACK SCENARIO")
    print("=" * 70)
    
    # Stage 1: Initial Access
    print("Stage 1: Initial Access (SSH Exploitation)")
    all_logs.extend(generate_ssh_exploit())
    
    # Stage 2: Execution
    print("Stage 2: Execution (Web Shell Upload)")
    all_logs.extend(generate_web_exploit())
    
    # Stage 3: Privilege Escalation
    print("Stage 3: Privilege Escalation (Kernel Exploit)")
    all_logs.extend(generate_privilege_escalation())
    
    # Stage 4: Container Escape
    print("Stage 4: Defense Evasion (Container Escape)")
    all_logs.extend(generate_container_escape())
    
    # Stage 5: Credential Access
    print("Stage 5: Credential Access (Database Breach)")
    all_logs.extend(generate_database_breach())
    
    # Stage 6: Lateral Movement
    print("Stage 6: Lateral Movement")
    all_logs.extend(generate_lateral_movement())
    
    # Stage 7: Defense Evasion
    print("Stage 7: Defense Evasion (Log Deletion)")
    all_logs.extend(generate_defense_evasion())
    
    # Stage 8: Exfiltration
    print("Stage 8: Exfiltration (Data Theft)")
    all_logs.extend(generate_data_exfiltration())
    
    print("=" * 70)
    print(f"Generated {len(all_logs)} attack log entries")
    print("=" * 70)
    
    return all_logs

if __name__ == "__main__":
    import os
    
    # Generate attack scenario
    logs = generate_complete_attack_scenario()
    
    # Save to file
    output_dir = "sample_data"
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "attack_scenario.log")
    
    with open(output_file, 'w') as f:
        f.write('\n'.join(logs))
    
    print(f"\n✅ Attack logs saved to: {output_file}")
    print(f"📊 Total size: {os.path.getsize(output_file)} bytes")
    print(f"\n💡 To test, update test_pipeline.py to use this file:")
    print(f"   LOG_FILE = '{output_file}'")