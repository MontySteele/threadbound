// S1+S2 sign-off spot-check (headless): style screen, a solo run through its
// first combat turn at ?botspeed=instant, and a 2-tab co-op lobby+map smoke.
// Fails on any page console error. Screenshots land in /tmp for eyeballing.

/* eslint-disable no-console */
process.env.PORT = '0';
process.env.PERSIST = '';
const path = require('node:path');
const { GameServer } = require('../packages/server/dist/lib.js');
const { chromium } = require('playwright');

const SHOTS = '/tmp/threadbound-s1s2';

async function main() {
  const gs = new GameServer({ port: 0, clientDist: path.resolve(__dirname, '../packages/client/dist') });
  const port = await gs.listen();
  const base = `http://localhost:${port}`;
  const browser = await chromium.launch();
  const errors = [];
  const fs = require('node:fs');
  fs.mkdirSync(SHOTS, { recursive: true });

  const newPage = async (ctxName) => {
    const ctx = await browser.newContext({ viewport: { width: 1380, height: 940 } });
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`[${ctxName}] ${m.text()}`);
    });
    page.on('pageerror', (e) => errors.push(`[${ctxName}] ${e.message}`));
    return page;
  };

  // 1. style screen (designer veto point)
  const style = await newPage('style');
  await style.goto(`${base}/?style`);
  await style.waitForTimeout(600);
  await style.screenshot({ path: `${SHOTS}/1-style.png`, fullPage: true });
  console.log('style screen ✓');

  // 2. solo run: lobby → map (knot cords) → combat (bot stages, we ready, turn resolves)
  const solo = await newPage('solo');
  await solo.goto(`${base}/?botspeed=instant`);
  await solo.getByRole('button', { name: 'Descend alone' }).click();
  await solo.getByText('The Witness holds the other end').waitFor({ timeout: 5000 });
  await solo.screenshot({ path: `${SHOTS}/2-solo-lobby.png` });
  await solo.getByRole('button', { name: 'Begin the descent' }).click();
  await solo.waitForSelector('.mapwrap', { timeout: 5000 });
  await solo.screenshot({ path: `${SHOTS}/3-solo-map.png` });
  await solo.locator('.mapnode.can').first().click();
  await solo.waitForSelector('.enemies .enemy', { timeout: 8000 });
  await solo.waitForTimeout(1200); // bot stages eagerly at instant speed
  const botStaged = await solo.locator('.chaincard').count();
  await solo.screenshot({ path: `${SHOTS}/4-solo-combat.png` });
  await solo.getByRole('button', { name: 'Ready', exact: true }).click();
  await solo.waitForTimeout(1500); // bot final pass + ready + resolution
  await solo.screenshot({ path: `${SHOTS}/5-solo-resolved.png` });
  console.log(`solo run ✓ (bot had ${botStaged} card(s) staged before our ready)`);

  // 3. co-op 2-tab smoke: create + join, witness greeting in lobby, map renders
  const p1 = await newPage('coop-p1');
  const p2 = await newPage('coop-p2');
  await p1.goto(`${base}/?tab=a`);
  await p1.getByRole('button', { name: 'Create room' }).click();
  await p1.waitForSelector('header', { timeout: 5000 });
  const code = (await p1.locator('header .header-mid b').first().textContent()).trim();
  await p2.goto(`${base}/?tab=b`);
  await p2.getByPlaceholder('5-letter code').fill(code);
  await p2.getByRole('button', { name: 'Join', exact: true }).click();
  await p1.getByText('The thread is strung.').waitFor({ timeout: 5000 });
  await p1.screenshot({ path: `${SHOTS}/6-coop-lobby.png` });
  await p1.getByRole('button', { name: 'Begin the descent' }).click();
  await p1.waitForSelector('.mapwrap', { timeout: 5000 });
  await p2.waitForSelector('.mapwrap', { timeout: 5000 });
  await p1.locator('.mapnode.can').first().click();
  await p2.locator('.mapnode.can').first().click();
  await p1.waitForSelector('.enemies .enemy', { timeout: 8000 });
  await p1.screenshot({ path: `${SHOTS}/7-coop-combat.png` });
  console.log('co-op 2-tab ✓');

  await browser.close();
  gs.close();
  if (errors.length) {
    console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log(`ZERO console errors. Screenshots → ${SHOTS}/`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
