/**
 * BigQuery Release Radar client application
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseData = null;
    let filteredEntries = [];
    let currentTweetData = {
        date: '',
        link: '',
        text: '',
        type: ''
    };

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const syncStatus = document.getElementById('sync-status');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const typeFilter = document.getElementById('type-filter');
    const resultsCount = document.getElementById('results-count');
    const themeToggle = document.getElementById('theme-toggle');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    
    const skeletonLoader = document.getElementById('skeleton-loader');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const feedTimeline = document.getElementById('feed-timeline');
    const emptyState = document.getElementById('empty-state');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    // Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountEl = document.getElementById('char-count');
    const modalCopyBtn = document.getElementById('modal-copy-btn');
    const modalTweetBtn = document.getElementById('modal-tweet-btn');
    
    // Floating Tweet Button
    const floatingTweetBtn = document.getElementById('floating-tweet-btn');

    // ----------------------------------------------------
    // API Fetch & Feed Loading
    // ----------------------------------------------------

    async function fetchReleaseNotes(force = false) {
        setLoadingState(true);
        errorContainer.style.style = 'none';
        errorContainer.style.display = 'none';
        
        try {
            const url = `/api/release-notes${force ? '?force=true' : ''}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                releaseData = result.data;
                updateSyncStatus(result.last_synced, result.cached);
                
                if (result.warning) {
                    console.warn(result.warning);
                }
                
                // Process and render data
                applyFiltersAndRender();
            } else {
                throw new Error(result.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            errorMessage.textContent = error.message || 'Unable to connect to the backend server.';
            errorContainer.style.display = 'block';
            feedTimeline.style.display = 'none';
            emptyState.style.display = 'none';
            resultsCount.textContent = 'Error loading feed';
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
            skeletonLoader.style.display = 'flex';
            feedTimeline.style.display = 'none';
            emptyState.style.display = 'none';
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
            skeletonLoader.style.display = 'none';
        }
    }

    function updateSyncStatus(timestamp, isCached) {
        if (!timestamp) {
            syncStatus.textContent = 'Offline';
            return;
        }
        
        const dateObj = new Date(timestamp * 1000);
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0');
        const formattedTime = `${hours}:${minutes}:${seconds}`;
        
        syncStatus.textContent = `${isCached ? 'Cached' : 'Synced'} @ ${formattedTime}`;
    }

    // ----------------------------------------------------
    // Search, Filter & Render Logic
    // ----------------------------------------------------

    function applyFiltersAndRender() {
        if (!releaseData || !releaseData.entries) return;
        
        const searchQuery = searchInput.value.toLowerCase().trim();
        const selectedType = typeFilter.value;
        
        let totalMatchedUpdates = 0;
        const processedEntries = [];

        releaseData.entries.forEach(entry => {
            // Filter the updates array inside this entry
            const matchedUpdates = entry.updates.filter(update => {
                // 1. Filter by category type
                const matchesType = (selectedType === 'ALL') || (update.type.toLowerCase() === selectedType.toLowerCase());
                
                // 2. Filter by search text (checks category type, plain text description, and entry date)
                const matchesSearch = !searchQuery || 
                                     update.type.toLowerCase().includes(searchQuery) ||
                                     update.text.toLowerCase().includes(searchQuery) ||
                                     entry.date.toLowerCase().includes(searchQuery);
                                     
                return matchesType && matchesSearch;
            });

            if (matchedUpdates.length > 0) {
                totalMatchedUpdates += matchedUpdates.length;
                processedEntries.push({
                    ...entry,
                    updates: matchedUpdates
                });
            }
        });

        // Update results counter badge
        resultsCount.textContent = `${totalMatchedUpdates} update${totalMatchedUpdates !== 1 ? 's' : ''} found`;

        filteredEntries = processedEntries; // Save to state for CSV export

        // Render feed
        renderFeed(processedEntries);
    }

    function renderFeed(entries) {
        if (entries.length === 0) {
            feedTimeline.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        feedTimeline.innerHTML = '';
        feedTimeline.style.display = 'flex';

        entries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'release-card';
            
            // Build the date header
            const header = document.createElement('div');
            header.className = 'release-date-header';
            header.innerHTML = `
                <span>📅 ${entry.date}</span>
                <a href="${entry.link}" target="_blank" rel="noopener" title="Open official release notes page">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            `;
            card.appendChild(header);

            // Build list of updates
            const list = document.createElement('div');
            list.className = 'release-updates-list';

            entry.updates.forEach(update => {
                const updateItem = document.createElement('article');
                updateItem.className = 'update-item';
                
                // Get badge modifier class based on category type
                let badgeClass = 'badge-update';
                const typeLower = update.type.toLowerCase();
                if (typeLower.includes('feature')) badgeClass = 'badge-feature';
                else if (typeLower.includes('announcement')) badgeClass = 'badge-announcement';
                else if (typeLower.includes('issue') || typeLower.includes('fix')) badgeClass = 'badge-issue';
                else if (typeLower.includes('deprecation')) badgeClass = 'badge-deprecation';

                updateItem.innerHTML = `
                    <div class="update-meta">
                        <span class="badge ${badgeClass}">${update.type}</span>
                        <div class="item-actions">
                            <button class="btn-icon-copy copy-trigger" title="Copy update to clipboard">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                            <button class="btn-icon-tweet tweet-trigger" title="Tweet this update">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="update-description">
                        ${update.html}
                    </div>
                `;

                // Add event listener to Copy button
                updateItem.querySelector('.copy-trigger').addEventListener('click', (e) => {
                    const copyBtn = e.currentTarget;
                    navigator.clipboard.writeText(update.text).then(() => {
                        const originalHTML = copyBtn.innerHTML;
                        copyBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        `;
                        copyBtn.classList.add('copied-success');
                        setTimeout(() => {
                            copyBtn.innerHTML = originalHTML;
                            copyBtn.classList.remove('copied-success');
                        }, 1500);
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
                });

                // Add event listener to the specific Tweet button
                updateItem.querySelector('.tweet-trigger').addEventListener('click', () => {
                    openTweetComposer(entry.date, entry.link, update.text, update.type);
                });

                list.appendChild(updateItem);
            });

            card.appendChild(list);
            feedTimeline.appendChild(card);
        });
    }

    // ----------------------------------------------------
    // Tweet Composer & Modal Handlers
    // ----------------------------------------------------

    function openTweetComposer(date, link, text, type) {
        currentTweetData = { date, link, text, type };
        
        // Assemble initial tweet text
        // Twitter/X shortens all links to t.co which consumes exactly 23 characters.
        // We will construct a clean, informative tweet.
        const header = `BigQuery Release (${date}) 📢\n\n`;
        const categoryPrefix = `${type}: `;
        const footer = `\n\nDetails: ${link}`;
        
        // Let's determine how many characters we have for the main text
        // Max 280 characters
        // Fixed parts: header (varies), categoryPrefix (varies), footer (link counts as 23, text counts as literal)
        const headerLen = header.length;
        const prefixLen = categoryPrefix.length;
        const linkLen = 23; // Twitter short link length
        const footerLabelLen = 10; // "\n\nDetails: "
        
        const reservedLen = headerLen + prefixLen + footerLabelLen + linkLen;
        const availableTextLen = 280 - reservedLen;
        
        let processedText = text;
        if (text.length > availableTextLen) {
            // Truncate text nicely to fit
            processedText = text.substring(0, availableTextLen - 3).trim() + '...';
        }
        
        const tweetText = `${header}${categoryPrefix}${processedText}${footer}`;
        
        // Populate and show modal
        tweetTextarea.value = tweetText;
        updateCharCount();
        
        tweetModal.classList.add('active');
        tweetModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Lock body scroll
        
        // Focus composer
        setTimeout(() => {
            tweetTextarea.focus();
            tweetTextarea.setSelectionRange(tweetTextarea.value.length, tweetTextarea.value.length);
        }, 100);
    }

    function closeTweetComposer() {
        tweetModal.classList.remove('active');
        tweetModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // Restore scroll
    }

    function calculateTweetLength(text) {
        // Twitter/X counts any URL as exactly 23 characters.
        // Let's find URLs in the text
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlRegex) || [];
        
        let textWithoutUrls = text;
        urls.forEach(url => {
            textWithoutUrls = textWithoutUrls.replace(url, '');
        });
        
        // Base text length + 23 characters for each URL
        return textWithoutUrls.length + (urls.length * 23);
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const count = calculateTweetLength(text);
        
        charCountEl.textContent = count;
        
        // Color coding
        const counterContainer = charCountEl.parentElement;
        counterContainer.classList.remove('warn', 'error');
        
        if (count > 280) {
            counterContainer.classList.add('error');
            modalTweetBtn.disabled = true;
        } else if (count > 250) {
            counterContainer.classList.add('warn');
            modalTweetBtn.disabled = false;
        } else {
            modalTweetBtn.disabled = false;
        }
    }

    function copyTweetText() {
        const text = tweetTextarea.value;
        navigator.clipboard.writeText(text).then(() => {
            // Visual success feedback
            const originalHTML = modalCopyBtn.innerHTML;
            modalCopyBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Copied!</span>
            `;
            modalCopyBtn.classList.add('copied-success');
            
            setTimeout(() => {
                modalCopyBtn.innerHTML = originalHTML;
                modalCopyBtn.classList.remove('copied-success');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Could not copy text automatically. Please select it and copy manually.');
        });
    }

    function publishTweet() {
        const text = tweetTextarea.value;
        const count = calculateTweetLength(text);
        
        if (count > 280) {
            alert('Tweet text is too long! Please shorten it before posting.');
            return;
        }
        
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        closeTweetComposer();
    }

    // ----------------------------------------------------
    // Text Selection Event for Highlight Sharing (WOW Factor)
    // ----------------------------------------------------

    let selectedText = '';
    let selectedUpdateItem = null;

    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', handleSelectionChange);

    function handleSelectionChange() {
        // If selection is empty, hide the button
        const selection = window.getSelection();
        if (selection.isCollapsed) {
            floatingTweetBtn.classList.remove('active');
            floatingTweetBtn.style.display = 'none';
        }
    }

    function handleTextSelection(e) {
        // Avoid triggers if clicking on floating button or inside the modal
        if (floatingTweetBtn.contains(e.target) || tweetModal.contains(e.target)) {
            return;
        }

        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (!text) {
            floatingTweetBtn.classList.remove('active');
            floatingTweetBtn.style.display = 'none';
            return;
        }

        // Check if the selection is inside an update-description element
        let node = selection.anchorNode;
        let isInsideDescription = false;
        let updateCard = null;
        
        while (node && node !== document.body) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.classList.contains('update-description')) {
                    isInsideDescription = true;
                    // Find the parent update-item
                    updateCard = node.closest('.update-item');
                    break;
                }
            }
            node = node.parentNode;
        }

        if (isInsideDescription && updateCard) {
            selectedText = text;
            
            // Find parent release card to get the release date and link
            const releaseCard = updateCard.closest('.release-card');
            const dateText = releaseCard.querySelector('.release-date-header span').textContent.replace('📅', '').trim();
            const linkHref = releaseCard.querySelector('.release-date-header a').getAttribute('href');
            
            // Extract type
            const typeBadge = updateCard.querySelector('.badge');
            const typeText = typeBadge ? typeBadge.textContent : 'Update';

            selectedUpdateItem = {
                date: dateText,
                link: linkHref,
                text: selectedText,
                type: typeText
            };

            // Position the floating button above the selection coordinates
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Calculate position
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            const btnWidth = 130; // Approx width of button
            const left = rect.left + rect.width / 2 - btnWidth / 2 + scrollLeft;
            const top = rect.top + scrollTop - 8; // 8px spacing above

            floatingTweetBtn.style.left = `${left}px`;
            floatingTweetBtn.style.top = `${top}px`;
            floatingTweetBtn.style.display = 'flex';
            
            // Trigger animation frame to ensure display: flex is registered
            requestAnimationFrame(() => {
                floatingTweetBtn.classList.add('active');
            });
        } else {
            floatingTweetBtn.classList.remove('active');
            floatingTweetBtn.style.display = 'none';
        }
    }

    // Floating button click handler
    floatingTweetBtn.addEventListener('click', () => {
        if (selectedUpdateItem) {
            openTweetComposer(
                selectedUpdateItem.date,
                selectedUpdateItem.link,
                `"${selectedUpdateItem.text}"`,
                selectedUpdateItem.type
            );
            // Clear selection
            window.getSelection().removeAllRanges();
            floatingTweetBtn.classList.remove('active');
            floatingTweetBtn.style.display = 'none';
        }
    });

    // ----------------------------------------------------
    // Event Listeners Registration
    // ----------------------------------------------------

    // Refresh action
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Filter controls
    typeFilter.addEventListener('change', applyFiltersAndRender);
    
    // Search Box Inputs
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim().length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        applyFiltersAndRender();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        applyFiltersAndRender();
    });
    
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        typeFilter.value = 'ALL';
        applyFiltersAndRender();
    });

    // Modal Actions
    closeModalBtn.addEventListener('click', closeTweetComposer);
    
    // Close modal on clicking backdrop overlay
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetComposer();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetComposer();
        }
    });
    
    tweetTextarea.addEventListener('input', updateCharCount);
    modalCopyBtn.addEventListener('click', copyTweetText);
    modalTweetBtn.addEventListener('click', publishTweet);

    // Theme toggle handling
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.checked = true;
    } else {
        document.body.classList.remove('light-theme');
        themeToggle.checked = false;
    }

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        }
    });

    // CSV Export helper functions
    function escapeCSV(text) {
        if (text === null || text === undefined) return '';
        let stringVal = String(text);
        stringVal = stringVal.replace(/"/g, '""');
        if (stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('\r') || stringVal.includes('"')) {
            stringVal = `"${stringVal}"`;
        }
        return stringVal;
    }

    function exportToCSV() {
        if (!filteredEntries || filteredEntries.length === 0) {
            alert('No release notes available to export.');
            return;
        }

        const headers = ['Date', 'Category Type', 'Link', 'Description'];
        const csvRows = [headers.join(',')];

        filteredEntries.forEach(entry => {
            entry.updates.forEach(update => {
                const row = [
                    escapeCSV(entry.date),
                    escapeCSV(update.type),
                    escapeCSV(entry.link),
                    escapeCSV(update.text)
                ];
                csvRows.push(row.join(','));
            });
        });

        const csvString = csvRows.join('\r\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    exportCsvBtn.addEventListener('click', exportToCSV);

    // Initial load
    fetchReleaseNotes(false);
});
