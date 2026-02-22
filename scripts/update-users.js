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
    var derbies = []; //['fd-hhous-d8d5676a95af31f5cf95e369b120b0a0'];

    const derbyListing = await fetch('https://bobba.me/includes/ajax/derby/api_recent?page=1&pageSize=10');
    const derbyListingJson = await derbyListing.json();

    for (const derby of derbyListingJson.rows) {
        derbies.push(derby.derby_id);
    }

    for (const derby of derbies.slice(0, 3)) {
        const derbyData = await getDerbyData(derby);
        console.log(derby);
        for (const participant of derbyData.metadata.participantAccountIds) {
            if (users.find(user => user.uniqueId === participant)) continue;
            const userData = await getUserData(participant);
            users.push(userData);

            console.log(userData.name);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    fs.writeFileSync('users.json', JSON.stringify(users));

})();
