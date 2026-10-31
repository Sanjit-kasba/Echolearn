document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = 'login.html';
    return;
  }

  loadUserSkills(userId);

  document.getElementById('matchForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const skillsHave = Array.from(document.getElementById('skillsHave').selectedOptions).map(opt => opt.value);
    const skillsWant = document.getElementById('skillsWant').value
      .split(',')
      .map(skill => skill.trim())
      .filter(Boolean);

    const matchResult = document.getElementById('matchResult');

    let result;
    try {
      const res = await fetch('/api/match/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, skillsHave, skillsWant })
      });
      result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Request failed');
    } catch (err) {
      matchResult.textContent = 'Something went wrong. Please try again.';
      return;
    }

    if (result.perfectMatch) {
      localStorage.setItem('partnerId', result.partnerId);
      localStorage.setItem('partnerName', result.partnerName);
      window.location.href = 'chat.html';
    } else if (result.similarMatches && result.similarMatches.length > 0) {
      const top = result.similarMatches[0];

      // build with DOM APIs (not innerHTML) so names can't break the page
      matchResult.textContent = '';

      const heading = document.createElement('h4');
      heading.textContent = 'No perfect match found. Best alternative:';

      const info = document.createElement('p');
      info.textContent = `${top.name} — Score: ${top.score.toFixed(2)}`;

      const btn = document.createElement('button');
      btn.textContent = 'Connect';
      Object.assign(btn.style, {
        marginTop: '10px',
        padding: '10px 20px',
        background: 'linear-gradient(to right, #00c6ff, #00ff99)',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        color: 'white',
        cursor: 'pointer'
      });
      btn.addEventListener('mouseover', () => { btn.style.opacity = '0.85'; });
      btn.addEventListener('mouseout', () => { btn.style.opacity = '1'; });
      btn.addEventListener('click', () => connectTo(top.id, top.name));

      matchResult.append(heading, info, btn);
    } else {
      matchResult.textContent = 'No matches found.';
    }
  });
});

async function loadUserSkills(userId) {
  try {
    const res = await fetch(`/api/user/${userId}`);
    if (!res.ok) throw new Error('load failed');
    const data = await res.json();

    const skillsHaveSelect = document.getElementById('skillsHave');
    skillsHaveSelect.innerHTML = '';

    (data.skillsHave || []).forEach(skill => {
      const option = document.createElement('option');
      option.value = skill;
      option.textContent = skill;
      skillsHaveSelect.appendChild(option);
    });
  } catch (err) {
    document.getElementById('matchResult').textContent = 'Could not load your skills.';
  }
}

function connectTo(id, name) {
  localStorage.setItem('partnerId', id);
  localStorage.setItem('partnerName', name);
  window.location.href = 'chat.html';
}
