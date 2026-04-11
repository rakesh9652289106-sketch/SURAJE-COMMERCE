const { router: authRouter } = require('./routes/authRoute');
const productRouter = require('./routes/productRoute');
const adminRouter = require('./routes/adminRoute');
const indexRouter = require('./routes/indexRoute');

console.log("--- ROUTES DISCOVERY ---");
console.log("Index Routes:");
indexRouter.stack.forEach(r => {
    if (r.route) {
        console.log(`  ${Object.keys(r.route.methods)} ${r.route.path}`);
    }
});
