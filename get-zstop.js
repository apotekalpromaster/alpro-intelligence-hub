require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getZStopAnalysis() {
    console.log('🔍 Running Z-STOP Analysis...');
    console.log('Criteria: Stock > 0 AND Sales = 0 (Dead Stock Candidate)\n');

    const { data, error } = await supabase
        .from('daily_inventory_snapshots')
        .select(`
      stock_qty,
      sales_qty,
      snapshot_date,
      outlets (branch_code, name, region),
      products (sku, name, category, min_stock)
    `)
        .gt('stock_qty', 0)
        .eq('sales_qty', 0);

    if (error) {
        console.error('Error fetching Z-STOP data:', error);
        process.exit(1);
    }

    if (data.length === 0) {
        console.log('No Z-STOP items found.');
    } else {
        console.log(`🚨 Found ${data.length} Z-STOP Items. Creating System Alerts...\n`);

        const alertsPayload = data.map(item => ({
            alert_type: 'Z-STOP',
            severity: 'CRITICAL',
            message: `Z-STOP ALERT: Product ${item.products.name} (${item.products.sku}) at ${item.outlets.name} has STOCK: ${item.stock_qty} but SALES: 0.`,
            is_resolved: false
        }));

        const { error: alertError } = await supabase
            .from('system_alerts')
            .insert(alertsPayload);

        if (alertError) {
            console.error('❌ Failed to create system alerts:', alertError);
            process.exit(1);
        } else {
            console.log('✅ Successfully inserted alerts into system_alerts table.');
            data.forEach((item, index) => {
                console.log(`${index + 1}. [${item.outlets.branch_code}] ${item.products.name}`);
            });
        }
    }
}

getZStopAnalysis();
