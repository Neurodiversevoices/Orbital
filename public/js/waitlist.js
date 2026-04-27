// iOS waitlist / Coming-soon email capture handler
(function() {
  function setupWaitlistChip(chipId, source) {
    var chip = document.getElementById(chipId);
    if (!chip) return;

    chip.addEventListener('click', function() {
      // Only expand once
      if (chip.dataset.expanded) return;
      chip.dataset.expanded = '1';

      var form = document.createElement('div');
      form.style.cssText = 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;justify-content:center;';
      form.innerHTML =
        '<input type="email" placeholder="your@email.com"' +
        ' style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:10px 16px;color:#fff;font-family:\'DM Sans\',sans-serif;font-size:15px;width:220px;"' +
        ' aria-label="Email for iOS waitlist">' +
        '<button type="button"' +
        ' style="background:#5DD9D4;color:#01020A;font-family:\'DM Sans\',sans-serif;font-weight:700;border:none;border-radius:12px;padding:10px 20px;cursor:pointer;font-size:15px;">' +
        'Notify me' +
        '</button>';
      chip.appendChild(form);

      var emailInput = form.querySelector('input');
      var btn = form.querySelector('button');

      btn.addEventListener('click', async function() {
        var email = emailInput.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          emailInput.style.borderColor = '#E5484D';
          return;
        }
        btn.disabled = true;
        btn.textContent = '…';
        try {
          await fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, source: source }),
          });
          form.innerHTML = '<span style="color:#5DD9D4;font-family:\'Space Mono\',monospace;font-size:11px;">You\'re on the list.</span>';
        } catch (e) {
          btn.disabled = false;
          btn.textContent = 'Notify me';
        }
      });

      emailInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') btn.click();
      });

      setTimeout(function() { emailInput.focus(); }, 50);
    });
  }

  setupWaitlistChip('ios-waitlist-hero', 'ios-waitlist-hero');
  setupWaitlistChip('ios-waitlist-pricing', 'ios-waitlist-pricing');
})();
