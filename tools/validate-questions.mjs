#!/usr/bin/env node
/*
  Checks every Quiz Champs question file.
  Run from the repo root:   node tools/validate-questions.mjs

  It checks that:
  - themes/themes.json is valid and every listed file exists
  - every question has Question, Image, Answer and Choices
  - Answer is one of the Choices, and Choices has no repeats
  - True/False questions have exactly ["True", "False"]
  - other questions have 4 choices
  - each theme has at least 150 questions
  - no question appears twice in the same theme
*/
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = "games/quiz/themes";
const MIN = 150;
let problems = 0;
const fail = (msg) => { problems++; console.log("  ✗ " + msg); };

const themes = JSON.parse(readFileSync(join(DIR, "themes.json"), "utf8"));
let total = 0;

for (const t of themes) {
  const path = join(DIR, t.file);
  if (!existsSync(path)) { fail(`${t.id}: file ${t.file} is missing`); continue; }
  if (!["yellow", "coral", "teal"].includes(t.color) && !/^#/.test(t.color || "")) {
    fail(`${t.id}: color should be "yellow", "coral" or "teal"`);
  }
  let qs;
  try { qs = JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { fail(`${t.file}: not valid JSON (${e.message})`); continue; }
  if (!Array.isArray(qs)) { fail(`${t.file}: should be a JSON array`); continue; }

  const seen = new Set();
  qs.forEach((q, i) => {
    const where = `${t.file} #${i + 1}`;
    for (const k of ["Question", "Image", "Answer", "Choices"]) {
      if (!(k in q)) fail(`${where}: missing "${k}"`);
    }
    if (!Array.isArray(q.Choices)) return;
    if (!q.Choices.includes(q.Answer)) fail(`${where}: Answer "${q.Answer}" is not in Choices`);
    if (new Set(q.Choices).size !== q.Choices.length) fail(`${where}: Choices has a repeat`);
    const tf = q.Choices.length === 2;
    if (tf && q.Choices.join() !== "True,False") fail(`${where}: two-choice questions must be ["True", "False"]`);
    if (!tf && q.Choices.length !== 4) fail(`${where}: has ${q.Choices.length} choices (expected 4, or 2 for True/False)`);
    if (q.Image && !/^https:\/\//.test(q.Image)) fail(`${where}: Image should be an https:// link or ""`);
    const key = q.Question + "|" + q.Image;
    if (seen.has(key)) fail(`${where}: duplicate question "${q.Question}"`);
    seen.add(key);
  });
  if (qs.length < MIN) fail(`${t.file}: only ${qs.length} questions (minimum ${MIN})`);
  total += qs.length;
  console.log(`${t.file.padEnd(26)} ${String(qs.length).padStart(4)}`);
}

console.log(`\n${themes.length} themes, ${total} questions, ${problems} problem${problems === 1 ? "" : "s"}`);
process.exit(problems ? 1 : 0);
