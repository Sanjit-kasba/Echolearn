document.addEventListener('DOMContentLoaded', () => {
  const partnerName = localStorage.getItem('partnerName') || 'Partner';
  const partnerId = localStorage.getItem('partnerId');
  const userId = localStorage.getItem('userId');

  document.getElementById('partnerNameDisplay').textContent = partnerName;

  document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const rating = document.querySelector('input[name="rating"]:checked')?.value;
    const comment = document.getElementById('comment').value;

    if (!rating) {
      alert("Please select a rating.");
      return;
    }

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        to: partnerId,
        rating,
        comment
      })
    });

    if (res.ok) {
      alert("Thanks for your feedback!");
      window.location.href = 'dashboard.html';
    } else {
      alert("Something went wrong.");
    }
  });
});
