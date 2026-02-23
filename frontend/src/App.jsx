import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import {
    Building2,
    LayoutDashboard,
    TrendingUp,
    AlertTriangle,
    Shield,
    Menu,
    Bell,
    UserCircle,
    Target,
    Activity,
    Zap,
    Eye,
    ExternalLink,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

// ============================================================
// HELPERS
// ============================================================
function getDateFilter(days = 7) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
}

// ============================================================
// COMPONENTS
// ============================================================

function Sidebar({ activeTab, setActiveTab }) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'radar', label: 'Market Radar', icon: TrendingUp },
        { id: 'sentiment', label: 'Sentiment Map', icon: Activity },
    ];

    return (
        <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex-col hidden md:flex z-50">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-alpro-500 rounded-lg flex items-center justify-center">
                    <Target className="text-white w-5 h-5" />
                </div>
                <div>
                    <span className="font-bold text-lg text-gray-800">Alpro Intel</span>
                    <p className="text-[10px] text-gray-400 -mt-1">Strategic Hub</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === item.id
                            ? 'bg-alpro-50 text-alpro-600 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
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
                        <span className="text-sm font-medium text-gray-700">Hendri</span>
                        <span className="text-xs text-gray-400">Ops Manager</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Stat Cards ---
function StatCard({ title, value, icon: Icon, subtitle, color = 'alpro' }) {
    const colorMap = {
        alpro: { bg: 'bg-alpro-50', text: 'text-alpro-600' },
        red: { bg: 'bg-red-50', text: 'text-red-600' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
        green: { bg: 'bg-green-50', text: 'text-green-600' },
    };
    const c = colorMap[color] || colorMap.alpro;

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
                    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-2.5 rounded-lg ${c.bg}`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
            </div>
        </div>
    );
}

// --- Smart Strategic Alerts (Score > 9, last 7 days) ---
function StrategicAlertsWidget() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAlerts() {
            const { data, error } = await supabase
                .from('market_trends')
                .select('*')
                .eq('is_viral', true)
                .gte('detected_at', getDateFilter(7))
                .order('detected_at', { ascending: false })
                .limit(8);

            if (!error) setAlerts(data || []);
            setLoading(false);
        }
        fetchAlerts();
    }, []);

    const getCategoryStyle = (cat) => {
        const styles = {
            'COMPETITOR_MOVE': { bg: 'bg-blue-50', text: 'text-blue-700', icon: '🏢' },
            'REGULATORY_CHANGE': { bg: 'bg-amber-50', text: 'text-amber-700', icon: '📋' },
            'PUBLIC_HEALTH_ISSUE': { bg: 'bg-red-50', text: 'text-red-700', icon: '🦠' },
            'PRODUCT_SAFETY': { bg: 'bg-purple-50', text: 'text-purple-700', icon: '⚠️' },
        };
        return styles[cat] || { bg: 'bg-gray-50', text: 'text-gray-700', icon: '📰' };
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-alpro-500" />
                    Smart Strategic Alerts
                </h3>
                <span className="text-[10px] font-bold px-2 py-1 bg-alpro-50 text-alpro-600 rounded-full uppercase tracking-wider">
                    Score 9+ • 7 Hari
                </span>
            </div>

            <div className="divide-y divide-gray-50">
                {loading ? (
                    <div className="p-6 text-center text-gray-400">Loading intelligence...</div>
                ) : alerts.length === 0 ? (
                    <div className="p-8 text-center">
                        <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No critical alerts in the last 7 days.</p>
                        <p className="text-xs text-gray-300 mt-1">Radar is actively scanning...</p>
                    </div>
                ) : (
                    alerts.map((alert) => {
                        const style = getCategoryStyle(alert.source_type);
                        return (
                            <div key={alert.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <span className="text-lg mt-0.5">{style.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text} uppercase`}>
                                                {alert.source_type?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                                            {alert.source_url ? (
                                                <a href={alert.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-alpro-600 hover:underline inline-flex items-center gap-1">
                                                    {alert.title}
                                                    <ExternalLink className="w-3 h-3 inline-block flex-shrink-0" />
                                                </a>
                                            ) : alert.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{alert.summary}</p>
                                        <span className="text-[10px] text-gray-300 mt-2 block">
                                            {new Date(alert.detected_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// --- Market Radar Cards (with Pagination, last 7 days) ---
function MarketRadarWidget() {
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 6;

    useEffect(() => {
        async function fetchTrends() {
            setLoading(true);
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            // Get total count
            const { count } = await supabase
                .from('market_trends')
                .select('*', { count: 'exact', head: true })
                .gte('detected_at', getDateFilter(7));

            setTotalCount(count || 0);

            // Get paginated data
            const { data, error } = await supabase
                .from('market_trends')
                .select('*')
                .gte('detected_at', getDateFilter(7))
                .order('detected_at', { ascending: false })
                .range(from, to);

            if (!error) setTrends(data || []);
            setLoading(false);
        }
        fetchTrends();
    }, [page]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const getCategoryColor = (cat) => {
        const map = {
            'COMPETITOR_MOVE': 'border-l-blue-500',
            'REGULATORY_CHANGE': 'border-l-amber-500',
            'PUBLIC_HEALTH_ISSUE': 'border-l-red-500',
            'PRODUCT_SAFETY': 'border-l-purple-500',
        };
        return map[cat] || 'border-l-gray-300';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-alpro-600" />
                        Intelligence Feed
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Data 7 hari terakhir • {totalCount} items</p>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-gray-500 font-medium">{page + 1} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {loading ? (
                    <p className="text-gray-400">Scanning...</p>
                ) : trends.length === 0 ? (
                    <div className="col-span-3 p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed">
                        No intelligence items in the last 7 days.
                    </div>
                ) : (
                    trends.map((trend) => (
                        <div key={trend.id} className={`bg-white p-4 rounded-xl border border-gray-100 border-l-4 ${getCategoryColor(trend.source_type)} shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    {trend.source_type?.replace(/_/g, ' ')}
                                </span>
                                {trend.is_viral && (
                                    <span className="text-[10px] font-bold text-red-500 animate-pulse">🔴 CRITICAL</span>
                                )}
                            </div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                                {trend.source_url ? (
                                    <a href={trend.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-alpro-600 hover:underline inline-flex items-center gap-1">
                                        {trend.title}
                                        <ExternalLink className="w-3 h-3 inline-block flex-shrink-0" />
                                    </a>
                                ) : trend.title}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{trend.summary}</p>
                            <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[10px] text-gray-300">
                                <span>{new Date(trend.detected_at).toLocaleDateString('id-ID')}</span>
                                <span className="font-medium text-alpro-500">Impact: {Math.round(trend.sentiment_score * 10)}/10</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// --- Competitor Sentiment Map ---
function CompetitorSentimentWidget() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCompetitorData() {
            const { data: items, error } = await supabase
                .from('market_trends')
                .select('*')
                .eq('source_type', 'COMPETITOR_MOVE')
                .gte('detected_at', getDateFilter(7))
                .order('detected_at', { ascending: false })
                .limit(20);

            if (!error && items) {
                const competitors = ['Kimia Farma', 'K24', 'Guardian', 'Watson', 'Roxy'];
                const sentimentMap = competitors.map(name => {
                    const mentions = items.filter(i => i.title?.toLowerCase().includes(name.toLowerCase()));
                    const avgSentiment = mentions.length > 0
                        ? mentions.reduce((sum, m) => sum + (m.sentiment_score || 0), 0) / mentions.length
                        : 0;
                    return { name, mentions: mentions.length, sentiment: avgSentiment };
                });
                setData(sentimentMap);
            }
            setLoading(false);
        }
        fetchCompetitorData();
    }, []);

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-alpro-600" />
                Competitor Radar
            </h3>
            <p className="text-[10px] text-gray-300 mb-4">7 hari terakhir</p>

            {loading ? (
                <p className="text-sm text-gray-400">Scanning competitor data...</p>
            ) : (
                <div className="space-y-3">
                    {data.map((comp) => (
                        <div key={comp.name} className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-700 w-24 truncate">{comp.name}</span>
                            <div className="flex-1">
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-500 ${comp.sentiment > 0.5 ? 'bg-green-500' : comp.sentiment > 0.3 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${Math.max(comp.sentiment * 100, 5)}%` }}
                                    ></div>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-400 w-14 text-right">
                                {comp.mentions} news
                            </span>
                        </div>
                    ))}

                    <div className="pt-3 mt-2 border-t border-gray-50">
                        <p className="text-[10px] text-gray-300 text-center">Based on AI-analyzed news mentions</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Customer Sentiment Widget ---
function SentimentWidget() {
    const [stats, setStats] = useState({ positive: 0, stock: 0, service: 0, total: 0 });
    const [recentReviews, setRecentReviews] = useState({ positive: [], stock: [], service: [] });
    const [loading, setLoading] = useState(true);
    const [expandedCategory, setExpandedCategory] = useState(null);

    useEffect(() => {
        async function fetchSentiments() {
            const { data, error } = await supabase
                .from('review_sentiments')
                .select('*')
                .gte('created_at', getDateFilter(7))
                .order('created_at', { ascending: false });

            if (!error && data) {
                const counts = { POSITIVE: 0, STOK_ISSUE: 0, SERVICE_ISSUE: 0 };
                const recent = { positive: [], stock: [], service: [] };

                data.forEach(item => {
                    counts[item.sentiment_category] = (counts[item.sentiment_category] || 0) + 1;

                    if (item.sentiment_category === 'POSITIVE' && recent.positive.length < 2) recent.positive.push(item);
                    if (item.sentiment_category === 'STOK_ISSUE' && recent.stock.length < 2) recent.stock.push(item);
                    if (item.sentiment_category === 'SERVICE_ISSUE' && recent.service.length < 2) recent.service.push(item);
                });

                setStats({
                    positive: counts['POSITIVE'] || 0,
                    stock: counts['STOK_ISSUE'] || 0,
                    service: counts['SERVICE_ISSUE'] || 0,
                    total: data.length
                });
                setRecentReviews(recent);
            }
            setLoading(false);
        }
        fetchSentiments();
    }, []);

    const getPercent = (val) => stats.total === 0 ? 0 : Math.round((val / stats.total) * 100);

    const toggleExpand = (cat) => {
        setExpandedCategory(expandedCategory === cat ? null : cat);
    };

    const ReviewList = ({ reviews }) => (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-gray-100">
            {reviews.length === 0 ? (
                <p className="text-[10px] text-gray-400">No recent reviews available.</p>
            ) : (
                reviews.map(r => (
                    <div key={r.id} className="bg-gray-50 p-2 rounded text-[10px]">
                        <p className="font-medium text-gray-800">"{r.comment}"</p>
                        <p className="text-gray-400 mt-1 flex justify-between">
                            <span>{r.reviewer_name} • ★ {r.rating}</span>
                            <span>{new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                        </p>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Activity className="w-5 h-5 text-alpro-600" />
                Customer Pulse
            </h3>
            <p className="text-[10px] text-gray-400 mb-4">7 hari terakhir</p>

            {loading ? (
                <p className="text-sm text-gray-400">Loading...</p>
            ) : stats.total === 0 ? (
                <div className="text-center text-gray-400 py-6">
                    <p className="text-sm">No reviews analyzed yet.</p>
                    <p className="text-xs mt-1">Connect a review source to start</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Positive */}
                    <div>
                        <div
                            className="flex justify-between text-xs mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded"
                            onClick={() => toggleExpand('positive')}
                        >
                            <span className="text-gray-500 font-medium">Positive <span className="text-[10px] text-gray-400 ml-1">(click for details)</span></span>
                            <span className="font-bold text-green-600">{getPercent(stats.positive)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${getPercent(stats.positive)}%` }}></div>
                        </div>
                        {expandedCategory === 'positive' && <ReviewList reviews={recentReviews.positive} />}
                    </div>

                    {/* Stock Issues */}
                    <div>
                        <div
                            className="flex justify-between text-xs mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded"
                            onClick={() => toggleExpand('stock')}
                        >
                            <span className="text-gray-500 font-medium">Stock Issues <span className="text-[10px] text-gray-400 ml-1">(click for details)</span></span>
                            <span className="font-bold text-red-600">{getPercent(stats.stock)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${getPercent(stats.stock)}%` }}></div>
                        </div>
                        {expandedCategory === 'stock' && <ReviewList reviews={recentReviews.stock} />}
                    </div>

                    {/* Service Issues */}
                    <div>
                        <div
                            className="flex justify-between text-xs mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded"
                            onClick={() => toggleExpand('service')}
                        >
                            <span className="text-gray-500 font-medium">Service Issues <span className="text-[10px] text-gray-400 ml-1">(click for details)</span></span>
                            <span className="font-bold text-alpro-500">{getPercent(stats.service)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-alpro-500 h-2 rounded-full transition-all" style={{ width: `${getPercent(stats.service)}%` }}></div>
                        </div>
                        {expandedCategory === 'service' && <ReviewList reviews={recentReviews.service} />}
                    </div>

                    <div className="pt-3 border-t border-gray-50 text-center">
                        <span className="text-[10px] text-gray-300">{stats.total} reviews analyzed by AI in last 7 days</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Overview Stats (last 7 days) ---
function OverviewStats() {
    const [stats, setStats] = useState({ trends: 0, alerts: 0, reviews: 0 });

    useEffect(() => {
        async function fetchStats() {
            const sevenDaysAgo = getDateFilter(7);

            const { count: trendsCount } = await supabase
                .from('market_trends')
                .select('*', { count: 'exact', head: true })
                .gte('detected_at', sevenDaysAgo);

            const { count: alertsCount } = await supabase
                .from('market_trends')
                .select('*', { count: 'exact', head: true })
                .eq('is_viral', true)
                .gte('detected_at', sevenDaysAgo);

            const { count: reviewsCount } = await supabase
                .from('review_sentiments')
                .select('*', { count: 'exact', head: true });

            setStats({
                trends: trendsCount || 0,
                alerts: alertsCount || 0,
                reviews: reviewsCount || 0
            });
        }
        fetchStats();
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
                title="Intelligence (7d)"
                value={stats.trends}
                icon={TrendingUp}
                subtitle="Last 7 days"
                color="blue"
            />
            <StatCard
                title="Critical Alerts"
                value={stats.alerts}
                icon={AlertTriangle}
                subtitle="Score 9+ (7 days)"
                color="red"
            />
            <StatCard
                title="Reviews Analyzed"
                value={stats.reviews}
                icon={Activity}
                subtitle="AI-classified"
                color="green"
            />
        </div>
    );
}

// ============================================================
// MAIN LAYOUT
// ============================================================
function App() {
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Mobile Header */}
            <div className="md:hidden bg-white p-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-alpro-500 rounded-lg flex items-center justify-center">
                        <Target className="text-white w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg">Alpro Intel</span>
                </div>
                <button className="text-gray-600"><Menu /></button>
            </div>

            <main className="md:ml-64 p-4 md:p-8">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Strategic Dashboard</h1>
                        <p className="text-xs text-gray-400">Real-time intelligence • Auto-updated daily 08:00 WIB</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-gray-400 hover:text-alpro-600 transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
                    </div>
                </header>

                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <OverviewStats />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <StrategicAlertsWidget />
                                <MarketRadarWidget />
                            </div>
                            <div className="space-y-6">
                                <CompetitorSentimentWidget />
                                <SentimentWidget />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'radar' && (
                    <div className="space-y-6">
                        <MarketRadarWidget />
                    </div>
                )}

                {activeTab === 'sentiment' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SentimentWidget />
                        <CompetitorSentimentWidget />
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
