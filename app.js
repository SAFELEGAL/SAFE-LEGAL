// ─── CONFIG ───────────────────────────────────────────────────
// Replace with your actual Stripe Publishable Key
const STRIPE_PUBLISHABLE_KEY = 'pk_live_YOUR_STRIPE_KEY_HERE';

const PRODUCTS = {
  nda:      { name: 'Non-Disclosure Agreement', price: 29 },
  freelance:{ name: 'Freelance Service Agreement', price: 39 },
  privacy:  { name: 'Privacy Policy + Terms of Service', price: 49 },
};

// ─── TABS ─────────────────────────────────────────────────────
function switchTab(tab) {
  ['nda', 'freelance', 'privacy'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
    document.getElementById('panel-' + t).classList.toggle('active', t === tab);
  });
  document.getElementById('checkout-modal').style.display = 'none';
}

// ─── COLLECT FORM DATA ────────────────────────────────────────
function collectFormData(tipo) {
  if (tipo === 'nda') {
    return {
      disclosing: document.getElementById('nda-disclosing').value || 'Disclosing Party',
      receiving:  document.getElementById('nda-receiving').value  || 'Receiving Party',
      type:       document.getElementById('nda-type').value,
      state:      document.getElementById('nda-state').value,
      duration:   document.getElementById('nda-duration').value,
      purpose:    document.getElementById('nda-purpose').value    || 'exploring a business relationship',
      details:    document.getElementById('nda-details').value,
    };
  }
  if (tipo === 'freelance') {
    return {
      client:     document.getElementById('fl-client').value     || 'Client',
      freelancer: document.getElementById('fl-freelancer').value || 'Service Provider',
      scope:      document.getElementById('fl-scope').value      || 'Professional services as agreed',
      payment:    document.getElementById('fl-payment').value    || 'as agreed',
      schedule:   document.getElementById('fl-schedule').value,
      timeline:   document.getElementById('fl-timeline').value   || 'as mutually agreed',
      state:      document.getElementById('fl-state').value,
      ip:         document.getElementById('fl-ip').value,
      details:    document.getElementById('fl-details').value,
    };
  }
  if (tipo === 'privacy') {
    return {
      name:    document.getElementById('pp-name').value  || 'Our Company',
      url:     document.getElementById('pp-url').value   || 'our website',
      type:    document.getElementById('pp-type').value,
      data:    document.getElementById('pp-data').value,
      third:   document.getElementById('pp-third').value,
      state:   document.getElementById('pp-state').value,
      details: document.getElementById('pp-details').value,
    };
  }
}

// ─── BUILD PROMPT ─────────────────────────────────────────────
function buildPrompt(tipo, data) {
  if (tipo === 'nda') {
    return `You are a professional legal document drafter. Draft a complete, professional ${data.type} Non-Disclosure Agreement governed by the laws of ${data.state}, United States:
- Disclosing Party: ${data.disclosing}
- Receiving Party: ${data.receiving}
- Purpose: ${data.purpose}
- Duration: ${data.duration}
${data.details ? '- Special requirements: ' + data.details : ''}
Include all standard NDA provisions: definition of confidential information, obligations of receiving party, exclusions from confidentiality, permitted disclosures, return/destruction of information, remedies, governing law (${data.state}), entire agreement, and signature blocks. Use formal US legal drafting style. Number all sections.`;
  }
  if (tipo === 'freelance') {
    return `You are a professional legal document drafter. Draft a complete Freelance Service Agreement governed by the laws of ${data.state}, United States:
- Client: ${data.client}
- Service Provider / Freelancer: ${data.freelancer}
- Scope of services: ${data.scope}
- Compensation: ${data.payment}
- Payment schedule: ${data.schedule}
- Timeline: ${data.timeline}
- Intellectual property: ${data.ip}
${data.details ? '- Additional terms: ' + data.details : ''}
Include: recitals, scope of work, compensation, IP ownership, confidentiality, independent contractor status, termination, limitation of liability, governing law (${data.state}), entire agreement, signatures. Use formal US legal drafting style. Number all sections.`;
  }
  if (tipo === 'privacy') {
    return `You are a professional legal document drafter. Draft a complete Privacy Policy AND Terms of Service for:
- Business name: ${data.name}
- Website: ${data.url}
- Type of business: ${data.type}
- Data collected: ${data.data}
- Third-party services: ${data.third}
- Governing state: ${data.state}
${data.details ? '- Additional requirements: ' + data.details : ''}
Privacy Policy: information collected, how it is used, third-party sharing, cookies, user rights, CCPA compliance (if California), data retention, contact information.
Terms of Service: acceptance, use of service, prohibited conduct, IP, disclaimers, limitation of liability, governing law, changes to terms.
Clearly separate the two documents with bold headings. Use formal US legal drafting style.`;
  }
}

// ─── CHECKOUT FLOW ────────────────────────────────────────────
let currentTipo = null;

function handleCheckout(tipo, price) {
  currentTipo = tipo;
  const product = PRODUCTS[tipo];
  document.getElementById('modal-doc-name').textContent = product.name;
  document.getElementById('modal-price').textContent = '$' + product.price;
  document.getElementById('modal-title').textContent = 'Complete your order';
  document.getElementById('checkout-email').value = '';
  document.getElementById('checkout-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('checkout-modal').style.display = 'none';
}

async function processPayment() {
  const email = document.getElementById('checkout-email').value.trim();
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address.');
    return;
  }

  const payBtn = document.getElementById('pay-btn');
  payBtn.disabled = true;
  payBtn.textContent = 'Redirecting to payment...';

  // Collect form data and save to sessionStorage so we can use it after payment
  const formData = collectFormData(currentTipo);
  sessionStorage.setItem('sl_tipo', currentTipo);
  sessionStorage.setItem('sl_data', JSON.stringify(formData));
  sessionStorage.setItem('sl_email', email);

  // Redirect to Stripe Checkout (handled by your backend / Vercel function)
  // The backend creates a Checkout Session and returns the URL
  try {
    const resp = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: currentTipo,
        email: email,
        price: PRODUCTS[currentTipo].price,
        product_name: PRODUCTS[currentTipo].name,
      })
    });
    const { url } = await resp.json();
    window.location.href = url;
  } catch (e) {
    alert('Payment error. Please try again or contact us at contact@safelegal.com');
    payBtn.disabled = false;
    payBtn.textContent = 'Pay securely with Stripe';
  }
}

// ─── SUCCESS PAGE: generate and show document after payment ───
async function handleSuccessPage() {
  const tipo  = sessionStorage.getItem('sl_tipo');
  const data  = JSON.parse(sessionStorage.getItem('sl_data') || '{}');
  const email = sessionStorage.getItem('sl_email');

  if (!tipo || !data) return;

  const prompt = buildPrompt(tipo, data);

  document.getElementById('success-status').textContent = 'Preparing your document...';

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const result = await resp.json();
    const text = result.content.map(b => b.text || '').join('');

    document.getElementById('success-status').textContent = 'Your document is ready!';
    document.getElementById('doc-preview').textContent = text;
    document.getElementById('doc-section').style.display = 'block';

    // Also send to backend to email the document
    await fetch('/api/send-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, tipo, content: text, product_name: PRODUCTS[tipo].name })
    });

    sessionStorage.clear();
  } catch(e) {
    document.getElementById('success-status').textContent = 'Something went wrong. Please contact us at contact@safelegal.com';
  }
}

// Close modal on background click
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('checkout-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // If on success page, trigger document generation
  if (window.location.pathname.includes('success')) {
    handleSuccessPage();
  }
});
