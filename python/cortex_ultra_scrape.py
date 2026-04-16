import os
import subprocess
import time
import asyncio
from scrapling.fetchers import DynamicFetcher

def get_lightpanda_cdp():
    """Starts Lightpanda in CDP mode and returns the endpoint."""
    binary = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bin", "lightpanda")
    if not os.path.exists(binary):
        raise FileNotFoundError(f"Lightpanda binary not found at {binary}")
    
    # Start Lightpanda serve in background
    proc = subprocess.Popen(
        [binary, "serve", "--port", "9222"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Give it a second to start
    time.sleep(1.5)
    return "ws://127.0.0.1:9222", proc

def ultra_scrape(url):
    """Scrapes a URL using Scrapling + Lightpanda (CDP)."""
    endpoint, proc = get_lightpanda_cdp()
    try:
        page = DynamicFetcher.fetch(url, cdp_url=endpoint)
        return page
    finally:
        proc.terminate()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        url = sys.argv[1]
        print(f"Scraping {url} with Lightpanda + Scrapling...")
        result = ultra_scrape(url)
        print(f"Status: {result.status}")
        print(result.text[:500])
