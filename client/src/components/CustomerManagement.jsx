import { useState } from 'react';

const emptyCustomer = {
    customer_id: '',
    name: '',
    city: '',
    key_card_or_qr_code: '',
    frequency_segment: 'medium',
    visits: '[]'
};

const fields = [
    ['customer_id', 'Customer ID'],
    ['name', 'Name'],
    ['city', 'City'],
    ['key_card_or_qr_code', 'Key card / QR code'],
    ['frequency_segment', 'Frequency segment'],
    ['visits', 'Visits (JSON array)']
];

export default function CustomerManagement({ mode, onChanged, onClose }) {
    const [query, setQuery] = useState('');
    const [customer, setCustomer] = useState(null);
    const [form, setForm] = useState(emptyCustomer);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const request = async (url, options = {}) => {
        const token = localStorage.getItem('hadaAdminToken');
        const response = await fetch(`http://localhost:5000${url}`, {
            ...options,
            headers: {
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                Authorization: `Bearer ${token}`,
                ...options.headers
            }
        });
        const contentType = response.headers.get('content-type') || '';
        const result = contentType.includes('application/json')
            ? await response.json()
            : { message: `Customer service returned an unexpected response (${response.status}). Restart the backend server and try again.` };
        if (!response.ok) throw new Error(result.message || 'Customer operation failed');
        if (!result || typeof result !== 'object' || !Array.isArray(result.data) && !result.success) {
            throw new Error('Customer service returned an invalid response.');
        }
        return result;
    };

    const findCustomer = async () => {
        if (!query.trim()) return setError('Enter a customer ID or name to search.');
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const result = await request(`/api/admin/customers?search=${encodeURIComponent(query.trim())}`);
            const found = result.data[0];
            if (!found) throw new Error('No matching customer was found.');
            setCustomer(found);
            setForm({ ...emptyCustomer, ...found, visits: JSON.stringify(found.visits || [], null, 2) });
        } catch (operationError) {
            setCustomer(null);
            setError(operationError.message);
        } finally {
            setBusy(false);
        }
    };

    const saveCustomer = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const payload = { ...form, visits: JSON.parse(form.visits || '[]') };
            const id = customer?.customer_id;
            await request(`/api/admin/customers${id ? `/${encodeURIComponent(id)}` : ''}`, {
                method: id ? 'PATCH' : 'POST',
                body: JSON.stringify(payload)
            });
            setMessage(id ? 'Customer information updated.' : 'Customer added successfully.');
            setCustomer(payload);
            onChanged();
        } catch (operationError) {
            setError(operationError.message.includes('JSON') ? 'Visits must be a valid JSON array.' : operationError.message);
        } finally {
            setBusy(false);
        }
    };

    const deleteCustomer = async () => {
        if (!customer || !window.confirm(`Delete customer "${customer.customer_id}"?`)) return;
        setBusy(true);
        setError('');
        try {
            await request(`/api/admin/customers/${encodeURIComponent(customer.customer_id)}`, { method: 'DELETE' });
            setMessage('Customer deleted successfully.');
            setCustomer(null);
            setForm(emptyCustomer);
            setQuery('');
            onChanged();
        } catch (operationError) {
            setError(operationError.message);
        } finally {
            setBusy(false);
        }
    };

    const isCreate = mode === 'add';
    const isDelete = mode === 'delete';
    const isSearch = !isCreate;

    return (
        <div className="customer-modal-backdrop" role="presentation">
            <section className="customer-modal" role="dialog" aria-modal="true" aria-labelledby="customer-modal-title">
                <div className="customer-modal-heading">
                    <h2 id="customer-modal-title">{isCreate ? 'Add customer' : mode === 'view' ? 'View customer' : mode === 'update' ? 'Update customer' : 'Delete customer'}</h2>
                    <button type="button" className="customer-close" onClick={onClose} aria-label="Close">×</button>
                </div>
                {isSearch && (
                    <div className="customer-search">
                        <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && findCustomer()} placeholder="Search by customer ID or name" aria-label="Search customers" />
                        <button type="button" onClick={findCustomer} disabled={busy}>Search</button>
                    </div>
                )}
                {error && <p className="customer-feedback error">{error}</p>}
                {message && <p className="customer-feedback success">{message}</p>}
                {isCreate || (customer && mode === 'update') ? (
                    <form onSubmit={saveCustomer} className="customer-form">
                        {fields.map(([field, label]) => (
                            <label key={field}>{label}
                                {field === 'visits' ? <textarea rows="7" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /> : <input required={field !== 'visits'} readOnly={Boolean(customer && field === 'customer_id')} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />}
                            </label>
                        ))}
                        <button className="customer-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : isCreate ? 'Add customer' : 'Update and save'}</button>
                    </form>
                ) : customer ? (
                    <div className="customer-details">
                        {fields.map(([field, label]) => <div key={field}><strong>{label}</strong><span>{field === 'visits' ? JSON.stringify(customer[field] || []) : customer[field] || '—'}</span></div>)}
                        {isDelete && <button className="customer-delete" type="button" onClick={deleteCustomer} disabled={busy}>{busy ? 'Deleting…' : 'Delete this customer'}</button>}
                    </div>
                ) : !isSearch ? null : <p className="customer-empty">Search for a customer to view their information.</p>}
            </section>
        </div>
    );
}
