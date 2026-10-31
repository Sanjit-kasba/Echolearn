document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    if (res.ok) {
        alert('Signup successful! Please login.');
        window.location.href = 'login.html';
    } else {
        alert(result.error || 'Signup failed');
    }
});
