import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function getAttendancePieGradient(attendanceByCity, colors, totalAttendance) {
    return attendanceByCity.reduce((segments, city, index) => {
        const start = segments.offset;
        const end = start + (city.attendance_count / totalAttendance) * 100;

        segments.parts.push(`${colors[index % colors.length]} ${start}% ${end}%`);
        segments.offset = end;
        return segments;
    }, { parts: [], offset: 0 }).parts.join(', ');
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [revenueData, setRevenueData] = useState(null);
    const [segments, setSegments] = useState(null);
    const [attendanceByCity, setAttendanceByCity] = useState([]);
    const [geographic, setGeographic] = useState([]);
    const [frequentPreferences, setFrequentPreferences] = useState([]);
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
                const [revRes, segRes, attendanceRes, geoRes, preferencesRes] = await Promise.all([
                    fetch('http://localhost:5000/api/analytics/revenue', { headers }),
                    fetch('http://localhost:5000/api/analytics/segmentation', { headers }),
                    fetch('http://localhost:5000/api/analytics/attendance-by-city', { headers }),
                    fetch('http://localhost:5000/api/analytics/geographic-insights', { headers }),
                    fetch('http://localhost:5000/api/analytics/frequent-preferences', { headers })
                ]);

                if ([revRes, segRes, attendanceRes, geoRes, preferencesRes].some((response) => response.status === 401)) {
                    localStorage.clear();
                    navigate('/login');
                    return;
                }

                const revJson = await revRes.json();
                const segJson = await segRes.json();
                const attendanceJson = await attendanceRes.json();
                const geoJson = await geoRes.json();
                const preferencesJson = await preferencesRes.json();

                if (revJson.success) setRevenueData(revJson);
                if (segJson.success) setSegments(segJson);
                if (attendanceJson.success) setAttendanceByCity(attendanceJson.data);
                if (geoJson.success) setGeographic(geoJson.data);
                if (preferencesJson.success) setFrequentPreferences(preferencesJson.data);

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

    const foodByVolume = [...geographic].sort(
        (left, right) => (right.top_items?.[0]?.quantity || 0) - (left.top_items?.[0]?.quantity || 0)
    );
    const highestFoodVolume = foodByVolume[0]?.top_items?.[0]?.quantity || 1;
    const totalAttendance = attendanceByCity.reduce((total, city) => total + city.attendance_count, 0);
    const pieColors = ['#047857', '#059669', '#34d399', '#f59e0b', '#f97316', '#dc2626', '#7c3aed', '#2563eb'];

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

                    {/* Attendance by city */}
                    <div className="attendance-card rounded-lg bg-white p-6 shadow-sm">
                        <div className="attendance-card-header">
                            <div>
                                <h3 className="text-lg font-bold text-stone-700">Attendance by City</h3>
                                <p className="text-sm text-stone-500">Recorded visits, highest to lowest</p>
                            </div>
                            <span className="attendance-total">
                                {attendanceByCity.reduce((total, city) => total + city.attendance_count, 0).toLocaleString()} visits
                            </span>
                        </div>
                        <div className="attendance-pie-layout" aria-label="Attendance by city pie chart">
                            {attendanceByCity.length === 0 ? (
                                <p className="text-sm text-stone-500">No attendance data available.</p>
                            ) : (
                                <>
                                    <div
                                        className="attendance-pie"
                                        style={{
                                            background: `conic-gradient(${getAttendancePieGradient(attendanceByCity, pieColors, totalAttendance)})`
                                        }}
                                        role="img"
                                        aria-label={`Attendance distribution across ${attendanceByCity.length} cities`}
                                    >
                                        <div className="attendance-pie-hole">
                                            <strong>{totalAttendance.toLocaleString()}</strong>
                                            <span>visits</span>
                                        </div>
                                    </div>
                                    <div className="attendance-legend">
                                        {attendanceByCity.map((city, index) => (
                                            <div className="attendance-legend-row" key={city.city}>
                                                <span className="attendance-legend-city">
                                                    <i style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                                                    {city.city}
                                                </span>
                                                <strong>{city.attendance_count.toLocaleString()}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* City food preferences */}
                <div className="food-visualization-card mt-8 rounded-lg bg-white p-6 shadow-sm">
                    <div className="attendance-card-header">
                        <div>
                            <h3 className="text-lg font-bold text-stone-700">Top Food Item by City</h3>
                            <p className="text-sm text-stone-500">Most purchased item in each city, ranked by volume</p>
                        </div>
                    </div>
                    <div className="food-list" aria-label="Top food item and volume by city">
                        {geographic.length === 0 ? (
                            <p className="text-sm text-stone-500">No food preference data available.</p>
                        ) : foodByVolume.map((city) => {
                            const topItem = city.top_items?.[0];
                            const volume = topItem?.quantity || 0;

                            return (
                                <div className="food-row" key={city.city}>
                                    <div className="food-row-label">
                                        <span className="font-semibold text-stone-800">{city.city}</span>
                                        <span className="text-stone-600">{topItem?.product_name || 'N/A'}</span>
                                        <span className="font-bold text-amber-700">{volume.toLocaleString()} units</span>
                                    </div>
                                    <div className="food-track">
                                        <div className="food-bar" style={{ width: `${(volume / highestFoodVolume) * 100}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* High frequency list for tracking */}
                <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-stone-700">
                        Frequent Customers ({'>='} 6 visits/month)
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {segments?.high_frequency_list.map((cust, i) => {
                            const preferences = frequentPreferences.find((item) => item.customer_id === cust._id.customer_id);

                            return (
                            <div key={i} className="frequent-customer-card rounded border border-stone-100 bg-stone-50/50 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-stone-800">{cust._id.name}</h4>
                                        <p className="text-xs text-stone-500">ID: {cust._id.customer_id}</p>
                                    </div>
                                    <span className="rounded bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-extrabold">
                                        {cust.avg_visits_per_month.toFixed(1)} visits/mo
                                    </span>
                                </div>
                                <div className="frequent-items">
                                    <p className="frequent-items-title">Food purchased</p>
                                    {preferences?.top_preferences?.length ? preferences.top_preferences.map((item) => (
                                        <div className="frequent-item-row" key={item.item}>
                                            <span>{item.item}</span>
                                            <strong>{item.quantity_bought.toLocaleString()} units</strong>
                                        </div>
                                    )) : <span className="text-xs text-stone-500">No purchases recorded</span>}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
