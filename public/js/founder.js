// Founder counter polling + Stripe checkout handler
(function() {
  var COUNTER_INTERVAL = 60000; // 60s

  function updateCounters(paid, remaining) {
    var text = paid + ' of 100 founder spots claimed';
    ['counter-hero', 'counter-founder'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    });

    if (remaining < 1) {
      // Sold out: hide checkout form, show waitlist
      var form = document.getElementById('founder-form');
      var soldOut = document.getElementById('founder-sold-out');
      if (form) form.style.display = 'none';
      if (soldOut) soldOut.style.display = 'block';
    }
  }

  async function fetchCount() {
    try {
      var res = await fetch('/api/founders/count');
      if (!res.ok) return;
      var data = await res.json();
      updateCounters(data.paid_count != null ? data.paid_count : 0, data.slots_remaining != null ? data.slots_remaining : 100);
    } catch (e) {
      // Silent fail — counter shows stale value
    }
  }

  fetchCount();
  setInterval(fetchCount, COUNTER_INTERVAL);

  // Checkout form handler
  var form = document.getElementById('founder-form');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var emailInput = document.getElementById('founder-email');
      var btn = document.getElementById('cta-founder-block');
      var errEl = document.getElementById('founder-error');

      var email = emailInput ? emailInput.value.trim() : '';
      if (!email) return;

      if (btn) { btn.disabled = true; btn.textContent = 'Opening checkout…'; }
      if (errEl) { errEl.style.display = 'none'; }

      try {
        var res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, source: 'landing-founder-block' }),
        });
        var data = await res.json();

        if (!res.ok || !data.ok) {
          if (data.reason === 'sold_out') {
            if (errEl) { errEl.textContent = 'All 100 spots are claimed. Join the waitlist below.'; errEl.style.display = 'block'; }
          } else {
            if (errEl) { errEl.textContent = data.error || 'Something went wrong. Try again.'; errEl.style.display = 'block'; }
          }
          if (btn) { btn.disabled = false; btn.textContent = 'Claim founder spot — $99'; }
          return;
        }

        window.location.href = data.checkout_url;
      } catch (e) {
        if (errEl) { errEl.textContent = 'Network error. Check your connection and try again.'; errEl.style.display = 'block'; }
        if (btn) { btn.disabled = false; btn.textContent = 'Claim founder spot — $99'; }
      }
    });
  }

  // Hero CTA button (scrolls to founder block)
  var heroCta = document.getElementById('cta-founder-hero');
  if (heroCta) {
    heroCta.addEventListener('click', function() {
      var founderSection = document.getElementById('founder');
      if (founderSection) {
        founderSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(function() {
          var emailInput = document.getElementById('founder-email');
          if (emailInput) emailInput.focus();
        }, 600);
      }
    });
  }
})();
