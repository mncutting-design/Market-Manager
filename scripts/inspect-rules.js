async function inspectRules() {
  const res = await fetch('http://localhost:3000');
  const html = await res.text();
  const matches = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)];
  for (const m of matches) {
    const url = m[1].startsWith('http') ? m[1] : 'http://localhost:3000' + m[1];
    const css = await (await fetch(url)).text();
    
    // Find where .max-w-md or .bg-teal-600 is defined
    const idx = css.indexOf('.max-w-md');
    if (idx !== -1) {
      console.log('Found .max-w-md rule:');
      console.log(css.slice(idx, idx + 200));
    } else {
      console.log('.max-w-md class NOT found in CSS output!');
    }

    const idx2 = css.indexOf('.bg-teal-600');
    if (idx2 !== -1) {
      console.log('Found .bg-teal-600 rule:');
      console.log(css.slice(idx2, idx2 + 200));
    } else {
      console.log('.bg-teal-600 class NOT found in CSS output!');
    }
  }
}
inspectRules();
