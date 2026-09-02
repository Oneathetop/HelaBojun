import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    const [revenueData, setRevenueData] = useState(null);
    const [segments, setSegments] = useState(null);
    const [geographic, setGeographic] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('hadaAdminToken');

            if (!token) {
                localStorage.clear();
                navigate('/login');
                return;
            }

            const headers = { Authorization: 'Bearer ' + token };

            try {
                const [revRes, segRes, geoRes] = await Promise.all([
                    fetch('http://localhost:5000/api/analytics/revenue', { headers }),
                    fetch('http://localhost:5000/api/analytics/segmentation', { headers }),
                    fetch('http://localhost:5000/api/analytics/geographic-insights', { headers })
                ]);

                if (revRes.status === 401 || segRes.status === 401 || geoRes.status === 401) {
                    localStorage.clear();
                    navigate('/login');
                    return;
                }

                const revJson = await revRes.json();
                const segJson = await segRes.json();
                const geoJson = await geoRes.json();

                if (revJson.success) setRevenueData(revJson);
                if (segJson.success) setSegments(segJson);
                if (geoJson.success) setGeographic(geoJson.data);

                setLoading(false);
            } catch (err) {
                console.error('Failed to load dashboard data', err);
                localStorage.clear();
                navigate('/login');
            }
        };

        fetchDashboardData();
    }, [navigate]);

    if (loading) return <div className="flex h-screen items-center justify-center font-bold text-emerald-700">Loading Hadabima Analytics Engine...</div>;

    return (
        <div className="min-h-screen bg-stone-50 text-stone-800">
            {/* Header */}
            <header className="flex items-center justify-between bg-emerald-800 px-8 py-4 text-white shadow-md">
                <div>
                    <h1 className="text-xl font-bold">Hadabima NoSQL Management</h1>
                    <p className="text-xs text-emerald-200">Logged in as {localStorage.getItem('hadaAdminName') || 'SysAdmin'}</p>
                </div>
                <button onClick={handleLogout} className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold hover:bg-emerald-600 transition">
                    Logout
                </button>
            </header>

            {/* Dashboard Content */}
            <main className="mx-auto max-w-7xl p-8">
                {/* Stats Summary Cards */}
                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-emerald-500">
                        <h4 className="text-sm font-semibold uppercase text-stone-500">Gross Total Revenue</h4>
                        <p className="text-3xl font-extrabold text-stone-900 mt-2">LKR {revenueData?.total_revenue?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-amber-500">
                        <h4 className="text-sm font-semibold uppercase text-stone-500">High-Frequency Cohort</h4>
                        <p className="text-3xl font-extrabold text-stone-900 mt-2">{segments?.high_frequency_count || 0} Customers</p>
                    </div>
                    <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-red-500">
                        <h4 className="text-sm font-semibold uppercase text-stone-500">Low-Frequency Cohort</h4>
                        <p className="text-3xl font-extrabold text-stone-900 mt-2">{segments?.low_frequency_count || 0} Customers</p>
                    </div>
                </div>

                {/* Main Visual Sections */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* Monthly Revenue Chart representation */}
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-bold text-stone-700">Monthly Revenue Distribution</h3>
                        <div className="space-y-4">
                            {revenueData?.monthly_breakdown?.map((month) => (
                                <div key={month._id} className="flex items-center">
                                    <span className="w-16 text-sm font-bold text-stone-600">Month {month._id}</span>
                                    <div className="mr-4 flex-1 h-4 rounded bg-stone-100 overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-600 rounded"
                                            style={{ width: `${(month.monthly_revenue / (revenueData.total_revenue || 1)) * 200}%` }}
                                        ></div>
                                    </div>
                                    <span className="w-28 text-right text-sm font-bold text-stone-800">LKR {month.monthly_revenue?.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Regional Market Expansions */}
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-bold text-stone-700">Provincial Cuisine Preferences</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b-2 border-stone-100 text-stone-500">
                                        <th className="pb-2">City</th>
                                        <th className="pb-2">Favorite Food Item</th>
                                        <th className="pb-2 text-right">Volume</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {geographic.map((geo, idx) => (
                                        <tr key={idx} className="border-b border-stone-50 hover:bg-stone-50/50">
                                            <td className="py-3 font-semibold text-stone-800">{geo.city}</td>
                                            <td className="py-3 text-stone-600">{geo.top_items?.[0]?.product_name || 'N/A'}</td>
                                            <td className="py-3 text-right font-bold text-emerald-700">{geo.top_items?.[0]?.quantity || 0} units</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* High frequency list for tracking */}
                <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-stone-700">
                        Frequent Customers ({'>='} 6 visits/month)
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {segments?.high_frequency_list.map((cust, i) => (
                            <div key={i} className="flex items-center justify-between rounded border border-stone-100 bg-stone-50/50 p-4">
                                <div>
                                    <h4 className="font-bold text-stone-800">{cust._id.name}</h4>
                                    <p className="text-xs text-stone-500">ID: {cust._id.customer_id}</p>
                                </div>
                                <span className="rounded bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-extrabold">
                                    {cust.avg_visits_per_month.toFixed(1)} visits/mo
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
