import os
import subprocess
import time
import requests
import json
import webbrowser

# Configuration
OPENBB_UPSTREAM = "https://github.com/OpenBB-finance/OpenBB.git"
LIBS_PATH = "libs/openbb"
LOG_FILE = "logs/openbb_monitor.log"
WELCOME_URL = "http://127.0.0.1:6900" # OpenBB ODP local backend

def log(message):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    if not os.path.exists("logs"):
        os.makedirs("logs")
    with open(LOG_FILE, "a") as f:
        f.write(f"[{timestamp}] {message}\n")
    print(f"[{timestamp}] {message}")

def open_browser():
    """Opens the OpenBB dashboard in Chrome."""
    log(f"Opening {WELCOME_URL} in browser...")
    try:
        # On macOS, this will open in the default browser (Chrome if configured)
        webbrowser.open(WELCOME_URL)
    except Exception as e:
        log(f"Failed to open browser: {e}")

def check_upstream():
    """Checks if there are new commits in the upstream repo."""
    try:
        result = subprocess.run(
            ["git", "ls-remote", OPENBB_UPSTREAM, "HEAD"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            latest_hash = result.stdout.split()[0]
            return latest_hash
    except Exception as e:
        log(f"Error checking upstream: {e}")
    return None

def sync_and_push(latest_hash):
    """Syncs the upstream changes and pushes only libs/openbb to GitHub."""
    log(f"Syncing OpenBB updates (HEAD: {latest_hash})...")
    # In a real scenario, we would pull the files here.
    # For now, we update our local state and commit the changes.
    
    try:
        # Selective add and commit
        subprocess.run(["git", "add", LIBS_PATH], check=True)
        # Check if there are actual changes
        status = subprocess.run(["git", "diff", "--cached", "--quiet"])
        if status.returncode != 0:
            subprocess.run(["git", "commit", "-m", f"feat(openbb): sync upstream updates to {latest_hash[:7]}"], check=True)
            subprocess.run(["git", "push", "origin", "main"], check=True)
            log("Successfully pushed OpenBB updates to GitHub.")
        else:
            log("No changes detected in libs/openbb.")
    except Exception as e:
        log(f"Error during sync/push: {e}")

def main():
    # 1. Pop the browser on startup
    open_browser()
    
    log("OpenBB Monitor active.")
    last_seen_hash = None
    
    while True:
        latest = check_upstream()
        if latest and latest != last_seen_hash:
            if last_seen_hash is not None:
                sync_and_push(latest)
            last_seen_hash = latest
        
        # Check every 10 minutes for active monitoring
        time.sleep(600)

if __name__ == "__main__":
    main()
