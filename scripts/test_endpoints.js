async function runTests() {
  const base = 'http://localhost:8080';

  console.log('--- 1. Testing Event Tracking (Input) ---');
  let res = await fetch(`${base}/api/track/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'input',
      session_id: 'test_sess_1',
      device: 'Mobile',
      utm_source: 'google_ads_safra'
    })
  });
  console.log('Track Input:', await res.json());

  console.log('\n--- 2. Testing WhatsApp Output Event ---');
  res = await fetch(`${base}/api/track/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'output_whatsapp',
      session_id: 'test_sess_1',
      action_key: 'cta_faca_simulacao',
      button_text: 'Faça uma Simulação',
      device: 'Mobile',
      utm_source: 'google_ads_safra'
    })
  });
  console.log('Track Output:', await res.json());

  console.log('\n--- 3. Testing Dynamic WhatsApp Redirect ---');
  res = await fetch(`${base}/r/whatsapp?action=cta_faca_simulacao&btn=Banner%20Hero`, {
    headers: { 'Accept': 'application/json' }
  });
  const waData = await res.json();
  console.log('WhatsApp Redirect Data:', waData);

  console.log('\n--- 4. Testing Analytics & Percentage Metrics API ---');
  res = await fetch(`${base}/api/analytics/metrics?hours=24`);
  const metrics = await res.json();
  console.log('Summary:', metrics.summary);
  console.log('CTA Breakdown:', metrics.cta_breakdown);
  console.log('Device Stats:', metrics.device_stats);

  console.log('\n--- 5. Testing Landing Page Delivery ---');
  res = await fetch(`${base}/`);
  console.log('Landing Page Status:', res.status, 'Content-Length:', (await res.text()).length);

  console.log('\n--- 6. Testing Admin Dashboard Delivery ---');
  res = await fetch(`${base}/admin/`);
  console.log('Admin Dashboard Status:', res.status, 'Content-Length:', (await res.text()).length);
}

runTests().catch(console.error);
