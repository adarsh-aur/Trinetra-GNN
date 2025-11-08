#!/usr/bin/env python3
"""
Multi-Server Orchestrator for Full-Stack Application
Manages Flask Backend, Node Server, Vite Frontend, and GNN Demo API
"""

import subprocess
import sys
import os
import time
import signal
import psutil
from pathlib import Path
from threading import Thread
import platform

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Configuration
class Config:
    # Ports
    FLASK_PORT = 5000
    NODE_PORT = 3000
    VITE_PORT = 5173
    GNN_PORT = 5001  # Port for GNN demo API
    MASTER_PORT = 8080  # Master orchestrator port
    
    # Paths (relative to trigger.py location)
    BASE_DIR = Path(__file__).parent.resolve()
    FLASK_DIR = BASE_DIR / "backend"
    NODE_DIR = BASE_DIR / "server"
    VITE_DIR = BASE_DIR / "frontend" / "vite-project"
    GNN_DIR = BASE_DIR / "backend" / "demo_gnn"
    
    # Files
    FLASK_APP = FLASK_DIR / "app.py"
    GNN_DEMO = GNN_DIR / "demo_api.py"
    NODE_SCRIPT = NODE_DIR / "server.js"
    
    # Startup delays (seconds)
    FLASK_DELAY = 2
    NODE_DELAY = 3
    VITE_DELAY = 4
    GNN_DELAY = 2

# Global process list
processes = []

def print_banner():
    """Print startup banner"""
    banner = f"""
{Colors.OKCYAN}{'='*60}
   _____ _____ ______ _   _   _____ _______ 
  / ____|  __ \|  ____| \ | | / ____|__   __|
 | (___ | |__) | |__  |  \| || (___    | |   
  \___ \|  ___/|  __| | . ` | \___ \   | |   
  ____) | |    | |____| |\  | ____) |  | |   
 |_____/|_|    |______|_| \_||_____/   |_|   
                                              
    Multi-Server Orchestrator v1.0
    Quantum Violet Edition
{'='*60}{Colors.ENDC}
"""
    print(banner)

def log(message, level="INFO"):
    """Formatted logging"""
    colors = {
        "INFO": Colors.OKBLUE,
        "SUCCESS": Colors.OKGREEN,
        "WARNING": Colors.WARNING,
        "ERROR": Colors.FAIL,
        "HEADER": Colors.HEADER
    }
    color = colors.get(level, Colors.ENDC)
    timestamp = time.strftime("%H:%M:%S")
    print(f"{color}[{timestamp}] [{level}] {message}{Colors.ENDC}")

def check_port_available(port):
    """Check if a port is available"""
    for conn in psutil.net_connections():
        if conn.laddr.port == port and conn.status == 'LISTEN':
            return False
    return True

def kill_process_on_port(port):
    """Kill any process running on the specified port"""
    try:
        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == 'LISTEN':
                try:
                    process = psutil.Process(conn.pid)
                    log(f"Killing process {conn.pid} on port {port}", "WARNING")
                    process.terminate()
                    process.wait(timeout=3)
                except (psutil.NoSuchProcess, psutil.TimeoutExpired):
                    pass
        time.sleep(1)
    except Exception as e:
        log(f"Error killing process on port {port}: {e}", "ERROR")

def check_dependencies():
    """Check if all required dependencies are installed"""
    log("Checking dependencies...", "HEADER")
    
    # Check Python
    version = sys.version.split()[0]
    log(f"✓ Python {version} found", "SUCCESS")
    
    # Check Node.js
    try:
        result = subprocess.run("node --version", 
                              capture_output=True, 
                              text=True, 
                              timeout=5,
                              shell=True)
        if result.returncode == 0:
            version = result.stdout.strip()
            log(f"✓ Node.js {version} found", "SUCCESS")
        else:
            log("✗ Node.js not found", "ERROR")
            log("Please install Node.js from https://nodejs.org/", "ERROR")
            return False
    except Exception as e:
        log("✗ Node.js not found", "ERROR")
        log("Please install Node.js from https://nodejs.org/", "ERROR")
        return False
    
    # Check npm with shell=True (critical for Windows)
    try:
        result = subprocess.run("npm --version", 
                              capture_output=True, 
                              text=True, 
                              timeout=5,
                              shell=True)  # This is the key for Windows
        if result.returncode == 0:
            version = result.stdout.strip()
            log(f"✓ npm {version} found", "SUCCESS")
            return True
        else:
            log("✗ npm not found", "ERROR")
            log("Please reinstall Node.js from https://nodejs.org/", "ERROR")
            return False
    except Exception as e:
        log(f"✗ npm check failed: {e}", "ERROR")
        log("Please reinstall Node.js from https://nodejs.org/", "ERROR")
        return False

def check_directories():
    """Check if all required directories exist"""
    log("Checking project structure...", "HEADER")
    
    directories = {
        "Flask Backend": Config.FLASK_DIR,
        "Node Server": Config.NODE_DIR,
        "Vite Frontend": Config.VITE_DIR
    }
    
    missing = []
    for name, path in directories.items():
        if path.exists():
            log(f"✓ {name} directory found", "SUCCESS")
        else:
            log(f"✗ {name} directory not found: {path}", "ERROR")
            missing.append(name)
    
    if missing:
        log("Please ensure all directories exist", "ERROR")
        return False
    
    return True

def install_npm_dependencies():
    """Install npm dependencies for Node and Vite if needed"""
    dirs_to_check = [
        (Config.NODE_DIR, "Node Server"),
        (Config.VITE_DIR, "Vite Frontend")
    ]
    
    for directory, name in dirs_to_check:
        node_modules = directory / "node_modules"
        if not node_modules.exists():
            log(f"Installing {name} dependencies...", "WARNING")
            try:
                # Use shell=True for better compatibility
                result = subprocess.run(
                    "npm install",
                    cwd=directory,
                    check=True,
                    capture_output=True,
                    shell=True,
                    timeout=300  # 5 minutes timeout
                )
                log(f"✓ {name} dependencies installed", "SUCCESS")
            except subprocess.CalledProcessError as e:
                log(f"✗ Failed to install {name} dependencies", "ERROR")
                error_msg = e.stderr.decode() if e.stderr else str(e)
                log(f"Error: {error_msg}", "ERROR")
                return False
            except subprocess.TimeoutExpired:
                log(f"✗ Installation timeout for {name}", "ERROR")
                return False
    return True

def start_flask_backend():
    """Start Flask backend server"""
    log(f"Starting Flask Backend on port {Config.FLASK_PORT}...", "HEADER")
    
    if not Config.FLASK_APP.exists():
        log(f"Flask app not found: {Config.FLASK_APP}", "ERROR")
        return None
    
    kill_process_on_port(Config.FLASK_PORT)
    
    try:
        env = os.environ.copy()
        env['FLASK_APP'] = str(Config.FLASK_APP)
        env['FLASK_ENV'] = 'development'
        env['FLASK_DEBUG'] = '1'
        env['PYTHONIOENCODING'] = 'utf-8'  # Fix Unicode encoding issues
        
        process = subprocess.Popen(
            [sys.executable, str(Config.FLASK_APP)],
            cwd=Config.FLASK_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            encoding='utf-8',  # Explicitly set UTF-8 encoding
            errors='replace'   # Replace problematic characters
        )
        
        processes.append(('Flask Backend', process))
        log(f"✓ Flask Backend started (PID: {process.pid})", "SUCCESS")
        
        # Monitor output in a separate thread
        def monitor_output():
            try:
                for line in process.stdout:
                    if line.strip():
                        print(f"{Colors.OKBLUE}[Flask] {line.strip()}{Colors.ENDC}")
            except UnicodeDecodeError:
                pass  # Ignore unicode errors in output
        
        Thread(target=monitor_output, daemon=True).start()
        return process
        
    except Exception as e:
        log(f"Failed to start Flask Backend: {e}", "ERROR")
        return None

def start_gnn_demo():
    """Start GNN Demo API"""
    log(f"Starting GNN Demo API on port {Config.GNN_PORT}...", "HEADER")
    
    if not Config.GNN_DEMO.exists():
        log(f"GNN Demo script not found: {Config.GNN_DEMO}", "ERROR")
        return None
    
    kill_process_on_port(Config.GNN_PORT)
    
    try:
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'  # Fix Unicode encoding issues
        
        process = subprocess.Popen(
            [sys.executable, str(Config.GNN_DEMO)],
            cwd=Config.FLASK_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            encoding='utf-8',  # Explicitly set UTF-8 encoding
            errors='replace'   # Replace problematic characters
        )
        
        processes.append(('GNN Demo API', process))
        log(f"✓ GNN Demo API started (PID: {process.pid})", "SUCCESS")
        
        # Monitor output in a separate thread
        def monitor_output():
            try:
                for line in process.stdout:
                    if line.strip():
                        print(f"{Colors.OKCYAN}[GNN] {line.strip()}{Colors.ENDC}")
            except UnicodeDecodeError:
                pass  # Ignore unicode errors in output
        
        Thread(target=monitor_output, daemon=True).start()
        return process
        
    except Exception as e:
        log(f"Failed to start GNN Demo API: {e}", "ERROR")
        return None

def start_node_server():
    """Start Node.js server"""
    log(f"Starting Node Server on port {Config.NODE_PORT}...", "HEADER")
    
    kill_process_on_port(Config.NODE_PORT)
    
    try:
        # Use shell=True for better compatibility
        process = subprocess.Popen(
            "npm run dev",
            cwd=Config.NODE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            shell=True,
            encoding='utf-8',
            errors='replace'
        )
        
        processes.append(('Node Server', process))
        log(f"✓ Node Server started (PID: {process.pid})", "SUCCESS")
        
        # Monitor output in a separate thread
        def monitor_output():
            try:
                for line in process.stdout:
                    if line.strip():
                        print(f"{Colors.OKGREEN}[Node] {line.strip()}{Colors.ENDC}")
            except UnicodeDecodeError:
                pass
        
        Thread(target=monitor_output, daemon=True).start()
        return process
        
    except Exception as e:
        log(f"Failed to start Node Server: {e}", "ERROR")
        return None

def start_vite_frontend():
    """Start Vite development server"""
    log(f"Starting Vite Frontend on port {Config.VITE_PORT}...", "HEADER")
    
    kill_process_on_port(Config.VITE_PORT)
    
    try:
        # Use shell=True for better compatibility
        process = subprocess.Popen(
            "npm run dev",
            cwd=Config.VITE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            shell=True,
            encoding='utf-8',
            errors='replace'
        )
        
        processes.append(('Vite Frontend', process))
        log(f"✓ Vite Frontend started (PID: {process.pid})", "SUCCESS")
        
        # Monitor output in a separate thread
        def monitor_output():
            try:
                for line in process.stdout:
                    if line.strip():
                        print(f"{Colors.WARNING}[Vite] {line.strip()}{Colors.ENDC}")
            except UnicodeDecodeError:
                pass
        
        Thread(target=monitor_output, daemon=True).start()
        return process
        
    except Exception as e:
        log(f"Failed to start Vite Frontend: {e}", "ERROR")
        return None

def health_check():
    """Perform health checks on all services"""
    log("Performing health checks...", "HEADER")
    time.sleep(5)  # Wait for services to fully start
    
    services = {
        "Flask Backend": f"http://localhost:{Config.FLASK_PORT}",
        "Node Server": f"http://localhost:{Config.NODE_PORT}",
        "Vite Frontend": f"http://localhost:{Config.VITE_PORT}",
        "GNN Demo API": f"http://localhost:{Config.GNN_PORT}"
    }
    
    try:
        import requests
        for name, url in services.items():
            try:
                response = requests.get(url, timeout=2)
                log(f"✓ {name} is responding", "SUCCESS")
            except:
                log(f"⚠ {name} may not be ready yet", "WARNING")
    except ImportError:
        log("Install 'requests' for health checks: pip install requests", "WARNING")

def cleanup():
    """Cleanup and terminate all processes"""
    log("\nShutting down all servers...", "HEADER")
    
    for name, process in processes:
        try:
            log(f"Stopping {name} (PID: {process.pid})...", "WARNING")
            process.terminate()
            try:
                process.wait(timeout=5)
                log(f"✓ {name} stopped gracefully", "SUCCESS")
            except subprocess.TimeoutExpired:
                log(f"Force killing {name}...", "ERROR")
                process.kill()
                process.wait()
        except Exception as e:
            log(f"Error stopping {name}: {e}", "ERROR")
    
    log("All servers stopped", "SUCCESS")

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print()  # New line after ^C
    cleanup()
    sys.exit(0)

def print_status():
    """Print status of all services"""
    status_banner = f"""
{Colors.HEADER}{'='*60}
                    🚀 ALL SYSTEMS ONLINE 🚀
{'='*60}{Colors.ENDC}

{Colors.OKGREEN}Service Status:{Colors.ENDC}
  • Flask Backend:  http://localhost:{Config.FLASK_PORT}
  • Node Server:    http://localhost:{Config.NODE_PORT}
  • Vite Frontend:  http://localhost:{Config.VITE_PORT}
  • GNN Demo API:   http://localhost:{Config.GNN_PORT}

{Colors.OKCYAN}Quick Links:{Colors.ENDC}
  • Frontend:       http://localhost:{Config.VITE_PORT}
  • API Docs:       http://localhost:{Config.FLASK_PORT}/api/docs

{Colors.WARNING}Press Ctrl+C to stop all servers{Colors.ENDC}
{Colors.HEADER}{'='*60}{Colors.ENDC}
"""
    print(status_banner)

def main():
    """Main orchestrator function"""
    # Setup signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    # Print banner
    print_banner()
    
    # Pre-flight checks
    if not check_dependencies():
        sys.exit(1)
    
    if not check_directories():
        sys.exit(1)
    
    # Install npm dependencies if needed
    log("Checking npm dependencies...", "HEADER")
    if not install_npm_dependencies():
        sys.exit(1)
    
    # Start all services with delays
    log("\nStarting all services...", "HEADER")
    
    # 1. Start Flask Backend
    if not start_flask_backend():
        cleanup()
        sys.exit(1)
    time.sleep(Config.FLASK_DELAY)
    
    # 2. Start GNN Demo API
    if not start_gnn_demo():
        cleanup()
        sys.exit(1)
    time.sleep(Config.GNN_DELAY)
    
    # 3. Start Node Server
    if not start_node_server():
        cleanup()
        sys.exit(1)
    time.sleep(Config.NODE_DELAY)
    
    # 4. Start Vite Frontend
    if not start_vite_frontend():
        cleanup()
        sys.exit(1)
    time.sleep(Config.VITE_DELAY)
    
    # Health checks
    health_check()
    
    # Print status
    print_status()
    
    # Keep the script running
    try:
        while True:
            time.sleep(1)
            # Check if any process has died
            for name, process in processes:
                if process.poll() is not None:
                    log(f"{name} has stopped unexpectedly!", "ERROR")
                    cleanup()
                    sys.exit(1)
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()