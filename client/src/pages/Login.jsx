import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('hadaAdminToken', data.token);
                localStorage.setItem('hadaAdminName', data.admin.name);
                navigate('/dashboard');
            } else {
                setError(data.message);
            }
        } catch {
            setError('Connection to backend failed');
        }
    };

    return (
        <div className="login-page flex h-screen items-center justify-center bg-stone-100">
            <div className="login-ambient login-ambient-one" />
            <div className="login-ambient login-ambient-two" />
            <form onSubmit={handleLogin} className="login-panel w-96 rounded-lg bg-white p-8 shadow-md border-t-4 border-emerald-600">
                <h2 className="mb-2 text-2xl font-bold text-stone-800">Hadabima NoSQL Admin</h2>
                <p className="mb-6 text-sm text-stone-500">Sign in to review database analytics & insights</p>
                {error && <div className="login-error mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

                <div className="mb-4">
                    <label className="block text-xs font-bold uppercase text-stone-600">Username</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 w-full rounded border p-2 text-sm outline-none focus:border-emerald-600"
                        required 
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold uppercase text-stone-600">Password</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full rounded border p-2 text-sm outline-none focus:border-emerald-600"
                        required 
                    />
                </div>

                <button type="submit" className="w-full rounded bg-emerald-600 p-2.5 font-bold text-white transition hover:bg-emerald-700">
                    Authenticate
                </button>
            </form>
        </div>
    );
}
