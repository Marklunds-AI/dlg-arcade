/* BF-Rush – en liten QR-kodgenerator utan externa bibliotek (fungerar offline).
   Byte-läge, felkorrigering M, version 1–10 (räcker till adresser på upp till cirka 200 tecken).
   Bygger på samma algoritm som QR-standarden (ISO/IEC 18004), förenklad.
   BFR.qr(text) → { storlek, mork(x, y) } eller null om texten är för lång. */
(function () {
  'use strict';
  const B = window.BFR = window.BFR || {};

  // felkorrigering M, index = version
  const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
  const ANTAL_BLOCK = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  const FORMAT_M = 0;   // L = 1, M = 0, Q = 3, H = 2

  const rawModuler = v => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  };
  const dataKodord = v => Math.floor(rawModuler(v) / 8) - ECC_PER_BLOCK[v] * ANTAL_BLOCK[v];

  // Reed–Solomon i GF(2^8) med polynomet 0x11D
  function mul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; }
  function divisor(grad) {
    const r = new Array(grad).fill(0); r[grad - 1] = 1; let rot = 1;
    for (let i = 0; i < grad; i++) {
      for (let j = 0; j < r.length; j++) { r[j] = mul(r[j], rot); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      rot = mul(rot, 0x02);
    }
    return r;
  }
  function rest(data, div) {
    const r = new Array(div.length).fill(0);
    for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((d, i) => { r[i] ^= mul(d, f); }); }
    return r;
  }

  function qr(text) {
    const bytes = Array.from(new TextEncoder().encode(String(text)));
    let v = 1;
    for (; v <= 10; v++) if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= dataKodord(v) * 8) break;
    if (v > 10) return null;

    // bitström: läge 0100, längd, data, terminator, utfyllnad
    const bitar = [];
    const lagg = (val, n) => { for (let i = n - 1; i >= 0; i--) bitar.push((val >>> i) & 1); };
    lagg(4, 4); lagg(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => lagg(b, 8));
    const kap = dataKodord(v) * 8;
    lagg(0, Math.min(4, kap - bitar.length));
    lagg(0, (8 - bitar.length % 8) % 8);
    for (let pad = 0xEC; bitar.length < kap; pad ^= 0xEC ^ 0x11) lagg(pad, 8);
    const data = [];
    for (let i = 0; i < bitar.length; i += 8) data.push(bitar.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

    // dela i block, lägg till felkorrigering och fläta ihop
    const nb = ANTAL_BLOCK[v], eccLen = ECC_PER_BLOCK[v], raw = Math.floor(rawModuler(v) / 8);
    const korta = nb - raw % nb, kortLen = Math.floor(raw / nb), div = divisor(eccLen);
    const block = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const dat = data.slice(k, k + kortLen - eccLen + (i < korta ? 0 : 1)); k += dat.length;
      const ecc = rest(dat, div);
      if (i < korta) dat.push(0);
      block.push(dat.concat(ecc));
    }
    const kodord = [];
    for (let i = 0; i < block[0].length; i++) block.forEach((bl, j) => { if (i !== kortLen - eccLen || j >= korta) kodord.push(bl[i]); });

    // rita mönstren
    const n = v * 4 + 17;
    const mod = Array.from({ length: n }, () => new Array(n).fill(false));
    const fun = Array.from({ length: n }, () => new Array(n).fill(false));
    const satt = (x, y, m) => { mod[y][x] = m; fun[y][x] = true; };
    for (let i = 0; i < n; i++) { satt(6, i, i % 2 === 0); satt(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < n && y >= 0 && y < n) satt(x, y, d !== 2 && d !== 4); } };
    finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
    if (v >= 2) {
      const na = Math.floor(v / 7) + 2, steg = Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2, pos = [6];
      for (let p = n - 7; pos.length < na; p -= steg) pos.splice(1, 0, p);
      pos.forEach((y, i) => pos.forEach((x, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) satt(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }));
    }
    const format = mask => {
      const d = (FORMAT_M << 3) | mask; let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412, bit = i => ((b >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) satt(8, i, bit(i));
      satt(8, 7, bit(6)); satt(8, 8, bit(7)); satt(7, 8, bit(8));
      for (let i = 9; i < 15; i++) satt(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) satt(n - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) satt(8, n - 15 + i, bit(i));
      satt(8, n - 8, true);
    };
    format(0);   // reservera formatytorna
    if (v >= 7) {
      let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const b = (v << 12) | r;
      for (let i = 0; i < 18; i++) { const bit = ((b >>> i) & 1) !== 0, a = n - 11 + i % 3, c = Math.floor(i / 3); satt(a, c, bit); satt(c, a, bit); }
    }
    // data i sicksack
    let i = 0;
    for (let hoger = n - 1; hoger >= 1; hoger -= 2) {
      if (hoger === 6) hoger = 5;
      for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
        const x = hoger - j, upp = ((hoger + 1) & 2) === 0, y = upp ? n - 1 - vert : vert;
        if (!fun[y][x] && i < kodord.length * 8) { mod[y][x] = ((kodord[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
      }
    }
    // välj masken som ger minst "straff" (regel 1, 2 och 4)
    const MASKER = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
      (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0
    ];
    const maska = m => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fun[y][x] && MASKER[m](x, y)) mod[y][x] = !mod[y][x]; };
    const straff = () => {
      let s = 0, morka = 0;
      for (let y = 0; y < n; y++) for (const led of [0, 1]) {
        let lop = 1;
        for (let x = 1; x < n; x++) {
          const a = led ? mod[x][y] : mod[y][x], b = led ? mod[x - 1][y] : mod[y][x - 1];
          if (a === b) { lop++; if (lop === 5) s += 3; else if (lop > 5) s++; } else lop = 1;
        }
      }
      for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) s += 3; }
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (mod[y][x]) morka++;
      return s + Math.floor(Math.abs(morka * 20 - n * n * 10) / (n * n)) * 10;
    };
    let bast = 0, minst = Infinity;
    for (let m = 0; m < 8; m++) { maska(m); format(m); const p = straff(); if (p < minst) { minst = p; bast = m; } maska(m); }
    maska(bast); format(bast);
    return { storlek: n, mork: (x, y) => mod[y][x] };
  }

  B.qr = qr;
})();
