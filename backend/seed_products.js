const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const products = [
    // Snacks
    { category: 'Snacks', name: 'Potato Chips', price: 15, originalprice: 20, weight: '50g', discount: '25% OFF', imgurl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400', stock_quantity: 100 },
    { category: 'Snacks', name: 'Kurkure Masala', price: 9, originalprice: 10, weight: '40g', discount: '10% OFF', imgurl: 'https://images.unsplash.com/photo-1600490033605-3de4ef2e8251?w=400', stock_quantity: 100 },
    { category: 'Snacks', name: 'Oreo Biscuits', price: 25, originalprice: 30, weight: '120g', discount: '₹5 OFF', imgurl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', stock_quantity: 100 },

    // Dairy
    { category: 'Dairy', name: 'Amul Milk', price: 64, originalprice: 66, weight: '1L', discount: '₹2 OFF', imgurl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', stock_quantity: 100 },
    { category: 'Dairy', name: 'Amul Butter', price: 50, originalprice: 52, weight: '100g', discount: '₹2 OFF', imgurl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', stock_quantity: 100 },
    { category: 'Dairy', name: 'Paneer', price: 85, originalprice: 90, weight: '200g', discount: '₹5 OFF', imgurl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400', stock_quantity: 100 },

    // Household
    { category: 'Household', name: 'Dishwash Bar', price: 18, originalprice: 20, weight: '150g', discount: '10% OFF', imgurl: 'https://images.unsplash.com/photo-1584622781564-1d9876a13d1a?w=400', stock_quantity: 100 },
    { category: 'Household', name: 'Floor Cleaner', price: 99, originalprice: 120, weight: '1L', discount: '₹21 OFF', imgurl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400', stock_quantity: 100 },

    // Drinks
    { category: 'Drinks', name: 'Coca Cola', price: 38, originalprice: 40, weight: '750ml', discount: '5% OFF', imgurl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400', stock_quantity: 100 },
    { category: 'Drinks', name: 'Frooti', price: 9, originalprice: 10, weight: '160ml', discount: '10% OFF', imgurl: 'https://images.unsplash.com/photo-1533007148611-858fc71ccd9b?w=400', stock_quantity: 100 },

    // Vegetables
    { category: 'Vegetables', name: 'Onion', price: 35, originalprice: 40, weight: '1kg', discount: '12% OFF', imgurl: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400', stock_quantity: 100 },
    { category: 'Vegetables', name: 'Potato', price: 25, originalprice: 30, weight: '1kg', discount: '16% OFF', imgurl: 'https://images.unsplash.com/photo-1518977676601-b53f02ac6d31?w=400', stock_quantity: 100 },

    // Fresh Vegetables
    { category: 'Fresh Vegetables', name: 'Tomato', price: 45, originalprice: 50, weight: '1kg', discount: '10% OFF', imgurl: 'https://images.unsplash.com/photo-1518977676601-b53f02ac6d31?w=400', stock_quantity: 100 },
    { category: 'Fresh Vegetables', name: 'Green Chilli', price: 8, originalprice: 10, weight: '100g', discount: '20% OFF', imgurl: 'https://images.unsplash.com/photo-1588276552401-30058a0fe57b?w=400', stock_quantity: 100 },

    // Fruits
    { category: 'Fruits', name: 'Banana', price: 55, originalprice: 60, weight: '1 dozen', discount: '8% OFF', imgurl: 'https://images.unsplash.com/photo-1571771894821-ad9902d73647?w=400', stock_quantity: 100 },
    { category: 'Fruits', name: 'Apple Royal Gala', price: 160, originalprice: 180, weight: '1kg', discount: '₹20 OFF', imgurl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400', stock_quantity: 100 },
    { category: 'Fruits', name: 'Guava', price: 80, originalprice: 100, weight: '1kg', discount: '20% OFF', imgurl: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Guava_ID.jpg', stock_quantity: 100 },

    // Atta, Rice & Dal
    { category: 'Atta, Rice & Dal', name: 'Ashirvaad Atta', price: 410, originalprice: 450, weight: '10kg', discount: '₹40 OFF', imgurl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', stock_quantity: 100 },
    { category: 'Atta, Rice & Dal', name: 'Basmati Rice', price: 110, originalprice: 120, weight: '1kg', discount: '₹10 OFF', imgurl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', stock_quantity: 100 },
    { category: 'Atta, Rice & Dal', name: 'Toor Dal', price: 150, originalprice: 160, weight: '1kg', discount: '₹10 OFF', imgurl: 'https://images.unsplash.com/photo-1547050605-2f22384666f3?w=400', stock_quantity: 100 },

    // Oil, Ghee & Masala
    { category: 'Oil, Ghee & Masala', name: 'Mustard Oil', price: 165, originalprice: 180, weight: '1L', discount: '₹15 OFF', imgurl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', stock_quantity: 100 },
    { category: 'Oil, Ghee & Masala', name: 'Amul Ghee', price: 580, originalprice: 600, weight: '1L', discount: '₹20 OFF', imgurl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', stock_quantity: 100 },
    { category: 'Oil, Ghee & Masala', name: 'Turmeric Powder', price: 28, originalprice: 30, weight: '100g', discount: '₹2 OFF', imgurl: 'https://images.unsplash.com/photo-1615485245470-36655a6d5951?w=400', stock_quantity: 100 },

    // Salts & Sugar
    { category: 'Salts & Sugar', name: 'Tata Salt', price: 26, originalprice: 28, weight: '1kg', discount: '₹2 OFF', imgurl: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=400', stock_quantity: 100 },
    { category: 'Salts & Sugar', name: 'Sugar', price: 42, originalprice: 45, weight: '1kg', discount: '₹3 OFF', imgurl: 'https://images.unsplash.com/photo-1581447100595-3773dec19938?w=400', stock_quantity: 100 },

    // Dry Fruits
    { category: 'Dry Fruits', name: 'Almonds (Badam)', price: 420, originalprice: 450, weight: '500g', discount: '₹30 OFF', imgurl: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400', stock_quantity: 100 },
    { category: 'Dry Fruits', name: 'Cashews (Kaju)', price: 470, originalprice: 500, weight: '500g', discount: '₹30 OFF', imgurl: 'https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?w=400', stock_quantity: 100 },

    // Snacks & Drinks
    { category: 'Snacks & Drinks', name: 'Lays Magic Masala', price: 18, originalprice: 20, weight: '50g', discount: '10% OFF', imgurl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400', stock_quantity: 100 },
    { category: 'Snacks & Drinks', name: 'Pepsi', price: 35, originalprice: 40, weight: '600ml', discount: '₹5 OFF', imgurl: 'https://images.unsplash.com/photo-1629203851022-39c6f254b49a?w=400', stock_quantity: 100 },

    // Household Care
    { category: 'Household Care', name: 'Surf Excel', price: 140, originalprice: 160, weight: '1kg', discount: '₹20 OFF', imgurl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400', stock_quantity: 100 },
    { category: 'Household Care', name: 'Harpic', price: 85, originalprice: 100, weight: '500ml', discount: '15% OFF', imgurl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400', stock_quantity: 100 },

    // Dairy & Bakery
    { category: 'Dairy & Bakery', name: 'White Bread', price: 35, originalprice: 40, weight: '400g', discount: '₹5 OFF', imgurl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', stock_quantity: 100 },
    { category: 'Dairy & Bakery', name: 'Greek Yogurt', price: 50, originalprice: 60, weight: '100g', discount: '₹10 OFF', imgurl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', stock_quantity: 100 },

    // Dairy & Bread (duplicate/similar)
    { category: 'Dairy & Bread', name: 'Brown Bread', price: 45, originalprice: 50, weight: '400g', discount: '10% OFF', imgurl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', stock_quantity: 100 }
];

async function seed() {
    console.log('Seeding products...');
    const { error } = await supabase.from('products').insert(products);
    if (error) {
        console.error('Error seeding products:', error);
    } else {
        console.log('Successfully seeded products!');
    }
}

seed();
