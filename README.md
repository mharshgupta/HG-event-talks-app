# BigQuery Release Radar ⚡

A premium, interactive web application built with Python Flask and plain vanilla HTML, CSS, and JavaScript that fetches Google Cloud's BigQuery release notes and provides an elegant dashboard to track, search, filter, and tweet updates.

## Key Features

- **Automated Feed Parsing**: Automatically fetches the official XML release notes feed and parses them.
- **Granular Updates**: Automatically splits release notes grouped by date into individual features, announcements, bug fixes, deprecations, and updates.
- **Smart Caching**: Implements a lightweight, in-memory backend cache (5-minute TTL) to minimize load times and avoid rate-limiting. Allows forcing a fresh sync via the UI.
- **Fast Filters & Full-text Search**: Instantly filter updates by category (Features, Announcements, Issues, Deprecations) and search through content descriptions and dates.
- **Custom Tweet Composer**:
  - Open a sleek modal to tweet any specific release note.
  - Automatically drafts a tweet containing the update type, date, truncated summary, and a link to the official docs.
  - Custom character counter complying with Twitter/X short-link shortening rules (treating URLs as exactly 23 characters).
  - Copies draft text or opens the tweet directly on X.
- **Highlight Sharing (WOW Factor)**: Highlight any text snippet inside a release note card to instantly show a floating "Tweet Selection" button, which populates the Tweet Composer with the selected text!

## Technology Stack

- **Backend**: Python 3.14+ & Flask
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom properties, CSS grid, Flexbox, blur filters, keyframe animations)
- **APIs & Feeds**: `requests` & `feedparser` for XML parsing, X/Twitter Web Intents API for sharing

## Getting Started

### 1. Prerequisites
Make sure you have Python 3.x installed.

### 2. Install Dependencies
Navigate to the project root and install the required packages:
```bash
pip install -r requirements.txt
```

### 3. Run the Server
Launch the Flask development server:
```bash
python app.py
```

The application will start running at:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

## Project Structure

- `app.py`: Main Flask application server handling caching, HTTP request fetching, and XML parsing.
- `requirements.txt`: Python package requirements.
- `templates/index.html`: Dashboard template containing layouts for headers, filters, the timeline feed, the modal composer, and search.
- `static/style.css`: Modern glassmorphic dark-theme design stylesheet with animations, badges, skeletons, and media queries for mobile-responsiveness.
- `static/app.js`: Client-side logic handling live search, filtering, Tweet generation, clipboard copy, X API intent redirect, and mouse text selections.
