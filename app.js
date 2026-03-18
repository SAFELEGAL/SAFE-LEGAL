const EMAILJS_PUBLIC_KEY  = 'XYUJUh5i2l5B919aX';
const EMAILJS_SERVICE_ID  = 'service_11givvs';
const EMAILJS_TEMPLATE_ID = 'template_il51ahz';

const WISE_LINKS = {
  nda:      'https://wise.com/pay/r/k9_Y-nMBl0z8g4E',
  freelance:'https://wise.com/pay/r/tASuaAGZcmioABY',
  privacy:  'https://wise.com/pay/r/flBqG0KpUZcDQoM',
};

const PRODUCTS = {
  nda:      { name: 'Non-Disclosure Agreement', price: 29 },
  freelance:{ name: 'Freelance Service Agreement', price: 39 },
  privacy:  { name: 'Privacy Policy + Terms of Service', price: 49 },
};

function switchTab(tab) {
  ['nda', 'freelance', 'privacy'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
    document.getElementById('panel-' + t).classList.toggle('active', t === tab);
  });
}

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

function buildPrompt(tipo, data) {
  if (tipo === 'nda') {
    return `You are a professional legal document drafter. Draft a complete, professional ${data.type} Non-Disclosure Agreement governed by the laws of ${data.state}, United States:
- Disclosing Party: ${data.disclosing}
- Receiving Party: ${data.receiving}
- Purpose: ${data.purpose}
- Duration: ${data.duration}
${data.details ? '- Special requirements: ' + data.details : ''}
Include all standard NDA provisions: definition of confidential information, obligations of receiving party, exclusions, permitted disclosures, return of information, remedies, governing law (${data.state}), entire agreement, signature blocks. Use formal US legal drafting style. Number all sections.`;
  }
  if (tipo === 'freelance') {
    return `You are a professional legal document drafter. Draft a complete Freelance Service Agreement governed by the laws of ${data.state}, United States:
- Client: ${data.client}
- Service Provider: ${data.freelancer}
- Scope: ${data.scope}
- Compensation: ${data.payment}
- Payment schedule: ${data.schedule}
- Timeline: ${data.timeline}
- IP ownership: ${data.ip}
${data.details ? '- Additional terms: ' + data.details : ''}
Include: recitals, scope, compensation, IP ownership, confidentiality, independent contractor status, termination, limitation of liability, governing law (${data.state}), signatures. Number all sections.`;
  }
  if (tipo === 'privacy') {
    return `You are a professional legal document drafter. Draft a complete Privacy Policy AND Terms of Service for:
- Business: ${data.name}
- Website: ${data.url}
- Type: ${data.type}
- Data collected: ${data.data}
- Third-party services: ${data.third}
- State: ${data.state}
${data.details ? '- Additional: ' + data.details : ''}
Privacy Policy: data collected, use, sharing, cookies, user rights, CCPA if California, retention, contact.
Terms of Service: acceptance, use, prohibited conduct, IP, disclaimers, liability, governing law, changes.
Separate both documents with clear headings. Formal US legal style.`;
  }
}

async function handleCheckout(tipo, price) {
  const email = prompt('Enter your email address to receive your document:');
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address.');
    return;
  }

  const formData = collectFormData(tipo);
  const product  = PRODUCTS[tipo];

  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      doc_type:     product.name,
      client_email: email,
      price:        '$' + product.price,
      form_data:    JSON.stringify(formData, null, 2),
    });
  } catch(e) {
    console.error('EmailJS error:', e);
  }

  sessionStorage.setItem('sl_tipo',  tipo);
  sessionStorage.setItem('sl_email', email);
  sessionStorage.setItem('sl_data',  JSON.stringify(formData));

  window.location.href = WISE_LINKS[tipo];
}

async function handleSuccessPage() {
  const tipo      = sessionStorage.getItem('sl_tipo');
  const email     = sessionStorage.getItem('sl_email');
  const savedData = sessionStorage.getItem('sl_data');
  if (!tipo || !savedData) return;

  const formData = JSON.parse(savedData);
  const prompt   = buildPrompt(tipo, formData);

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
    const text   = result.content.map(b => b.text || '').join('');
    document.getElementById('success-status').textContent = 'Your document is ready!';
    document.getElementById('doc-preview').textContent    = text;
    document.getElementById('doc-section').style.display  = 'block';
    sessionStorage.clear();
  } catch(e) {
    document.getElementById('success-status').textContent =
      'Something went wrong. Please contact us at contact@safelegal.com';
  }
}

function copyDoc() {
  const texto = document.getElementById('doc-preview').textContent;
  navigator.clipboard.writeText(texto).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy text', 2000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('success')) {
    handleSuccessPage();
  }
});
