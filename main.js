let refreshTimer = null;
let countdownTimer = null;
let secondsUntilRefresh = 30;

const formatTime = (ms) => new Date(ms).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
});

const renderInfo = (info, totals) => {
    const container = document.getElementById('derby-meta');
    if (!container) return;

    const statusClass = info.status === 'COMPLETED' ? 'status-completed' : 'status-active';

    container.innerHTML = `
        <div class="derby-meta-card">
            <div class="meta-item" style="grid-column: 1 / -1; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: start; flex-direction: row;">
                <div>
                    <div class="meta-label">Status</div>
                    <div class="status-badge ${statusClass}">${info.status}</div>
                </div>
                ${info.status !== 'COMPLETED' ? `
                <div style="text-align: right;">
                    <div class="meta-label">Next Refresh</div>
                    <div class="meta-value" id="refresh-countdown" style="font-size: 0.95rem; font-family: monospace; color: var(--accent-primary); justify-content: flex-end;">30s</div>
                </div>
                ` : ''}
            </div>
            
            <div class="meta-item">
                <div class="meta-label">Fishers</div>
                <div class="meta-value">${totals.fishers}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Total Fish</div>
                <div class="meta-value">${totals.regularFish}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Golden Fish</div>
                <div class="meta-value highlight">${totals.goldenFish} 🌟</div>
            </div>
            
            <div class="meta-item" style="margin-top: 0.5rem;">
                <div class="meta-label">Start Time</div>
                <div class="meta-value" style="font-size: 0.95rem;">${formatTime(info.startTime)}</div>
            </div>
            <div class="meta-item" style="margin-top: 0.5rem;">
                <div class="meta-label">End Time</div>
                <div class="meta-value" style="font-size: 0.95rem;">${formatTime(info.endTime)}</div>
            </div>
        </div>
    `;
};

// High quality SVG medals with gradients and shadow simulation
const getMedalSVG = (rank) => {
    if (rank > 3) return `<span style="font-size: 1.25rem;">${rank}</span>`;

    const colors = {
        1: { primary: '#fbbf24', dark: '#d97706', light: '#fef08a' }, // Gold
        2: { primary: '#cbd5e1', dark: '#94a3b8', light: '#f1f5f9' }, // Silver
        3: { primary: '#b45309', dark: '#78350f', light: '#fcd34d' }  // Bronze
    };

    const c = colors[rank];

    return `
        <svg class="medal-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad${rank}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${c.light}" />
                    <stop offset="50%" stop-color="${c.primary}" />
                    <stop offset="100%" stop-color="${c.dark}" />
                </linearGradient>
            </defs>
            <!-- Ribbon -->
            <path d="M9 18L5 30L16 25L27 30L23 18" fill="url(#grad${rank})" opacity="0.8"/>
            <!-- Coin Base -->
            <circle cx="16" cy="12" r="10" fill="url(#grad${rank})" stroke="${c.dark}" stroke-width="1"/>
            <!-- Coin Inner -->
            <circle cx="16" cy="12" r="7" stroke="${c.light}" stroke-width="1" fill="none" opacity="0.6"/>
            <!-- Rank Text -->
            <text x="16" y="15" font-family="Outfit, sans-serif" font-weight="bold" font-size="10" fill="${c.dark}" text-anchor="middle">${rank}</text>
            <!-- Small highlight -->
            <path d="M11 9A5 5 0 0 1 18 7" stroke="${c.light}" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.8"/>
        </svg>
    `;
};

const createListItem = (participant, rank, scoreLabel) => {
    const hasUsername = participant.username !== undefined;
    const displayName = hasUsername ? participant.username : 'Unresolved';
    const nameClass = hasUsername ? 'username' : 'username unresolved';
    const rankClass = rank <= 3 ? `rank-${rank}` : '';

    return `
        <div class="list-item ${rankClass}">
            <div class="rank">
                ${getMedalSVG(rank)}
            </div>
            <div class="player-info">
                <div class="${nameClass}">${displayName}</div>
                ${!hasUsername ? `<div class="account-id">${participant.accountId}</div>` : ''}
            </div>
            <div class="score-wrap">
                <div class="score">${participant[scoreLabel]}</div>
                <div class="score-label">pts</div>
            </div>
        </div>
    `;
};

const renderList = (containerId, data, scoreLabel) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    data.forEach((participant, index) => {
        container.innerHTML += createListItem(participant, index + 1, scoreLabel);
    });

    if (data.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 3rem;">No data available for this category</div>';
    }
};

const initTabs = () => {
    const tabs = document.querySelectorAll('.tab');
    const lists = document.querySelectorAll('.list-container');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            lists.forEach(l => l.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });
};

const fetchWithFallback = async (urls) => {
    for (const url of urls) {
        try {
            const response = await fetch(url, {
                headers: {
                    "hotel": "origins",
                    "cache": 30
                }
            });
            if (response.ok) return response;
        } catch (e) {
            // Ignore network errors and try next URL
            console.log(`Fallback triggered for ${url}`);
        }
    }
    throw new Error(`Failed to fetch from any of: ${urls.join(', ')}`);
};

const loadData = async () => {
    try {
        const hash = window.location.hash.replace('#', '');
        const inputEl = document.getElementById('derby-id-input');

        let derbyUrl = '';
        if (hash) {
            derbyUrl = `https://habbo-asset-proxy.scott-000.workers.dev/api/public/minigame/derby/v1/${hash}`;
            if (inputEl) inputEl.value = hash;
        } else {
            derbyUrl = 'https://habbo-asset-proxy.scott-000.workers.dev/api/public/minigame/derby/v1/status';
            if (inputEl) inputEl.value = '';
        }

        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = 'flex';
            loadingEl.innerHTML = `
                <div class="spinner"></div>
                <div>Syncing live data...</div>
            `;
        }

        const containerPublic = document.getElementById('public-list');
        const containerPrivate = document.getElementById('private-list');
        if (containerPublic) containerPublic.innerHTML = '';
        if (containerPrivate) containerPrivate.innerHTML = '';

        // Fetch Derby Results and Users in parallel
        // Falling back to local example-data for demonstration if relative/absolute endpoint fails
        const fallbackJSON = hash ? '/example-data/derby-result.json' : '/example-data/derby-status-result.json';
        const [derbyRes, usersRes] = await Promise.all([
            fetchWithFallback([derbyUrl, fallbackJSON]),
            fetchWithFallback(['/users', 'example-data/users.json'])
        ]);

        const rawDerbyData = await derbyRes.json();
        const usersData = await usersRes.json();

        // Normalize depending on whether it's from /status or /:id
        const derbyData = rawDerbyData.derby ? rawDerbyData.derby : rawDerbyData;

        // If no hash was initially passed, set it using the returned id
        if (!hash && derbyData.metadata?.derbyId) {
            const loadedId = derbyData.metadata.derbyId;
            if (inputEl) inputEl.value = loadedId;
            // Update hash without triggering a reload loop
            history.replaceState(null, null, `#${loadedId}`);
        }

        const participants = derbyData.info?.participants || [];

        // Calculate Totals
        const totals = {
            fishers: participants.length,
            regularFish: 0,
            goldenFish: 0
        };
        participants.forEach(p => {
            totals.regularFish += (p.fishCaught || 0);
            totals.goldenFish += (p.goldenFishCaught || 0);
        });

        if (derbyData.info) {
            renderInfo(derbyData.info, totals);
        }

        const userMap = {};
        usersData.forEach(user => {
            userMap[user.id] = user.name;
        });

        // Process participants
        const processed = participants.map(p => {
            const goldenBonus = (p.goldenFishCaught || 0);
            return {
                accountId: p.accountId,
                username: userMap[p.accountId],
                publicTotal: Math.max(0, p.fishCaught - p.privateFishCaught) + goldenBonus,
                privateTotal: p.privateFishCaught + goldenBonus
            };
        });

        const publicSorted = [...processed].sort((a, b) => b.publicTotal - a.publicTotal);
        const privateSorted = [...processed].sort((a, b) => b.privateTotal - a.privateTotal);

        document.getElementById('loading').style.display = 'none';

        renderList('public-list', publicSorted, 'publicTotal');
        renderList('private-list', privateSorted, 'privateTotal');

        if (refreshTimer) clearTimeout(refreshTimer);
        if (countdownTimer) clearInterval(countdownTimer);

        if (derbyData.info && derbyData.info.status !== 'COMPLETED') {
            secondsUntilRefresh = 30;

            countdownTimer = setInterval(() => {
                secondsUntilRefresh--;
                const countdownEl = document.getElementById('refresh-countdown');
                if (countdownEl) {
                    countdownEl.innerText = `${secondsUntilRefresh}s`;
                }
            }, 1000);

            refreshTimer = setTimeout(() => {
                clearInterval(countdownTimer);
                loadData();
            }, 30000);
        }

    } catch (error) {
        console.error('Error fetching data:', error);
        const loadingEl = document.getElementById('loading');
        loadingEl.innerHTML = `
            <svg style="width: 48px; height: 48px; color: #ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <div style="color: #ef4444;">Error loading live data</div>
            <div style="font-size: 0.9rem; color: var(--text-muted); font-weight: 300;">Please ensure the API is reachable</div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initTabs();

    const searchBtn = document.getElementById('load-derby-btn');
    const searchInput = document.getElementById('derby-id-input');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            window.location.hash = searchInput.value.trim();
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.location.hash = searchInput.value.trim();
            }
        });
    }

    window.addEventListener('hashchange', loadData);

    loadData();
});
