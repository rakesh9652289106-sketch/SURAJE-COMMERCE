const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

function createReview() {
    const product_id = 1; // Premium Toor Dal
    const username = 'TestUser';
    const rating = 5;
    const comment = 'Excellent quality and very fresh! Highly recommend.';
    
    db.run("INSERT INTO reviews (product_id, username, rating, comment) VALUES (?, ?, ?, ?)", 
        [product_id, username, rating, comment], 
        function(err) {
            if (err) {
                console.error("Error creating review:", err);
            } else {
                console.log("Review created successfully with ID:", this.lastID);
            }
            db.close();
        }
    );
}

createReview();
