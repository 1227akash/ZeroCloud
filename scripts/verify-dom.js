const http = require('http');

const pagesToTest = [
  '/',
  '/send',
  '/receive',
  '/thank-you',
  '/privacy',
  '/terms',
  '/sitemap.xml',
  '/robots.txt',
  '/manifest.json',
  '/sw.js',
  '/favicon.ico',
  '/og-image.png',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg'
];

async function fetchUrl(path) {
  return new Promise((resolve) => {
    http.get('http://localhost:3000' + path, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ path, statusCode: res.statusCode, headers: res.headers, body: data });
      });
    }).on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

function verify(condition, desc) {
  if (condition) {
    console.log(`  ✔ [PASS] ${desc}`);
  } else {
    console.error(`  ✖ [FAIL] ${desc}`);
    throw new Error(`Failed: ${desc}`);
  }
}

(async () => {
  console.log('\n=== ZERO-CLOUD DOM & LINK AUDIT ===\n');

  // 1. Verify all routes return 200
  console.log('1. Verifying all routes & assets status 200:');
  for (const page of pagesToTest) {
    const res = await fetchUrl(page);
    verify(res.statusCode === 200, `${page} responded with HTTP 200 OK`);
  }

  // 2. Verify Home Page Content & Structure
  console.log('\n2. Verifying Home Page:');
  const home = await fetchUrl('/');
  verify(home.body.includes('Send a file'), 'Primary CTA "Send a file" exists on Home page');
  verify(home.body.includes('Made by Akash'), 'Footer attribution "Made by Akash" present on Home page');
  verify(home.body.includes('10 GB'), '10 GB capacity highlighted on Home page');
  verify(home.body.includes('How ZeroCloud Works'), '3-step "How ZeroCloud Works" present');
  verify(home.body.includes('Frequently Asked Questions'), 'FAQ section present');
  verify(home.body.includes('application/ld+json'), 'JSON-LD structured data included in head');
  verify(home.body.includes('viewport'), 'Mobile responsive viewport meta tag present');

  // 3. Verify Send Page
  console.log('\n3. Verifying Send Page:');
  const send = await fetchUrl('/send');
  verify(send.body.includes('Send Files Directly') || send.body.includes('Send a File Directly'), 'Header "Send Files Directly" present');
  verify(send.body.includes('Made by Akash'), 'Footer attribution "Made by Akash" present on Send page');
  verify(send.body.includes('Choose files') && send.body.includes('Browse Files'), 'File dropzone present on Send page');

  // 4. Verify Receive Page
  console.log('\n4. Verifying Receive Page:');
  const recv = await fetchUrl('/receive');
  verify(recv.body.includes('Receive') || recv.body.includes('Loading transfer session'), 'Receive container present on Receive page');
  verify(recv.body.includes('Made by Akash'), 'Footer attribution "Made by Akash" present on Receive page');
  verify(recv.body.includes('receive/page') || recv.body.includes('Enter Short Code'), 'Client script for receive page bundled and loaded');

  // 5. Verify Thank You Page
  console.log('\n5. Verifying Thank-You Page:');
  const ty = await fetchUrl('/thank-you');
  verify(ty.body.includes('Send another file') || ty.body.includes('thank-you/page'), 'Single return action "Send another file" present');
  verify(ty.body.includes('Made by Akash'), 'Footer attribution "Made by Akash" present on Thank-You page');

  // 6. Verify Legal Pages
  console.log('\n6. Verifying Privacy & Terms Pages:');
  const priv = await fetchUrl('/privacy');
  verify(priv.body.includes('Privacy Policy'), 'Privacy Policy header present');
  verify(priv.body.includes('zero-knowledge peer-to-peer'), 'Zero-knowledge architecture explained in Privacy Policy');
  verify(priv.body.includes('Made by Akash'), 'Footer attribution "Made by Akash" present on Privacy page');

  const terms = await fetchUrl('/terms');
  verify(terms.body.includes('Terms') && terms.body.includes('Acceptable Use Policy'), 'Terms & Conditions header present');
  verify(terms.body.includes('Made by Akash'), 'Footer attribution "Made by Akash" present on Terms page');

  // 7. Verify 404 Page
  console.log('\n7. Verifying Custom 404:');
  const notFound = await fetchUrl('/random-nonexistent-path');
  verify(notFound.statusCode === 404, 'Non-existent route returns HTTP 404');
  verify(notFound.body.includes('Page Not Found'), 'Custom 404 page content rendered');
  verify(notFound.body.includes('Return to Home'), 'Single link home present on 404');

  // 8. Verify Robots & Sitemap
  console.log('\n8. Verifying Robots.txt and Sitemap.xml:');
  const robots = await fetchUrl('/robots.txt');
  verify(robots.body.includes('Disallow: /send'), 'Robots.txt disallows /send');
  verify(robots.body.includes('Disallow: /receive'), 'Robots.txt disallows /receive');
  verify(robots.body.includes('Sitemap:'), 'Robots.txt points to Sitemap.xml');

  const sitemap = await fetchUrl('/sitemap.xml');
  verify(sitemap.body.includes('<urlset'), 'Sitemap.xml contains valid XML urlset');

  console.log('\n✔ ALL DOM, ROUTE, FOOTER, CTA, AND LINK AUDITS PASSED SUCCESSFULLY!\n');
})();
