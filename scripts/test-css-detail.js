async function test() {
  const res = await fetch('http://localhost:3000');
  const html = await res.text();
  const matches = [...html.matchAll(/href="([^"']+\.css[^"']*)"/g)];
  for (const m of matches) {
    const css = await (await fetch('http://localhost:3000' + m[1])).text();
    const flexIdx = css.indexOf('.flex');
    console.log('Flex definition:', flexIdx !== -1 ? css.slice(flexIdx, flexIdx + 80).replace(/\n/g, ' ') : 'NOT FOUND');
    const roundedIdx = css.indexOf('.rounded-lg');
    console.log('Rounded-lg definition:', roundedIdx !== -1 ? css.slice(roundedIdx, roundedIdx + 80).replace(/\n/g, ' ') : 'NOT FOUND');
    const borderIdx = css.indexOf('.border-slate-200');
    console.log('Border-slate-200:', borderIdx !== -1 ? css.slice(borderIdx, borderIdx + 80).replace(/\n/g, ' ') : 'NOT FOUND');
  }
}
test();
