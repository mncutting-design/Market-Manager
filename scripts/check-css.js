async function check() {
  const res = await fetch('http://localhost:3000');
  const html = await res.text();
  const matches = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)];
  for (const m of matches) {
    const url = m[1].startsWith('http') ? m[1] : 'http://localhost:3000' + m[1];
    const cssRes = await fetch(url);
    const cssText = await cssRes.text();
    console.log('CSS URL:', url, 'Bytes:', cssText.length);
    console.log('Includes bg-teal-600?:', cssText.includes('bg-teal-600'));
    console.log('Includes max-w-md?:', cssText.includes('max-w-md'));
    console.log('Includes rounded-2xl?:', cssText.includes('rounded-2xl'));
    console.log('Includes min-h-screen?:', cssText.includes('min-h-screen'));
    console.log('First 500 chars of CSS:');
    console.log(cssText.slice(0, 500));
  }
}
check();
