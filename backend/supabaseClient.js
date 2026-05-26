require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase Client
let realSupabase = null;
let useSQLiteDefault = true;
try {
    if (supabaseUrl && supabaseKey) {
        realSupabase = createClient(supabaseUrl, supabaseKey);
        useSQLiteDefault = false;
    }
} catch (e) {
    console.error("Failed to initialize real Supabase client:", e.message);
}

// Open Local SQLite Database
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Casing column mapping helper between SQLite and Supabase
const sqliteToSupabaseMapping = {
    products: {
        imgUrl: 'imgurl',
        originalPrice: 'originalprice'
    },
    categories: {
        iconUrl: 'iconurl'
    },
    banners: {
        imgUrl: 'imgurl',
        btnText: 'btntext'
    },
    special_offers: {
        colorClass: 'colorclass'
    }
};

const supabaseToSqliteMapping = {
    products: {
        imgurl: 'imgUrl',
        originalprice: 'originalPrice'
    },
    categories: {
        iconurl: 'iconUrl'
    },
    banners: {
        imgurl: 'imgUrl',
        btntext: 'btnText'
    },
    special_offers: {
        colorclass: 'colorClass'
    }
};

// Map column name based on table
function mapColToSqlite(table, col) {
    if (supabaseToSqliteMapping[table] && supabaseToSqliteMapping[table][col]) {
        return supabaseToSqliteMapping[table][col];
    }
    return col;
}

// Map column name back to Supabase
function mapColToSupabase(table, col) {
    if (sqliteToSupabaseMapping[table] && sqliteToSupabaseMapping[table][col]) {
        return sqliteToSupabaseMapping[table][col];
    }
    return col;
}

// Map a row data from SQLite to Supabase convention
function mapRowToSupabase(table, row) {
    if (!row) return row;
    const newRow = { ...row };
    // Add lowercase aliases to prevent breaking frontend/backend logic
    if (sqliteToSupabaseMapping[table]) {
        Object.entries(sqliteToSupabaseMapping[table]).forEach(([sqliteCol, supabaseCol]) => {
            if (newRow[sqliteCol] !== undefined) {
                newRow[supabaseCol] = newRow[sqliteCol];
            }
        });
    }
    
    // Parse JSON columns if present
    if (newRow.variants && typeof newRow.variants === 'string') {
        try {
            newRow.variants = JSON.parse(newRow.variants);
        } catch(e) {}
    }
    if (newRow.items && typeof newRow.items === 'string') {
        try {
            newRow.items = JSON.parse(newRow.items);
        } catch(e) {}
    }
    
    return newRow;
}

// Map row data from Supabase to SQLite convention
function mapRowToSqlite(table, row) {
    if (!row) return row;
    const newRow = { ...row };
    if (supabaseToSqliteMapping[table]) {
        Object.entries(supabaseToSqliteMapping[table]).forEach(([supabaseCol, sqliteCol]) => {
            if (newRow[supabaseCol] !== undefined) {
                newRow[sqliteCol] = newRow[supabaseCol];
                delete newRow[supabaseCol];
            }
        });
    }
    
    // Stringify JSON columns
    if (newRow.variants && typeof newRow.variants === 'object') {
        newRow.variants = JSON.stringify(newRow.variants);
    }
    if (newRow.items && typeof newRow.items === 'object') {
        newRow.items = JSON.stringify(newRow.items);
    }
    
    return newRow;
}

// Mock Query Builder mimicking Supabase JS API
class SupabaseSQLiteMock {
    constructor(table) {
        this.table = table;
        this.queryType = 'select'; // 'select', 'insert', 'update', 'delete'
        this.selectFields = '*';
        this.whereFilters = [];
        this.orderClause = null;
        this.limitValue = null;
        this.singleResult = false;
        this.insertPayload = null;
        this.updatePayload = null;
        this.countExact = false;
    }

    select(fields = '*', options = {}) {
        if (this.queryType !== 'insert' && this.queryType !== 'update' && this.queryType !== 'delete') {
            this.queryType = 'select';
        }
        this.selectFields = fields;
        if (options.count === 'exact') {
            this.countExact = true;
        }
        return this;
    }

    insert(data) {
        this.queryType = 'insert';
        this.insertPayload = Array.isArray(data) ? data : [data];
        return this;
    }

    update(data) {
        this.queryType = 'update';
        this.updatePayload = data;
        return this;
    }

    delete() {
        this.queryType = 'delete';
        return this;
    }

    eq(col, val) {
        const sqliteCol = mapColToSqlite(this.table, col);
        this.whereFilters.push({ col: sqliteCol, op: '=', val });
        return this;
    }

    neq(col, val) {
        const sqliteCol = mapColToSqlite(this.table, col);
        this.whereFilters.push({ col: sqliteCol, op: '!=', val });
        return this;
    }

    gt(col, val) {
        const sqliteCol = mapColToSqlite(this.table, col);
        this.whereFilters.push({ col: sqliteCol, op: '>', val });
        return this;
    }

    gte(col, val) {
        const sqliteCol = mapColToSqlite(this.table, col);
        this.whereFilters.push({ col: sqliteCol, op: '>=', val });
        return this;
    }

    lte(col, val) {
        const sqliteCol = mapColToSqlite(this.table, col);
        this.whereFilters.push({ col: sqliteCol, op: '<=', val });
        return this;
    }

    ilike(col, pattern) {
        const sqliteCol = mapColToSqlite(this.table, col);
        // Translate Postgres % wildcard
        const sqliteVal = pattern.replace(/%/g, '%');
        this.whereFilters.push({ col: sqliteCol, op: 'LIKE', val: sqliteVal });
        return this;
    }

    not(col, op, val) {
        const sqliteCol = mapColToSqlite(this.table, col);
        if (op === 'is' && val === null) {
            this.whereFilters.push({ col: sqliteCol, op: 'IS NOT', val: null });
        } else {
            this.whereFilters.push({ col: sqliteCol, op: '!=', val });
        }
        return this;
    }

    or(filterString) {
        // Parse "name.ilike.%search%,description.ilike.%search%"
        this.whereFilters.push({ type: 'or', raw: filterString });
        return this;
    }

    order(col, options = {}) {
        const sqliteCol = mapColToSqlite(this.table, col);
        this.orderClause = `${sqliteCol} ${options.ascending ? 'ASC' : 'DESC'}`;
        return this;
    }

    limit(n) {
        this.limitValue = n;
        return this;
    }

    single() {
        this.singleResult = true;
        return this;
    }

    // Support standard promise await
    async then(resolve, reject) {
        try {
            const res = await this.execute();
            resolve(res);
        } catch (err) {
            resolve({ data: null, error: err });
        }
    }

    // Execute SQLite Query
    execute() {
        return new Promise((resolve, reject) => {
            const table = this.table;
            const self = this;

            if (this.queryType === 'select') {
                const hasWishlistJoin = table === 'wishlist_items' && this.selectFields.includes('products');
                const hasReviewsJoin = table === 'reviews' && this.selectFields.includes('products');

                if (this.countExact) {
                    // Count only
                    let sql = `SELECT COUNT(*) as count FROM ${table}`;
                    let params = [];
                    const { filterSql, filterParams } = this.buildWhereClause();
                    if (filterSql) {
                        sql += ` WHERE ${filterSql}`;
                        params = filterParams;
                    }

                    db.get(sql, params, (err, row) => {
                        if (err) return resolve({ data: null, error: err, count: 0 });
                        return resolve({ data: [], error: null, count: row.count });
                    });
                    return;
                }

                let sql = `SELECT * FROM ${table}`;
                let params = [];

                if (hasWishlistJoin) {
                    this.whereFilters.forEach(f => {
                        if (f.col === 'user_id') f.col = 'wishlist_items.user_id';
                        if (f.col === 'product_id') f.col = 'wishlist_items.product_id';
                    });
                    sql = `SELECT 
                        wishlist_items.id as wishlist_id, 
                        wishlist_items.product_id as wishlist_product_id, 
                        wishlist_items.user_id as wishlist_user_id, 
                        wishlist_items.created_at as wishlist_created_at, 
                        products.* 
                    FROM wishlist_items 
                    LEFT JOIN products ON wishlist_items.product_id = products.id`;
                } else if (hasReviewsJoin) {
                    this.whereFilters.forEach(f => {
                        if (f.col === 'product_id') f.col = 'reviews.product_id';
                    });
                    sql = `SELECT 
                        reviews.*, 
                        products.name as product_name 
                    FROM reviews 
                    LEFT JOIN products ON reviews.product_id = products.id`;
                }

                const { filterSql, filterParams } = this.buildWhereClause();
                if (filterSql) {
                    sql += ` WHERE ${filterSql}`;
                    params = filterParams;
                }

                if (this.orderClause) {
                    // Qualify order clause for joins
                    let qualifiedOrder = this.orderClause;
                    if (hasWishlistJoin && qualifiedOrder.startsWith('created_at')) {
                        qualifiedOrder = 'wishlist_items.' + qualifiedOrder;
                    }
                    if (hasReviewsJoin && qualifiedOrder.startsWith('created_at')) {
                        qualifiedOrder = 'reviews.' + qualifiedOrder;
                    }
                    sql += ` ORDER BY ${qualifiedOrder}`;
                }

                if (this.limitValue) {
                    sql += ` LIMIT ${this.limitValue}`;
                }

                db.all(sql, params, (err, rows) => {
                    if (err) {
                        console.error("SQLite Select Error:", err.message, "SQL:", sql);
                        return resolve({ data: null, error: err });
                    }
                    
                    let mapped;
                    if (hasWishlistJoin) {
                        mapped = rows.map(row => ({
                            id: row.wishlist_id,
                            product_id: row.wishlist_product_id,
                            user_id: row.wishlist_user_id,
                            created_at: row.wishlist_created_at,
                            products: {
                                id: row.id,
                                name: row.name,
                                category: row.category,
                                weight: row.weight,
                                price: row.price,
                                originalPrice: row.originalPrice,
                                originalprice: row.originalPrice,
                                rating: row.rating,
                                reviews: row.reviews,
                                imgUrl: row.imgUrl,
                                imgurl: row.imgUrl,
                                discount: row.discount,
                                stock_quantity: row.stock_quantity,
                                is_available: row.is_available,
                                is_trending: row.is_trending,
                                is_daily_essential: row.is_daily_essential,
                                description: row.description
                            }
                        }));
                    } else if (hasReviewsJoin) {
                        mapped = rows.map(row => ({
                            id: row.id,
                            product_id: row.product_id,
                            username: row.username,
                            rating: row.rating,
                            comment: row.comment,
                            created_at: row.created_at,
                            products: {
                                name: row.product_name
                            }
                        }));
                    } else {
                        mapped = rows.map(r => mapRowToSupabase(table, r));
                    }
                    
                    if (this.singleResult) {
                        return resolve({ data: mapped[0] || null, error: null });
                    }
                    return resolve({ data: mapped, error: null });
                });

            } else if (this.queryType === 'insert') {
                const results = [];
                let completed = 0;

                if (!self.insertPayload || self.insertPayload.length === 0) {
                    return resolve({ data: null, error: null });
                }

                self.insertPayload.forEach(row => {
                    const mappedRow = mapRowToSqlite(table, row);
                    const cols = Object.keys(mappedRow);
                    const placeholders = cols.map(() => '?').join(', ');
                    const vals = Object.values(mappedRow);

                    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

                    db.run(sql, vals, function(err) {
                        if (err) {
                            console.error("SQLite Insert Error:", err.message, "SQL:", sql);
                            return resolve({ data: null, error: err });
                        }
                        
                        const insertId = this.lastID;
                        db.get(`SELECT * FROM ${table} WHERE id = ?`, [insertId], (err, newRow) => {
                            if (err) return resolve({ data: null, error: err });
                            results.push(mapRowToSupabase(table, newRow));
                            completed++;

                            if (completed === self.insertPayload.length) {
                                return resolve({ data: results.length === 1 ? results[0] : results, error: null });
                            }
                        });
                    });
                });

            } else if (this.queryType === 'update') {
                const mappedUpdate = mapRowToSqlite(table, this.updatePayload);
                const cols = Object.keys(mappedUpdate);
                const setClause = cols.map(c => `${c} = ?`).join(', ');
                const updateVals = Object.values(mappedUpdate);

                let sql = `UPDATE ${table} SET ${setClause}`;
                let params = [...updateVals];

                const { filterSql, filterParams } = this.buildWhereClause();
                if (filterSql) {
                    sql += ` WHERE ${filterSql}`;
                    params = params.concat(filterParams);
                }

                db.run(sql, params, function(err) {
                    if (err) {
                        console.error("SQLite Update Error:", err.message, "SQL:", sql);
                        return resolve({ data: null, error: err });
                    }
                    return resolve({ data: { updated: this.changes }, error: null });
                });

            } else if (this.queryType === 'delete') {
                let sql = `DELETE FROM ${table}`;
                let params = [];

                const { filterSql, filterParams } = this.buildWhereClause();
                if (filterSql) {
                    sql += ` WHERE ${filterSql}`;
                    params = filterParams;
                }

                db.run(sql, params, function(err) {
                    if (err) {
                        console.error("SQLite Delete Error:", err.message, "SQL:", sql);
                        return resolve({ data: null, error: err });
                    }
                    return resolve({ data: { deleted: this.changes }, error: null });
                });
            }
        });
    }

    buildWhereClause() {
        let filterSql = '';
        const filterParams = [];
        const clauses = [];

        this.whereFilters.forEach(f => {
            if (f.type === 'or') {
                // Parse "name.ilike.%search%,description.ilike.%search%"
                const orParts = f.raw.split(',');
                const orClauses = [];
                orParts.forEach(part => {
                    const subParts = part.split('.');
                    const rawCol = subParts[0];
                    const col = mapColToSqlite(this.table, rawCol);
                    const op = subParts[1];
                    const valWithPercents = subParts[2];
                    
                    if (op === 'ilike') {
                        orClauses.push(`${col} LIKE ?`);
                        filterParams.push(valWithPercents.replace(/%/g, '%'));
                    } else {
                        orClauses.push(`${col} = ?`);
                        filterParams.push(valWithPercents);
                    }
                });
                clauses.push(`(${orClauses.join(' OR ')})`);
            } else {
                if (f.val === null && f.op === 'IS NOT') {
                    clauses.push(`${f.col} IS NOT NULL`);
                } else {
                    clauses.push(`${f.col} ${f.op} ?`);
                    filterParams.push(f.val);
                }
            }
        });

        if (clauses.length > 0) {
            filterSql = clauses.join(' AND ');
        }

        return { filterSql, filterParams };
    }
}

// Create routing client
const hybridSupabase = {
    // Mode tracker
    useSQLite: useSQLiteDefault,

    from(table) {
        if (this.useSQLite) {
            return new SupabaseSQLiteMock(table);
        }
        return realSupabase.from(table);
    }
};

// Check connection to Supabase and decide whether to fall back
async function detectBestDatabase() {
    if (!realSupabase) {
        console.warn("⚠️ [DB ROUTER] No real Supabase config. Defaulting to local SQLite Database.");
        hybridSupabase.useSQLite = true;
        return;
    }

    try {
        // Quick connection check with 2s timeout
        const pingPromise = realSupabase.from('settings').select('id').limit(1);
        const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout")), 2000));
        
        const { error } = await Promise.race([pingPromise, timeoutPromise]);
        if (error) throw error;
        
        console.log("✅ [DB ROUTER] Supabase connection active and verified.");
        hybridSupabase.useSQLite = false;
    } catch (e) {
        console.warn(`⚠️ [DB ROUTER] Supabase ping failed (${e.message}). Falling back to local SQLite Database.`);
        hybridSupabase.useSQLite = true;
    }
}

// Trigger initial check
detectBestDatabase();

module.exports = { supabase: hybridSupabase };

