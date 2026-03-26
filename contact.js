//contact.js

// ===== Contact Form — Formspree AJAX Handler =====

const form      = document.getElementById('contact-form');
const status    = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').textContent = 'Sending…';
  status.textContent = '';
  status.className = 'form-status';

  try {
    const data = new FormData(form);
    const response = await fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      status.textContent = "✓ Message sent! I'll get back to you soon.";
      status.classList.add('status-success');
      form.reset();
    } else {
      const json = await response.json();
      status.textContent = json.errors
        ? json.errors.map(err => err.message).join(', ')
        : 'Something went wrong. Please try again.';
      status.classList.add('status-error');
    }
  } catch (err) {
    status.textContent = 'Could not send message. Please check your connection and try again.';
    status.classList.add('status-error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').textContent = 'Send Message';
  }
});