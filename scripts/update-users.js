const fs = require('fs');

(async () => {

    async function getUserData(userId) {
        const userData = await fetch(`https://habbo-api-proxy.scott-000.workers.dev/api/public/users/${userId}`);
        const userDataJson = await userData.json();
        return userDataJson;
    }

    async function getDerbyData(derbyId) {
        const derbyData = await fetch(`https://habbo-api-proxy.scott-000.workers.dev/api/public/minigame/derby/v1/${derbyId}`);
        const derbyDataJson = await derbyData.json();
        return derbyDataJson;
    }

    var users = JSON.parse(fs.readFileSync('users.json'));
    var derbies = [];

    const derbyListing = await fetch('https://bobba.me/includes/ajax/derby/api_recent?page=2&pageSize=50');
    const derbyListingJson = await derbyListing.json();

    for (const derby of derbyListingJson.rows) {
        // console.log(derby.derby_id);
        derbies.push(derby.derby_id);
    }

    for (const derby of derbies) {
        const derbyData = await getDerbyData(derby);
        for (const participant of derbyData.metadata.participantAccountIds) {
            if (users.find(user => user.uniqueId === participant)) continue;
            const userData = await getUserData(participant);
            users.push(userData);

            console.log(userData);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    fs.writeFileSync('users.json', JSON.stringify(users));

})();