import re
import time
import requests
import feedparser
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300  # 5 minutes

def strip_html(html_str):
    """Strip HTML tags and clean up whitespace and entities."""
    # Replace line breaks or paragraph breaks with spaces
    html_str = re.sub(r'<br\s*/?>|</p>|</h3>|</li>', ' ', html_str)
    # Remove HTML tags
    clean = re.compile('<.*?>')
    text = re.compile(clean).sub('', html_str)
    # Decode basic HTML entities
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&amp;', '&')
    text = text.replace('&quot;', '"')
    text = text.replace('&#39;', "'")
    # Replace multiple whitespaces with a single space
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_release_notes(xml_content):
    """Parse the Atom XML feed into a structured JSON list."""
    feed = feedparser.parse(xml_content)
    parsed_entries = []

    for entry in feed.entries:
        title = entry.get('title', 'Unknown Date')
        link = entry.get('link', '')
        updated = entry.get('updated') or entry.get('published', '')
        
        content_list = entry.get('content')
        if not content_list:
            continue
            
        html = content_list[0].get('value', '')
        
        # Split by <h3> to find distinct updates within this release date
        parts = html.split('<h3>')
        intro = parts[0].strip()
        
        updates = []
        
        # If there are no <h3> headings, treat the entire block as one General Update
        if len(parts) == 1:
            clean_txt = strip_html(html)
            updates.append({
                "type": "Update",
                "html": html,
                "text": clean_txt
            })
        else:
            # Process each <h3> segment
            for part in parts[1:]:
                if '</h3>' in part:
                    update_type, update_content = part.split('</h3>', 1)
                    update_type = update_type.strip()
                    update_content = update_content.strip()
                    clean_txt = strip_html(update_content)
                    
                    updates.append({
                        "type": update_type,
                        "html": update_content,
                        "text": clean_txt
                    })
        
        parsed_entries.append({
            "title": title,
            "date": title,
            "iso_date": updated,
            "link": link,
            "intro": intro,
            "updates": updates
        })
        
    return {
        "title": feed.feed.get('title', 'BigQuery Release Notes'),
        "link": feed.feed.get('link', 'https://cloud.google.com/bigquery/docs/release-notes'),
        "entries": parsed_entries
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('force', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check if cache is valid
    if not force_refresh and cache["data"] and (current_time - cache["last_fetched"] < CACHE_DURATION):
        return jsonify({
            "success": True,
            "cached": True,
            "last_synced": int(cache["last_fetched"]),
            "data": cache["data"]
        })
        
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        parsed_data = parse_release_notes(response.content)
        
        # Update cache
        cache["data"] = parsed_data
        cache["last_fetched"] = current_time
        
        return jsonify({
            "success": True,
            "cached": False,
            "last_synced": int(current_time),
            "data": parsed_data
        })
    except Exception as e:
        # If fetch fails but we have cached data, return that with a warning
        if cache["data"]:
            return jsonify({
                "success": True,
                "cached": True,
                "warning": f"Could not fetch fresh data ({str(e)}). Returning cached version.",
                "last_synced": int(cache["last_fetched"]),
                "data": cache["data"]
            })
            
        return jsonify({
            "success": False,
            "error": f"Failed to fetch release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Run Flask server locally
    app.run(debug=True, host='127.0.0.1', port=5000)
