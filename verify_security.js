const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

function verifySecurity() {
    console.log("--- Checking Admin Password ---");
    db.get("SELECT admin_password FROM settings WHERE id = 1", (err, row) => {
        if (row) {
            const isHashed = row.admin_password.includes(':');
            console.log(`Admin Password: ${row.admin_password}`);
            console.log(`Is Hashed: ${isHashed}`);
        } else {
            console.log("Admin setting not found.");
        }
    });

    console.log("\n--- Checking User Passwords ---");
    db.all("SELECT id, username, password FROM users", (err, rows) => {
        if (rows && rows.length > 0) {
            rows.forEach(user => {
                const isHashed = user.password.includes(':');
                console.log(`User ${user.username} (ID: ${user.id}) Password: ${user.password}`);
                console.log(`Is Hashed: ${isHashed}`);
            });
        } else {
            console.log("No users found.");
        }
        db.close();
    });
}

verifySecurity();
