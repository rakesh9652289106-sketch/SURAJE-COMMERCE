const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

function createAnotherReview() {
    const product_id = 2; // Fresh Red Apples
    const username = 'Alice Smith';
    const rating = 4;
    const comment = 'Very crunchy and sweet. Will buy again!';
    
    db.run("INSERT INTO reviews (product_id, username, rating, comment) VALUES (?, ?, ?, ?)", 
        [product_id, username, rating, comment], 
        function(err) {
            if (err) {
                console.error("Error creating review:", err);
            } else {
                console.log("Review created successfully for Product 2 with ID:", this.lastID);
            }
            db.close();
        }
    );
}

createAnotherReview();
