const { initDb } = require('./db');
initDb();
setTimeout(() => {
    console.log("Migration complete.");
    process.exit(0);
}, 2000);
