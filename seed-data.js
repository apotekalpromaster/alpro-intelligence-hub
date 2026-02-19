require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
    console.log('🌱 Starting Seeder...');

    // 1. Create Outlets
    const outletsData = [
        { branch_code: 'AL-001', name: 'Alpro Cabang Pusat', region: 'Jabodetabek', address: 'Jakarta Selatan', is_active: true },
        { branch_code: 'AL-002', name: 'Alpro Bandung Indah', region: 'Bandung', address: 'Cihampelas', is_active: true },
        { branch_code: 'AL-003', name: 'Alpro Bekasi Cyber', region: 'Jabodetabek', address: 'Bekasi Barat', is_active: true },
        { branch_code: 'AL-004', name: 'Alpro Dago Atas', region: 'Bandung', address: 'Dago', is_active: true },
        { branch_code: 'AL-005', name: 'Alpro Depok UI', region: 'Jabodetabek', address: 'Depok', is_active: true },
    ];

    console.log('Creating Outlets...');
    const { data: outlets, error: outletError } = await supabase.from('outlets').upsert(outletsData, { onConflict: 'branch_code' }).select();
    if (outletError) console.error('Error creating outlets:', outletError);

    // 2. Create Products
    const productsData = [
        { sku: 'PRD-001', name: 'Laptop Gaming X', category: 'Electronics', min_stock: 5 },
        { sku: 'PRD-002', name: 'Mouse Wireless Pro', category: 'Accessories', min_stock: 10 },
        { sku: 'PRD-003', name: 'Monitor 24 Inch', category: 'Electronics', min_stock: 3 },
        { sku: 'PRD-004', name: 'Mechanical Keyboard', category: 'Accessories', min_stock: 5 },
        { sku: 'PRD-005', name: 'USB Hub Type-C', category: 'Accessories', min_stock: 10 },
    ];

    console.log('Creating Products...');
    const { data: products, error: productError } = await supabase.from('products').upsert(productsData, { onConflict: 'sku' }).select();
    if (productError) console.error('Error creating products:', productError);

    // 3. Create Daily Snapshots (The Z-STOP Scenarios)
    // Scenario: 
    // - Laptop Gaming X (PRD-001) in Pusat (AL-001) -> Normal Sales
    // - Mouse Wireless Pro (PRD-002) in Pusat (AL-001) -> Z-STOP (Stock High, Sales 0)
    // - Monitor (PRD-003) in Bandung (AL-002) -> Out of Stock
    // - Keyboard (PRD-004) in Bekasi (AL-003) -> Z-STOP (Stock High, Sales 0)

    if (!outlets || !products) {
        console.log('Skipping snapshots due to creating error.');
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    const snapshotsData = [
        // AL-001
        { outlet_id: outlets.find(o => o.branch_code === 'AL-001').id, product_id: products.find(p => p.sku === 'PRD-001').id, stock_qty: 20, sales_qty: 5, snapshot_date: today },
        { outlet_id: outlets.find(o => o.branch_code === 'AL-001').id, product_id: products.find(p => p.sku === 'PRD-002').id, stock_qty: 50, sales_qty: 0, snapshot_date: today }, // Z-STOP 🚨

        // AL-002
        { outlet_id: outlets.find(o => o.branch_code === 'AL-002').id, product_id: products.find(p => p.sku === 'PRD-003').id, stock_qty: 0, sales_qty: 0, snapshot_date: today }, // OOS
        { outlet_id: outlets.find(o => o.branch_code === 'AL-002').id, product_id: products.find(p => p.sku === 'PRD-005').id, stock_qty: 15, sales_qty: 2, snapshot_date: today },

        // AL-003
        { outlet_id: outlets.find(o => o.branch_code === 'AL-003').id, product_id: products.find(p => p.sku === 'PRD-004').id, stock_qty: 25, sales_qty: 0, snapshot_date: today }, // Z-STOP 🚨
    ];

    console.log('Creating Daily Snapshots...');
    const { error: snapshotError } = await supabase.from('daily_inventory_snapshots').upsert(snapshotsData, { onConflict: 'outlet_id, product_id, snapshot_date' });
    if (snapshotError) console.error('Error creating snapshots:', snapshotError);

    console.log('✅ Seeding Complete!');
}

seedData();
