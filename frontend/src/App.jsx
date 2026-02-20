
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import {
    Building2,
    LayoutDashboard,
    TrendingUp,
    AlertTriangle,
    Package,
    Menu,
    Bell,
    Search,
    UserCircle
} from 'lucide-react';

// --- Components ---

function Sidebar({ activeTab, setActiveTab }) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'market-radar', label: 'Market Radar', icon: TrendingUp },
    ];

    return (
        <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col hidden md:flex z-50">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-alpro-500 rounded-lg flex items-center justify-center">
                    <Building2 className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-xl text-gray-800">Alpro Hub</span>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id
                            ? 'bg-alpro-50 text-alpro-600'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-3 px-4 py-2">
                    <UserCircle className="w-8 h-8 text-gray-400" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">Hendri (Ops)</span>
                        <span className="text-xs text-gray-500">Manager</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, trend, color = "blue" }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg bg-${color}-50`}>
                    <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
            </div>
            {trend && (
                <div className="mt-4 flex items-center text-xs">
                    <span className="text-green-600 font-medium flex items-center">
                        {trend}
                    </span>
                    <span className="text-gray-400 ml-2">vs last month</span>
                </div>
            )}
        </div>
    );
}

function ZStopWidget() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAlerts() {
            // In a real app, we would join with outlets table. For now fetching raw alerts.
            // Simulating a join or fetching from system_alerts
            const { data, error } = await supabase
                .from('system_alerts')
                .select('*')
                .eq('alert_type', 'Z-STOP')
                .eq('severity', 'CRITICAL')
                .order('created_at', { ascending: false })
                .limit(10);

            if (!error) setAlerts(data || []);
            setLoading(false);
        }
        fetchAlerts();
    }, []);

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Z-STOP Alerts (Critical)
                </h3>
                <span className="text-xs font-medium px-2 py-1 bg-red-50 text-red-600 rounded-full">
                    Live Realtime
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">Message</th>
                            <th className="px-6 py-3">Sev</th>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="text-center py-4">Loading...</td></tr>
                        ) : alerts.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-4 text-gray-500">No critical alerts today.</td></tr>
                        ) : (
                            alerts.map((alert) => (
                                <tr key={alert.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate" title={alert.message}>
                                        {alert.message}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-bold">
                                            {alert.severity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-alpro-600 font-medium hover:underline">
                                            Investigate
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MarketRadarWidget() {
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTrends() {
            const { data, error } = await supabase
                .from('market_trends')
                .select('*')
                .gt('is_viral', 'true') // Filter high impact / viral
                .order('detected_at', { ascending: false })
                .limit(9);

            if (!error) setTrends(data || []);
            setLoading(false);
        }
        fetchTrends();
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-alpro-600" />
                        Market Radar
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">AI-detected high impact trends (Score &gt; 8)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <p>Loading Radar...</p>
                ) : trends.length === 0 ? (
                    <div className="col-span-3 p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed">
                        No viral trends detected yet.
                    </div>
                ) : (
                    trends.map((trend) => (
                        <div key={trend.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <span className="px-2 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded uppercase">
                                    {trend.source_type}
                                </span>
                                {trend.is_viral && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-red-500 animate-pulse">
                                        🔥 Viral
                                    </span>
                                )}
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2 line-clamp-2" title={trend.title}>
                                {trend.title}
                            </h4>
                            <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                                {trend.summary}
                            </p>
                            <div className="pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
                                <span>{new Date(trend.detected_at).toLocaleDateString()}</span>
                                <span className="font-medium text-alpro-600">Impact: High</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function OverviewWidgets() {
    const [stats, setStats] = useState({ outlets: 0, alerts: 0, products: 0 });

    useEffect(() => {
        async function fetchStats() {
            // Mocking optimistic counts for now to speed up UI dev
            // In real world, use count() queries
            const { count: outletsCount } = await supabase.from('outlets').select('*', { count: 'exact', head: true });
            const { count: alertsCount } = await supabase.from('system_alerts').select('*', { count: 'exact', head: true }).eq('is_resolved', false);
            const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true });

            setStats({
                outlets: outletsCount || 0,
                alerts: alertsCount || 0,
                products: productsCount || 0
            });
        }
        fetchStats();
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
                title="Total Outlets"
                value={stats.outlets}
                icon={Building2}
                color="blue"
            />
            <StatCard
                title="Active Alerts"
                value={stats.alerts}
                icon={AlertTriangle}
                color="red"
            />
            <StatCard
                title="Total Products"
                value={stats.products}
                icon={Package}
                color="orange"
            />
        </div>
    );
}

// ... (previous code)

function SentimentWidget() {
    const [stats, setStats] = useState({ positive: 0, stock: 0, service: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSentiments() {
            // Fetch aggregated counts
            const { data, error } = await supabase
                .from('review_sentiments')
                .select('sentiment_category');

            if (!error && data) {
                const counts = data.reduce((acc, curr) => {
                    acc[curr.sentiment_category] = (acc[curr.sentiment_category] || 0) + 1;
                    return acc;
                }, {});

                const total = data.length;
                setStats({
                    positive: counts['POSITIVE'] || 0,
                    stock: counts['STOK_ISSUE'] || 0,
                    service: counts['SERVICE_ISSUE'] || 0,
                    total
                });
            }
            setLoading(false);
        }
        fetchSentiments();
    }, []);

    const getPercent = (val) => stats.total === 0 ? 0 : Math.round((val / stats.total) * 100);

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-alpro-600" />
                Customer Sentiment
            </h3>

            {loading ? (
                <p>Loading...</p>
            ) : stats.total === 0 ? (
                <div className="text-center text-gray-500 py-8">No reviews analyzed yet.</div>
            ) : (
                <div className="space-y-4">
                    {/* Positive */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Positive Experience</span>
                            <span className="font-bold text-green-600">{getPercent(stats.positive)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${getPercent(stats.positive)}%` }}></div>
                        </div>
                    </div>

                    {/* Stock Issues */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Stock Issues</span>
                            <span className="font-bold text-red-600">{getPercent(stats.stock)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${getPercent(stats.stock)}%` }}></div>
                        </div>
                    </div>

                    {/* Service Issues */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Service Issues</span>
                            <span className="font-bold text-orange-600">{getPercent(stats.service)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${getPercent(stats.service)}%` }}></div>
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-50 text-center">
                        <span className="text-xs text-gray-400">Based on {stats.total} AI-analyzed reviews</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Main Layout ---
function App() {
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Mobile Header */}
            <div className="md:hidden bg-white p-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-alpro-500 rounded-lg flex items-center justify-center">
                        <Building2 className="text-white w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg">Alpro Hub</span>
                </div>
                <button className="text-gray-600"><Menu /></button>
            </div>

            <main className="md:ml-64 p-4 md:p-8">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                        <p className="text-gray-500">Welcome back, Hendri!</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-gray-400 hover:text-alpro-600 transition-colors relative">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
                    </div>
                </header>

                {activeTab === 'dashboard' && (
                    <div className="space-y-8">
                        <OverviewWidgets />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <ZStopWidget />
                                <MarketRadarWidget />
                            </div>
                            <div>
                                <SentimentWidget />
                            </div>
                        </div>
                    </div>
                )} // ... (rest of the code)

                {activeTab !== 'dashboard' && (
                    <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                        <p className="text-gray-500">Module <strong>{activeTab}</strong> is under construction.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
