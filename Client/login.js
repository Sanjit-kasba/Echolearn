document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    if (res.ok) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('userId', result.userId);
        window.location.href = 'dashboard.html';
    } else {
        alert(result.error || 'Login failed');
    }
});
