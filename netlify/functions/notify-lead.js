exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let data;
    try {
        data = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, body: 'Invalid JSON' };
    }

    const name = (data.name || '').toString().slice(0, 200);
    const phone = (data.phone || '').toString().slice(0, 60);
    const email = (data.email || '').toString().slice(0, 200);
    const source = (data.source || 'launchflow-ai').toString().slice(0, 100);

    if (!name || !phone) {
        return { statusCode: 400, body: 'Missing required fields' };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const NOTIFY_TO = process.env.LEAD_NOTIFY_EMAIL || 'eliazasulin@gmail.com';

    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set');
        return { statusCode: 500, body: 'Email not configured' };
    }

    const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1E3A8A;">ליד חדש מ-Launchflow 🎉</h2>
            <table style="width:100%; border-collapse: collapse;">
                <tr><td style="padding:8px 0; color:#666;">שם</td><td style="padding:8px 0; font-weight:bold;">${escapeHtml(name)}</td></tr>
                <tr><td style="padding:8px 0; color:#666;">טלפון</td><td style="padding:8px 0; font-weight:bold;">${escapeHtml(phone)}</td></tr>
                <tr><td style="padding:8px 0; color:#666;">מייל</td><td style="padding:8px 0; font-weight:bold;">${escapeHtml(email || '-')}</td></tr>
                <tr><td style="padding:8px 0; color:#666;">מקור</td><td style="padding:8px 0;">${escapeHtml(source)}</td></tr>
            </table>
            <p style="margin-top:16px;"><a href="https://wa.me/972${escapeHtml(phone.replace(/\D/g, '').replace(/^0/, ''))}" style="color:#25d366;">פתח וואטסאפ עם הליד</a></p>
        </div>
    `;

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Launchflow Leads <leads@launchflow.ink>',
                to: [NOTIFY_TO],
                subject: `ליד חדש: ${name}`,
                html
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('Resend error:', res.status, errText);
            return { statusCode: 502, body: 'Failed to send email' };
        }

        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
        console.error('notify-lead error:', err);
        return { statusCode: 500, body: 'Internal error' };
    }
};
