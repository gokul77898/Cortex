#!/usr/bin/env python3
"""
Scrapling Web Scraper Service for CORTEX Legal Hub.
Supports: simple HTTP, stealth (Cloudflare bypass), dynamic (full browser).
Usage: echo '{"url":"...","mode":"stealth"}' | python3 scraper_service.py
"""

import sys
import json
import asyncio
import traceback
from urllib.parse import urlparse

try:
    from scrapling.fetchers import Fetcher, StealthyFetcher, DynamicFetcher
    from scrapling.fetchers import FetcherSession, StealthySession, DynamicSession
    HAVE_SCRAPLING = True
except ImportError:
    HAVE_SCRAPLING = False


async def fetch_simple(url: str, options: dict) -> dict:
    """Simple HTTP fetch with stealthy headers."""
    try:
        page = Fetcher.get(url, stealthy_headers=True, timeout=options.get('timeout', 30))
        result = _extract_content(page, options)
        result['url'] = str(page.url) if hasattr(page, 'url') else url
        result['status'] = page.status_code if hasattr(page, 'status_code') else 200
        return result
    except Exception as e:
        return {'error': str(e), 'url': url, 'status': 0}


async def fetch_stealth(url: str, options: dict) -> dict:
    """Stealth fetch with Cloudflare bypass."""
    try:
        async with StealthySession(
            headless=True,
            solve_cloudflare=True,
            timeout=options.get('timeout', 60),
        ) as session:
            page = await session.fetch(url, google_search=options.get('google_search', True))
            result = _extract_content(page, options)
            result['url'] = str(session.last_url) if hasattr(session, 'last_url') else url
            result['status'] = 200
            return result
    except Exception as e:
        return {'error': str(e), 'url': url, 'status': 0}


async def fetch_dynamic(url: str, options: dict) -> dict:
    """Full browser automation."""
    try:
        async with DynamicSession(
            headless=True,
            disable_resources=options.get('disable_resources', True),
            network_idle=options.get('network_idle', True),
            timeout=options.get('timeout', 60),
        ) as session:
            page = await session.fetch(url, load_dom=options.get('load_dom', True))
            result = _extract_content(page, options)
            result['url'] = url
            result['status'] = 200
            return result
    except Exception as e:
        return {'error': str(e), 'url': url, 'status': 0}


def _extract_content(page, options: dict) -> dict:
    """Extract content from a Scrapling page based on options."""
    selector = options.get('selector', '')
    extract_type = options.get('extract', 'text')
    attribute = options.get('attribute', 'href')
    max_chars = options.get('max_chars', 100000)

    result = {
        'title': '',
        'text': '',
        'links': [],
        'metadata': {},
    }

    # Extract title
    try:
        title_el = page.css('title')
        if title_el:
            result['title'] = title_el[0].text_content() if hasattr(title_el[0], 'text_content') else str(title_el[0])
    except:
        pass

    # Remove script/style elements
    try:
        for el in page.css('script, style, nav, footer, header, .ad, .sidebar'):
            try:
                el.drop()
            except:
                pass
    except:
        pass

    # Extract based on selector
    if selector:
        try:
            elements = page.css(selector)
            if not elements:
                elements = page.xpath(selector)
        except:
            try:
                elements = page.xpath(selector)
            except:
                elements = page.css('body')
    else:
        elements = page.css('body')

    if not elements:
        elements = []

    if extract_type == 'text':
        texts = []
        for el in elements[:10]:  # Limit to 10 elements
            try:
                t = el.text_content() if hasattr(el, 'text_content') else str(el)
                if t.strip():
                    texts.append(t.strip())
            except:
                pass
        result['text'] = '\n\n'.join(texts)[:max_chars]

    elif extract_type == 'html':
        result['html'] = ''.join(str(el) for el in elements[:5])[:max_chars]

    elif extract_type == 'attr':
        result['attributes'] = [
            el.attrib.get(attribute, '') for el in elements[:100]
            if hasattr(el, 'attrib')
        ]

    elif extract_type == 'all':
        # Fallback to main content areas
        main = page.css('main, article, .content, #content, .post, .entry')
        if main:
            text = '\n\n'.join(
                el.text_content().strip() for el in main[:5]
                if el.text_content().strip()
            )
        else:
            text = page.css('body')[0].text_content().strip()[:max_chars] if page.css('body') else ''
        result['text'] = text[:max_chars]

    # Extract links
    try:
        all_links = page.css('a[href]')
        result['links'] = [
            {'text': el.text_content().strip()[:100] if hasattr(el, 'text_content') else '', 'href': el.attrib.get('href', '')}
            for el in all_links[:50]
            if hasattr(el, 'attrib') and el.attrib.get('href', '').strip()
        ]
    except:
        pass

    return result


async def handle_request(request: dict) -> dict:
    """Handle a single scraping request."""
    url = request.get('url', '')
    mode = request.get('mode', 'simple')
    options = request.get('options', {})

    if not url:
        return {'success': False, 'error': 'No URL provided'}

    # Validate URL
    parsed = urlparse(url)
    if not parsed.scheme:
        url = 'https://' + url
    elif parsed.scheme not in ('http', 'https'):
        return {'success': False, 'error': f'Invalid scheme: {parsed.scheme}'}

    try:
        if mode == 'stealth':
            data = await fetch_stealth(url, options)
        elif mode == 'dynamic':
            data = await fetch_dynamic(url, options)
        else:
            data = await fetch_simple(url, options)

        if 'error' in data:
            return {'success': False, 'error': data['error'], 'data': data}
        return {'success': True, 'data': data}
    except Exception as e:
        return {'success': False, 'error': str(e), 'traceback': traceback.format_exc()}


async def main():
    """Read JSON from stdin, process, output JSON to stdout."""
    if not HAVE_SCRAPLING:
        print(json.dumps({
            'success': False,
            'error': 'Scrapling not installed. Run: pip install scrapling'
        }))
        return

    raw = sys.stdin.read().strip()
    if not raw:
        print(json.dumps({'success': False, 'error': 'No input received'}))
        return

    try:
        request = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({'success': False, 'error': f'Invalid JSON: {e}'}))
        return

    # Handle status action
    if isinstance(request, dict) and request.get('action') == 'status':
        print(json.dumps({
            'available': HAVE_SCRAPLING,
            'version': __import__('scrapling').__version__ if HAVE_SCRAPLING else None,
        }))
        return

    # Handle batch requests
    if isinstance(request, list):
        results = []
        for req in request:
            result = await handle_request(req)
            results.append(result)
        print(json.dumps({'success': True, 'batch': results}))
    else:
        result = await handle_request(request)
        print(json.dumps(result))


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--status':
        print(json.dumps({
            'available': HAVE_SCRAPLING,
            'version': __import__('scrapling').__version__ if HAVE_SCRAPLING else None,
        }))
    else:
        asyncio.run(main())
