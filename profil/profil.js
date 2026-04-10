document.addEventListener('DOMContentLoaded', () => {
    const page = document.querySelector('.profile-friends-page');
    if (!page) {
        return;
    }

    const csrfToken = page.dataset.csrfToken || '';
    const profileForm = document.getElementById('profile-form');
    const searchForm = document.getElementById('friend-search-form');
    const displayNameInput = document.getElementById('displayName');
    const scoliaSerialInput = document.getElementById('scoliaSerial');
    const scoliaTokenInput = document.getElementById('scoliaToken');
    const profileStatus = document.getElementById('profile-status');
    const searchStatus = document.getElementById('friend-search-status');
    const gameInvitationsStatus = document.getElementById('game-invitations-status');
    const friendsTableBody = document.getElementById('friends-table-body');
    const invitationsTableBody = document.getElementById('invitations-table-body');
    const searchResultsBody = document.getElementById('search-results-body');
    const gameInvitationsBody = document.getElementById('game-invitations-body');
    const sentGameInvitationsBody = document.getElementById('sent-game-invitations-body');
    const invitationsSection = document.getElementById('invitations-section');
    const gameInvitationsSection = document.getElementById('game-invitations-section');
    const sentGameInvitationsSection = document.getElementById('sent-game-invitations-section');
    const searchResultsSection = document.getElementById('search-results-section');
    const searchInput = document.getElementById('friend-search-input');

    let currentSearchQuery = '';

    function setStatus(element, message, kind) {
        element.textContent = message || '';
        element.classList.remove('is-success', 'is-error');

        if (kind === 'success') {
            element.classList.add('is-success');
        }

        if (kind === 'error') {
            element.classList.add('is-error');
        }
    }

    function createEmptyRow(columnCount) {
        const row = document.createElement('tr');
        row.className = 'empty-row';

        for (let index = 0; index < columnCount; index += 1) {
            row.appendChild(document.createElement('td'));
        }

        return row;
    }

    function createActionButton(label, action, userId) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'table-button';
        button.textContent = label;
        button.dataset.action = action;
        button.dataset.userId = String(userId);
        return button;
    }

    function createGameActionButton(label, action, gameType, saveId) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'table-button';
        button.textContent = label;
        button.dataset.action = action;
        button.dataset.gameType = gameType;
        button.dataset.saveId = String(saveId);
        return button;
    }

    function appendCell(row, value) {
        const cell = document.createElement('td');
        cell.textContent = value == null ? '' : String(value);
        row.appendChild(cell);
        return cell;
    }

    function renderFriends(friends) {
        friendsTableBody.innerHTML = '';

        if (!Array.isArray(friends) || friends.length === 0) {
            friendsTableBody.appendChild(createEmptyRow(4));
            return;
        }

        friends.forEach(friend => {
            const row = document.createElement('tr');
            appendCell(row, friend.id);
            appendCell(row, friend.name);
            appendCell(row, friend.lastLogin || '');
            appendCell(row, '').appendChild(createActionButton('Entfernen', 'remove', friend.id));
            friendsTableBody.appendChild(row);
        });
    }

    function renderInvitations(invitations) {
        invitationsTableBody.innerHTML = '';
        const hasInvitations = Array.isArray(invitations) && invitations.length > 0;
        invitationsSection.classList.toggle('is-hidden', !hasInvitations);

        if (!hasInvitations) {
            invitationsTableBody.appendChild(createEmptyRow(4));
            return;
        }

        invitations.forEach(invitation => {
            const row = document.createElement('tr');
            appendCell(row, invitation.id);
            appendCell(row, invitation.name);
            appendCell(row, invitation.lastLogin || '');
            const statusCell = appendCell(row, '');
            if (invitation.direction === 'outgoing') {
                statusCell.appendChild(createActionButton('Abbrechen', 'cancel', invitation.id));
            } else {
                statusCell.appendChild(createActionButton('Annehmen', 'accept', invitation.id));
                statusCell.appendChild(createActionButton('Ablehnen', 'reject', invitation.id));
            }

            invitationsTableBody.appendChild(row);
        });
    }

    function renderSearchResults(results) {
        searchResultsBody.innerHTML = '';
        searchResultsSection.classList.remove('is-hidden');

        if (!Array.isArray(results) || results.length === 0) {
            searchResultsBody.appendChild(createEmptyRow(4));
            return;
        }

        results.forEach(result => {
            const row = document.createElement('tr');
            appendCell(row, result.id);
            appendCell(row, result.name);
            appendCell(row, result.lastLogin || '');
            const actionCell = appendCell(row, '');
            if (result.actionEnabled) {
                actionCell.appendChild(createActionButton(result.actionLabel, result.action, result.id));
            } else {
                actionCell.textContent = result.actionLabel;
            }

            searchResultsBody.appendChild(row);
        });
    }

    function renderGameInvitations(invitations) {
        gameInvitationsBody.innerHTML = '';
        const hasInvitations = Array.isArray(invitations) && invitations.length > 0;
        gameInvitationsSection.classList.toggle('is-hidden', !hasInvitations);

        if (!hasInvitations) {
            gameInvitationsBody.appendChild(createEmptyRow(5));
            return;
        }

        invitations.forEach(invitation => {
            const row = document.createElement('tr');
            appendCell(row, invitation.gameLabel || 'Spiel');
            appendCell(row, invitation.saveName || 'Speicherstand');
            appendCell(row, invitation.inviterName || 'Unbekannt');
            appendCell(row, invitation.updatedAt || '');
            const actionCell = appendCell(row, '');
            actionCell.appendChild(createGameActionButton('Annehmen', 'accept_invitation', invitation.gameType, invitation.saveId));
            actionCell.appendChild(createGameActionButton('Ablehnen', 'reject_invitation', invitation.gameType, invitation.saveId));
            gameInvitationsBody.appendChild(row);
        });
    }

    function renderSentGameInvitations(invitations) {
        sentGameInvitationsBody.innerHTML = '';
        const hasInvitations = Array.isArray(invitations) && invitations.length > 0;
        sentGameInvitationsSection.classList.toggle('is-hidden', !hasInvitations);

        if (!hasInvitations) {
            sentGameInvitationsBody.appendChild(createEmptyRow(5));
            return;
        }

        invitations.forEach(invitation => {
            const row = document.createElement('tr');
            appendCell(row, invitation.gameLabel || 'Spiel');
            appendCell(row, invitation.saveName || 'Speicherstand');
            appendCell(row, invitation.invitedName || 'Unbekannt');
            appendCell(row, invitation.statusLabel || 'Laufend');
            appendCell(row, invitation.updatedAt || '');
            sentGameInvitationsBody.appendChild(row);
        });
    }

    async function fetchJson(url, options) {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unbekannter Fehler.');
        }

        return data;
    }

    async function loadProfileData(statusMessage) {
        try {
            const data = await fetchJson('/profile-data.php');
            displayNameInput.value = data.profile.displayName || '';
            scoliaSerialInput.value = data.profile.serialNumber || '';
            scoliaTokenInput.value = data.profile.accessToken || '';
            renderFriends(data.friends || []);
            renderInvitations(data.invitations || []);
            renderGameInvitations(data.gameInvitations || []);
            renderSentGameInvitations(data.sentGameInvitations || []);

            if (statusMessage) {
                setStatus(profileStatus, statusMessage, 'success');
            }
        } catch (error) {
            setStatus(profileStatus, error.message, 'error');
        }
    }

    async function runSearch(query) {
        currentSearchQuery = query.trim();

        if (!currentSearchQuery) {
            searchResultsSection.classList.add('is-hidden');
            searchResultsBody.innerHTML = '';
            setStatus(searchStatus, 'Bitte Name oder ID eingeben.', 'error');
            return;
        }

        try {
            const data = await fetchJson(`/friend-search.php?q=${encodeURIComponent(currentSearchQuery)}`);
            renderSearchResults(data.results || []);
            setStatus(searchStatus, `${(data.results || []).length} Ergebnis(se) gefunden.`, 'success');
        } catch (error) {
            setStatus(searchStatus, error.message, 'error');
        }
    }

    async function handleFriendAction(action, userId) {
        try {
            const data = await fetchJson('/friend-action.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csrfToken, action, targetUserId: Number(userId) })
            });

            renderFriends(data.friends || []);
            renderInvitations(data.invitations || []);
            setStatus(searchStatus, data.message, 'success');

            if (currentSearchQuery) {
                await runSearch(currentSearchQuery);
            }
        } catch (error) {
            setStatus(searchStatus, error.message, 'error');
        }
    }

    async function handleGameInvitationAction(action, gameType, saveId) {
        try {
            const data = await fetchJson('/shanghai-storage.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    csrfToken,
                    action,
                    gameType,
                    saveId: Number(saveId)
                })
            });

            setStatus(gameInvitationsStatus, data.message, 'success');
            await loadProfileData();
        } catch (error) {
            setStatus(gameInvitationsStatus, error.message, 'error');
        }
    }

    profileForm.addEventListener('submit', async event => {
        event.preventDefault();

        try {
            const data = await fetchJson('/save-profile.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    csrfToken,
                    displayName: displayNameInput.value,
                    serialNumber: scoliaSerialInput.value,
                    accessToken: scoliaTokenInput.value
                })
            });

            displayNameInput.value = data.profile.displayName || '';
            scoliaSerialInput.value = data.profile.serialNumber || '';
            scoliaTokenInput.value = data.profile.accessToken || '';
            setStatus(profileStatus, data.message, 'success');

            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.textContent = data.profile.displayName || '';
            }
        } catch (error) {
            setStatus(profileStatus, error.message, 'error');
        }
    });

    searchForm.addEventListener('submit', event => {
        event.preventDefault();
        void runSearch(searchInput.value);
    });

    [friendsTableBody, invitationsTableBody, searchResultsBody].forEach(tableBody => {
        tableBody.addEventListener('click', event => {
            const target = event.target;
            if (!(target instanceof HTMLButtonElement)) {
                return;
            }

            const action = target.dataset.action || '';
            const userId = target.dataset.userId || '';
            if (!action || !userId) {
                return;
            }

            void handleFriendAction(action, userId);
        });
    });

    gameInvitationsBody.addEventListener('click', event => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) {
            return;
        }

        const action = target.dataset.action || '';
        const gameType = target.dataset.gameType || '';
        const saveId = target.dataset.saveId || '';
        if (!action || !gameType || !saveId) {
            return;
        }

        void handleGameInvitationAction(action, gameType, saveId);
    });

    void loadProfileData();
});