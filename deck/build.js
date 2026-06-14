// Archon — KPMG Academic Innovation 2026 pitch deck
// Built with pptxgenjs. Teal brand palette (matches the Archon mascot).
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const path = require("path");
const fa = require("react-icons/fa");

// ---------- palette ----------
const C = {
  DARK:   "0A2E2B",  // deep teal-charcoal (dark slides)
  DARK2:  "103F3A",  // panel on dark
  TEAL:   "1F8A7D",  // brand teal (from mascot)
  TEALD:  "176C61",
  MINT:   "2DD4BF",  // sharp accent
  AMBER:  "F4A93D",  // warm pop, ties to mascot — stat callouts only
  WHITE:  "FFFFFF",
  INK:    "0A2E2B",  // text on light
  BODY:   "3C5A56",  // body text on light
  MUTED:  "7C938E",  // captions
  PANEL:  "F1F6F5",  // light card
  LINE:   "DCE8E5",
  ICE:    "BFE9E2",  // muted mint text on dark
};
const LOGO = path.join(__dirname, "..", "client", "public", "web-app-manifest-512x512.png");
const HF = "Trebuchet MS"; // header font
const BF = "Calibri";      // body font

// ---------- icon rasterizer ----------
async function icon(Cmp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Cmp, { color: "#" + color, size: String(size) })
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}
const sh = () => ({ type: "outer", color: "0A2E2B", blur: 9, offset: 3, angle: 90, opacity: 0.18 });

(async () => {
  // preload icons
  const I = {};
  const need = {
    route: fa.FaRandom, robot: fa.FaRobot, ticket: fa.FaTicketAlt,
    orch: fa.FaProjectDiagram, bolt: fa.FaBolt, lang: fa.FaLanguage, bell: fa.FaRegBell,
    chat: fa.FaCommentDots, cogs: fa.FaCogs, layers: fa.FaLayerGroup, check: fa.FaCheckCircle,
    agent: fa.FaHeadset, send: fa.FaPaperPlane, users: fa.FaUsers, comments: fa.FaComments,
    msg: fa.FaEnvelope, swap: fa.FaExchangeAlt, search: fa.FaSearch, clock: fa.FaRegClock,
    shield: fa.FaShieldAlt, life: fa.FaLifeRing, ms: fa.FaMicrosoft, cal: fa.FaRegCalendarAlt,
    cloud: fa.FaCloud, db: fa.FaDatabase, qr: fa.FaQrcode, down: fa.FaArrowDown,
    globe: fa.FaGlobe, brain: fa.FaBrain, lock: fa.FaLock, react: fa.FaReact, github: fa.FaGithub,
    star: fa.FaStar,
  };
  for (const [k, Cmp] of Object.entries(need)) {
    I[k] = { white: await icon(Cmp, "FFFFFF"), teal: await icon(Cmp, "1F8A7D"),
             mint: await icon(Cmp, "2DD4BF"), amber: await icon(Cmp, "F4A93D"),
             dark: await icon(Cmp, "0A2E2B") };
  }

  const p = new pptxgen();
  p.defineLayout({ name: "W", width: 13.333, height: 7.5 });
  p.layout = "W";
  p.author = "Axon Enjin";
  p.title = "Archon — KPMG Academic Innovation 2026";
  const W = 13.333, H = 7.5;

  // ---------- shared helpers ----------
  function tag(slide, x, y, label, fill = C.MINT, fg = C.DARK) {
    slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 0.16 + label.length * 0.092, h: 0.34,
      fill: { color: fill }, line: { type: "none" }, rectRadius: 0.17 });
    slide.addText(label, { x, y, w: 0.16 + label.length * 0.092, h: 0.34, align: "center",
      valign: "middle", fontFace: HF, bold: true, color: fg, fontSize: 10.5, charSpacing: 1, margin: 0 });
  }
  function footer(slide, n, dark) {
    const col = dark ? C.ICE : C.MUTED;
    slide.addText([{ text: "ARCHON", options: { bold: true, color: dark ? C.WHITE : C.INK } },
      { text: "   ·   Axon Enjin", options: { color: col } }],
      { x: 0.55, y: H - 0.5, w: 6, h: 0.3, fontFace: HF, fontSize: 9.5, charSpacing: 1, margin: 0, valign: "middle" });
    slide.addText(`KPMG Academic Innovation 2026   ·   ${n}/9`,
      { x: W - 5.05, y: H - 0.5, w: 4.5, h: 0.3, align: "right", fontFace: BF, fontSize: 9.5, color: col, margin: 0, valign: "middle" });
  }
  function kicker(slide, text, color = C.TEAL) {
    slide.addText(text.toUpperCase(), { x: 0.6, y: 0.55, w: 9, h: 0.3, fontFace: HF, bold: true,
      color, fontSize: 12.5, charSpacing: 2, margin: 0 });
  }
  function title(slide, text, color = C.INK, y = 0.92) {
    slide.addText(text, { x: 0.58, y, w: 11.5, h: 0.9, fontFace: HF, bold: true, color, fontSize: 33, margin: 0 });
  }

  // ============================================================ 1 — TITLE
  let s = p.addSlide(); s.background = { color: C.DARK };
  // ambient accents
  s.addShape(p.shapes.OVAL, { x: 10.4, y: -1.8, w: 5.2, h: 5.2, fill: { color: C.TEAL, transparency: 78 }, line: { type: "none" } });
  s.addShape(p.shapes.OVAL, { x: 11.6, y: 3.6, w: 3.6, h: 3.6, fill: { color: C.MINT, transparency: 86 }, line: { type: "none" } });
  s.addImage({ path: LOGO, x: 0.9, y: 1.15, w: 1.7, h: 1.7 });
  s.addText("Archon", { x: 0.85, y: 3.0, w: 9, h: 1.1, fontFace: HF, bold: true, color: C.WHITE, fontSize: 60, margin: 0 });
  s.addText("Stop making students navigate the org chart.", { x: 0.9, y: 4.15, w: 10.5, h: 0.6,
    fontFace: HF, italic: true, color: C.MINT, fontSize: 22, margin: 0 });
  s.addText("Agentic AI Service Desk for Higher Education", { x: 0.9, y: 4.85, w: 11, h: 0.5,
    fontFace: BF, color: C.ICE, fontSize: 16, margin: 0 });
  tag(s, 0.92, 5.7, "KPMG ACADEMIC INNOVATION 2026", C.MINT, C.DARK);
  tag(s, 5.0, 5.7, "TEAM AXON ENJIN", C.DARK2, C.WHITE);
  s.addText("Carlos Jerico Dela Torre  ·  Rhandie Sales Jr.  ·  Aidan Tiu",
    { x: 0.92, y: 6.35, w: 11, h: 0.4, fontFace: BF, color: C.ICE, fontSize: 12.5, margin: 0 });

  // ============================================================ 2 — PROBLEM
  s = p.addSlide(); s.background = { color: C.WHITE };
  kicker(s, "The Problem");
  title(s, "Students are stuck in the “experience deficit.”");
  s.addText("One issue. Many offices. No answers. Existing tools don't actually resolve anything.",
    { x: 0.6, y: 1.78, w: 11.8, h: 0.4, fontFace: BF, color: C.BODY, fontSize: 14.5, margin: 0 });

  // the runaround flow
  const offices = ["Registrar", "Bursar", "Financial Aid"];
  let fx = 0.85;
  offices.forEach((o, i) => {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: fx, y: 2.55, w: 2.5, h: 1.0, fill: { color: C.PANEL },
      line: { color: C.LINE, width: 1 }, rectRadius: 0.1 });
    s.addText(o, { x: fx, y: 2.55, w: 2.5, h: 1.0, align: "center", valign: "middle", fontFace: HF, bold: true, color: C.INK, fontSize: 15, margin: 0 });
    if (i < offices.length - 1) {
      s.addImage({ data: I.swap.teal, x: fx + 2.62, y: 2.86, w: 0.36, h: 0.36 });
    }
    fx += 3.12;
  });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 10.2, y: 2.55, w: 2.3, h: 1.0, fill: { color: C.AMBER }, line: { type: "none" }, rectRadius: 0.1 });
  s.addText([{ text: "1 week", options: { bold: true, fontSize: 19, breakLine: true, color: C.INK } },
    { text: "0 answers", options: { fontSize: 12, color: C.INK } }],
    { x: 10.2, y: 2.55, w: 2.3, h: 1.0, align: "center", valign: "middle", fontFace: HF, margin: 0 });

  // three failure points
  const fails = [
    [I.robot, "FAQ chatbots", "Static scripts that can't touch an account-specific issue."],
    [I.ticket, "Ticketing systems", "Still route every routine question to an overloaded human."],
    [I.route, "The runaround", "Misrouted between siloed offices — students self-triage and give up."],
  ];
  let cx = 0.85;
  fails.forEach(([ic, h, b]) => {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: cx, y: 4.05, w: 3.78, h: 2.35, fill: { color: C.WHITE },
      line: { color: C.LINE, width: 1 }, rectRadius: 0.1, shadow: sh() });
    s.addShape(p.shapes.OVAL, { x: cx + 0.3, y: 4.35, w: 0.78, h: 0.78, fill: { color: C.PANEL }, line: { type: "none" } });
    s.addImage({ data: ic.teal, x: cx + 0.48, y: 4.53, w: 0.42, h: 0.42 });
    s.addText(h, { x: cx + 0.3, y: 5.25, w: 3.2, h: 0.4, fontFace: HF, bold: true, color: C.INK, fontSize: 16, margin: 0 });
    s.addText(b, { x: cx + 0.3, y: 5.65, w: 3.25, h: 0.7, fontFace: BF, color: C.BODY, fontSize: 12.5, margin: 0 });
    cx += 4.0;
  });
  footer(s, 2, false);

  // ============================================================ 3 — SOLUTION / CREATIVITY (dark)
  s = p.addSlide(); s.background = { color: C.DARK };
  s.addShape(p.shapes.OVAL, { x: 10.8, y: -2.0, w: 5, h: 5, fill: { color: C.TEAL, transparency: 80 }, line: { type: "none" } });
  kicker(s, "The Solution", C.MINT);
  s.addText("Not a chatbot. An autonomous agent.", { x: 0.58, y: 0.92, w: 12, h: 0.9, fontFace: HF, bold: true, color: C.WHITE, fontSize: 33, margin: 0 });
  s.addText("Archon reads a student's real records across departments, diagnoses the issue, and resolves it — before a human ever sees it.",
    { x: 0.6, y: 1.8, w: 11.6, h: 0.6, fontFace: BF, color: C.ICE, fontSize: 14.5, margin: 0 });
  tag(s, 0.6, 2.5, "SCORED: CREATIVITY OF THE APPLICATION — 25%", C.MINT, C.DARK);

  const diff = [
    [I.orch, "Autonomous cross-department resolution", "One question spans Registrar + Bursar + Financial Aid + Advising — and gets answered."],
    [I.bolt, "Zero-touch + confidence scoring", "Routine tickets resolve with no human. Hard ones escalate with a full handoff packet."],
    [I.lang, "Tri-lingual, by design", "Fluent in Filipino, English, and Cebuano — auto-detected from how the student types."],
    [I.bell, "M365-native delivery", "Alerts land in Teams and Outlook — where students already are, not a 4th app."],
  ];
  let dx = 0.6, dy = 3.15;
  diff.forEach((d, i) => {
    const x = dx + (i % 2) * 6.15, y = dy + Math.floor(i / 2) * 1.85;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.9, h: 1.6, fill: { color: C.DARK2 }, line: { color: C.TEALD, width: 1 }, rectRadius: 0.1 });
    s.addShape(p.shapes.OVAL, { x: x + 0.32, y: y + 0.34, w: 0.92, h: 0.92, fill: { color: C.MINT }, line: { type: "none" } });
    s.addImage({ data: d[0].dark, x: x + 0.55, y: y + 0.57, w: 0.46, h: 0.46 });
    s.addText(d[1], { x: x + 1.5, y: y + 0.22, w: 4.2, h: 0.55, fontFace: HF, bold: true, color: C.WHITE, fontSize: 15.5, margin: 0 });
    s.addText(d[2], { x: x + 1.5, y: y + 0.74, w: 4.25, h: 0.75, fontFace: BF, color: C.ICE, fontSize: 11.8, margin: 0 });
  });
  footer(s, 3, true);

  // ============================================================ 4 — UI SHOWCASE (student)
  s = p.addSlide(); s.background = { color: C.WHITE };
  kicker(s, "User Interface");
  title(s, "Built for a phone in a hallway.");
  tag(s, 0.6, 1.82, "SCORED: USER INTERFACE — 30%", C.TEAL, C.WHITE);

  // phone mock helper
  function phone(slide, x, y, headerText, kind) {
    const w = 2.35, h = 4.55;
    slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: C.DARK }, line: { type: "none" }, rectRadius: 0.22, shadow: sh() });
    const sx = x + 0.12, sy = y + 0.12, sw = w - 0.24, sh2 = h - 0.24;
    slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x: sx, y: sy, w: sw, h: sh2, fill: { color: C.WHITE }, line: { type: "none" }, rectRadius: 0.16 });
    // header
    slide.addShape(p.shapes.RECTANGLE, { x: sx, y: sy, w: sw, h: 0.55, fill: { color: C.TEAL }, line: { type: "none" } });
    slide.addText(headerText, { x: sx + 0.18, y: sy, w: sw - 0.3, h: 0.55, valign: "middle", fontFace: HF, bold: true, color: C.WHITE, fontSize: 11, margin: 0 });
    if (kind === "chat") {
      // incoming bubble
      slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x: sx + 0.16, y: sy + 0.75, w: 1.5, h: 0.5, fill: { color: C.PANEL }, line: { type: "none" }, rectRadius: 0.08 });
      slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x: sx + 0.16, y: sy + 1.35, w: 1.75, h: 0.34, fill: { color: C.PANEL }, line: { type: "none" }, rectRadius: 0.08 });
      // status card (rich response)
      slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x: sx + 0.22, y: sy + 1.85, w: 1.7, h: 1.15, fill: { color: C.WHITE }, line: { color: C.MINT, width: 1.5 }, rectRadius: 0.1 });
      slide.addImage({ data: I.check.teal, x: sx + 0.34, y: sy + 1.98, w: 0.26, h: 0.26 });
      slide.addText("Hold lifted", { x: sx + 0.66, y: sy + 1.96, w: 1.2, h: 0.3, fontFace: HF, bold: true, color: C.INK, fontSize: 9.5, margin: 0 });
      slide.addText([{ text: "Balance  ₱0.00", options: { breakLine: true } }, { text: "Aid  Disbursing · 3 days", options: {} }],
        { x: sx + 0.34, y: sy + 2.32, w: 1.55, h: 0.6, fontFace: BF, color: C.BODY, fontSize: 8.5, margin: 0 });
      // outgoing bubble
      slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x: sx + 0.5, y: sy + 3.15, w: 1.4, h: 0.42, fill: { color: C.TEAL }, line: { type: "none" }, rectRadius: 0.08 });
    } else {
      // home: calendar panel + alert
      slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x: sx + 0.16, y: sy + 0.75, w: sw - 0.32, h: 1.0, fill: { color: C.PANEL }, line: { type: "none" }, rectRadius: 0.1 });
      slide.addImage({ data: I.cal.teal, x: sx + 0.3, y: sy + 0.9, w: 0.3, h: 0.3 });
      slide.addText("Academic Calendar", { x: sx + 0.66, y: sy + 0.88, w: 1.4, h: 0.32, fontFace: HF, bold: true, color: C.INK, fontSize: 9.5, margin: 0 });
      slide.addText([{ text: "Enrollment closes · 2d", options: { breakLine: true } }, { text: "Scholarship renewal · 14d", options: {} }],
        { x: sx + 0.3, y: sy + 1.24, w: 1.8, h: 0.5, fontFace: BF, color: C.BODY, fontSize: 8.5, margin: 0 });
      // alert
      slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x: sx + 0.16, y: sy + 1.95, w: sw - 0.32, h: 0.7, fill: { color: C.AMBER }, line: { type: "none" }, rectRadius: 0.1 });
      slide.addText("Deadline in 14 days", { x: sx + 0.3, y: sy + 1.95, w: 1.8, h: 0.7, valign: "middle", fontFace: HF, bold: true, color: C.INK, fontSize: 10, margin: 0 });
      // quick action
      slide.addShape(p.shapes.ROUNDED_RECTANGLE, { x: sx + 0.16, y: sy + 2.85, w: sw - 0.32, h: 0.7, fill: { color: C.TEAL }, line: { type: "none" }, rectRadius: 0.1 });
      slide.addText("New inquiry", { x: sx + 0.16, y: sy + 2.85, w: sw - 0.32, h: 0.7, align: "center", valign: "middle", fontFace: HF, bold: true, color: C.WHITE, fontSize: 11, margin: 0 });
    }
    // replace tag
    slide.addText("▲ wireframe — drop live screenshot", { x: sx, y: sy + sh2 - 0.32, w: sw, h: 0.28, align: "center", fontFace: BF, italic: true, color: C.MUTED, fontSize: 7.5, margin: 0 });
  }
  phone(s, 1.05, 2.45, "Archon  ·  Chat", "chat");
  phone(s, 3.75, 2.45, "Archon  ·  Home", "home");

  // right column feature notes
  const ux = [
    ["Mobile-first, 375px", "Designed for the most common Philippine phone screen — not a desktop afterthought."],
    ["Streams on 3G", "First token in under 3 seconds, even on provincial campus connections."],
    ["Rich status cards", "Balances, holds, and deadlines render as glanceable cards — not walls of text."],
    ["One-tap actions", "Quick actions and consent prompts keep the friction budget near zero."],
  ];
  let uy = 2.55;
  ux.forEach(([h, b]) => {
    s.addShape(p.shapes.RECTANGLE, { x: 6.85, y: uy + 0.05, w: 0.09, h: 0.95, fill: { color: C.MINT }, line: { type: "none" } });
    s.addText(h, { x: 7.1, y: uy, w: 5.6, h: 0.38, fontFace: HF, bold: true, color: C.INK, fontSize: 16, margin: 0 });
    s.addText(b, { x: 7.1, y: uy + 0.4, w: 5.55, h: 0.6, fontFace: BF, color: C.BODY, fontSize: 12.5, margin: 0 });
    uy += 1.12;
  });
  footer(s, 4, false);

  // ============================================================ 5 — UI SHOWCASE (staff)
  s = p.addSlide(); s.background = { color: C.WHITE };
  kicker(s, "User Interface");
  title(s, "Two products. One system.");
  s.addText("Students get a calm, simple chat. Staff get a power tool. Both ship from the same Next.js codebase.",
    { x: 0.6, y: 1.78, w: 11.8, h: 0.4, fontFace: BF, color: C.BODY, fontSize: 14.5, margin: 0 });

  // browser/laptop frame with dashboard mock
  const bx = 0.85, by = 2.5, bw = 7.4, bh = 4.0;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: bx, y: by, w: bw, h: bh, fill: { color: C.WHITE }, line: { color: C.LINE, width: 1 }, rectRadius: 0.08, shadow: sh() });
  s.addShape(p.shapes.RECTANGLE, { x: bx, y: by, w: bw, h: 0.42, fill: { color: C.PANEL }, line: { type: "none" } });
  [0, 1, 2].forEach(i => s.addShape(p.shapes.OVAL, { x: bx + 0.2 + i * 0.22, y: by + 0.14, w: 0.13, h: 0.13, fill: { color: i === 0 ? C.AMBER : C.LINE }, line: { type: "none" } }));
  s.addText("Agent Dashboard", { x: bx + 1.0, y: by, w: 3, h: 0.42, valign: "middle", fontFace: BF, color: C.MUTED, fontSize: 10, margin: 0 });
  // sidebar
  s.addShape(p.shapes.RECTANGLE, { x: bx, y: by + 0.42, w: 1.5, h: bh - 0.42, fill: { color: C.DARK }, line: { type: "none" } });
  ["Queue", "Tickets", "Handoffs", "Analytics"].forEach((m, i) =>
    s.addText(m, { x: bx + 0.2, y: by + 0.75 + i * 0.5, w: 1.2, h: 0.35, fontFace: HF, bold: i === 0, color: i === 0 ? C.MINT : C.ICE, fontSize: 11, margin: 0 }));
  // queue rows
  const rows = [["Mara S.", "Hold + aid delay", "0.93"], ["Jay R.", "Balance dispute", "0.71"], ["Ana L.", "Enrollment verify", "0.88"]];
  rows.forEach((r, i) => {
    const ry = by + 0.75 + i * 0.72;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: bx + 1.7, y: ry, w: 5.5, h: 0.58, fill: { color: C.PANEL }, line: { type: "none" }, rectRadius: 0.06 });
    s.addText(r[0], { x: bx + 1.85, y: ry, w: 1.3, h: 0.58, valign: "middle", fontFace: HF, bold: true, color: C.INK, fontSize: 11, margin: 0 });
    s.addText(r[1], { x: bx + 3.15, y: ry, w: 2.4, h: 0.58, valign: "middle", fontFace: BF, color: C.BODY, fontSize: 10.5, margin: 0 });
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: bx + 6.15, y: ry + 0.13, w: 0.9, h: 0.32, fill: { color: C.MINT }, line: { type: "none" }, rectRadius: 0.16 });
    s.addText("AI " + r[2], { x: bx + 6.15, y: ry + 0.13, w: 0.9, h: 0.32, align: "center", valign: "middle", fontFace: HF, bold: true, color: C.DARK, fontSize: 9, margin: 0 });
  });
  s.addText("▲ wireframe — drop live screenshot", { x: bx, y: by + bh - 0.32, w: bw, h: 0.28, align: "center", fontFace: BF, italic: true, color: C.MUTED, fontSize: 8, margin: 0 });

  // right notes
  const staff = [
    [I.agent, "AI-suggested replies", "Each ticket arrives with a confidence score and an editable, one-click response."],
    [I.swap, "Context-preserving handoff", "The student never repeats their story — the full packet travels with the ticket."],
    [I.cogs, "Admin analytics", "Cost-per-ticket, deflection rate, and CSAT — the numbers leaders ask for."],
  ];
  let sy2 = 2.6;
  staff.forEach(([ic, h, b]) => {
    s.addShape(p.shapes.OVAL, { x: 8.7, y: sy2, w: 0.7, h: 0.7, fill: { color: C.PANEL }, line: { type: "none" } });
    s.addImage({ data: ic.teal, x: 8.86, y: sy2 + 0.16, w: 0.38, h: 0.38 });
    s.addText(h, { x: 9.55, y: sy2 - 0.02, w: 3.4, h: 0.4, fontFace: HF, bold: true, color: C.INK, fontSize: 15, margin: 0 });
    s.addText(b, { x: 9.55, y: sy2 + 0.38, w: 3.45, h: 0.8, fontFace: BF, color: C.BODY, fontSize: 12, margin: 0 });
    sy2 += 1.35;
  });
  footer(s, 5, false);

  // ============================================================ 6 — HOW IT WORKS
  s = p.addSlide(); s.background = { color: C.WHITE };
  kicker(s, "How It Works");
  title(s, "From question to resolution — autonomously.");
  tag(s, 0.6, 1.82, "SCORED: FUNCTIONALITY & USER EXPERIENCE — 20%", C.TEAL, C.WHITE);

  const steps = [
    [I.chat, "1 · Ask", "Student types in Filipino, English, or Cebuano."],
    [I.brain, "2 · Orchestrate", "Azure AI Foundry plans which systems to query."],
    [I.layers, "3 · Pull data", "Adapters read Registrar, Bursar, FA & Advising."],
    [I.check, "4 · Resolve", "Synthesizes a diagnosis and acts (HITL on writes)."],
  ];
  let stx = 0.85;
  steps.forEach((st, i) => {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: stx, y: 2.7, w: 2.6, h: 2.3, fill: { color: C.PANEL }, line: { type: "none" }, rectRadius: 0.1 });
    s.addShape(p.shapes.OVAL, { x: stx + 0.95, y: 2.95, w: 0.7, h: 0.7, fill: { color: C.TEAL }, line: { type: "none" } });
    s.addImage({ data: st[0].white, x: stx + 1.12, y: 3.12, w: 0.36, h: 0.36 });
    s.addText(st[1], { x: stx + 0.15, y: 3.8, w: 2.3, h: 0.4, align: "center", fontFace: HF, bold: true, color: C.INK, fontSize: 15, margin: 0 });
    s.addText(st[2], { x: stx + 0.2, y: 4.2, w: 2.2, h: 0.75, align: "center", fontFace: BF, color: C.BODY, fontSize: 11.5, margin: 0 });
    if (i < steps.length - 1) s.addImage({ data: I.send.teal, x: stx + 2.66, y: 3.72, w: 0.34, h: 0.34 });
    stx += 3.05;
  });
  // branch outcomes
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.85, y: 5.35, w: 5.8, h: 1.15, fill: { color: C.DARK2 }, line: { type: "none" }, rectRadius: 0.1 });
  s.addImage({ data: I.bolt.mint, x: 1.1, y: 5.62, w: 0.5, h: 0.5 });
  s.addText([{ text: "Zero-touch resolution  ", options: { bold: true, color: C.WHITE, fontSize: 15, breakLine: true } },
    { text: "Routine tickets close instantly — target ≥30% deflection.", options: { color: C.ICE, fontSize: 11.5 } }],
    { x: 1.75, y: 5.5, w: 4.8, h: 0.9, valign: "middle", fontFace: HF, margin: 0 });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 6.95, y: 5.35, w: 5.85, h: 1.15, fill: { color: C.TEAL }, line: { type: "none" }, rectRadius: 0.1 });
  s.addImage({ data: I.agent.white, x: 7.2, y: 5.62, w: 0.5, h: 0.5 });
  s.addText([{ text: "Human handoff  ", options: { bold: true, color: C.WHITE, fontSize: 15, breakLine: true } },
    { text: "Hard cases escalate with a full context packet + Teams/Outlook alert.", options: { color: C.WHITE, fontSize: 11.5 } }],
    { x: 7.85, y: 5.5, w: 4.8, h: 0.9, valign: "middle", fontFace: HF, margin: 0 });
  footer(s, 6, false);

  // ============================================================ 7 — DATA MODEL (dark)
  s = p.addSlide(); s.background = { color: C.DARK };
  kicker(s, "Data Model Design", C.MINT);
  s.addText("One database. Isolated, expiring, searchable.", { x: 0.58, y: 0.92, w: 12, h: 0.9, fontFace: HF, bold: true, color: C.WHITE, fontSize: 33, margin: 0 });
  tag(s, 0.6, 1.82, "SCORED: DATA MODEL DESIGN — 25%", C.MINT, C.DARK);

  // containers
  s.addText("Azure Cosmos DB · 6 containers", { x: 0.6, y: 2.45, w: 6, h: 0.35, fontFace: HF, bold: true, color: C.ICE, fontSize: 13, charSpacing: 1, margin: 0 });
  const cont = [
    [I.users, "users"], [I.comments, "conversations"], [I.msg, "messages"],
    [I.swap, "handoffs"], [I.search, "policy_embeddings"], [I.clock, "cache_university_data"],
  ];
  cont.forEach((c, i) => {
    const x = 0.6 + (i % 2) * 3.25, y = 2.85 + Math.floor(i / 2) * 0.74;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.15, h: 0.62, fill: { color: C.DARK2 }, line: { color: C.TEALD, width: 1 }, rectRadius: 0.08 });
    s.addImage({ data: c[0].mint, x: x + 0.2, y: y + 0.16, w: 0.3, h: 0.3 });
    s.addText(c[1], { x: x + 0.62, y, w: 2.4, h: 0.62, valign: "middle", fontFace: "Consolas", color: C.WHITE, fontSize: 12.5, margin: 0 });
  });
  s.addText("Partition key  /institution_id  on every container", { x: 0.6, y: 5.15, w: 6.6, h: 0.35, fontFace: "Consolas", color: C.MINT, fontSize: 11.5, margin: 0 });

  // design decisions (the "why")
  const dec = [
    [I.shield, "Isolation by design", "/institution_id partition → multi-tenant data separation + DPA 2012 compliance."],
    [I.clock, "Lifecycle built in", "TTL: messages & handoffs 90d (data minimization); university cache 5 min (fresh + cheap)."],
    [I.search, "Recall in the same store", "Vector search over policy_embeddings powers RAG — no bolt-on vector DB."],
    [I.life, "Graceful degradation", "Mock-adapter fallback keeps the app running when a university API is down."],
  ];
  let ddx = 7.2, ddy = 2.55;
  dec.forEach((d, i) => {
    const y = ddy + i * 1.05;
    s.addShape(p.shapes.OVAL, { x: ddx, y, w: 0.66, h: 0.66, fill: { color: C.MINT }, line: { type: "none" } });
    s.addImage({ data: d[0].dark, x: ddx + 0.16, y: y + 0.16, w: 0.34, h: 0.34 });
    s.addText(d[1], { x: ddx + 0.85, y: y - 0.04, w: 5.2, h: 0.36, fontFace: HF, bold: true, color: C.WHITE, fontSize: 14.5, margin: 0 });
    s.addText(d[2], { x: ddx + 0.85, y: y + 0.34, w: 5.25, h: 0.65, fontFace: BF, color: C.ICE, fontSize: 11.3, margin: 0 });
  });
  footer(s, 7, true);

  // ============================================================ 8 — INTEGRATIONS
  s = p.addSlide(); s.background = { color: C.WHITE };
  kicker(s, "Integrations");
  title(s, "Native to the tools students already use.");
  s.addText("No new account. No new app. Archon plugs into the university's existing Microsoft 365 tenant.",
    { x: 0.6, y: 1.78, w: 11.8, h: 0.4, fontFace: BF, color: C.BODY, fontSize: 14.5, margin: 0 });

  const groups = [
    ["IDENTITY", [[I.lock, "Microsoft Entra ID", "Single sign-on (OIDC) with the student's existing university account."]]],
    ["AI", [[I.brain, "Azure AI Foundry", "GPT-4o for reasoning + Phi-4 for low-cost intent routing."]]],
    ["DATA", [[I.db, "Azure Cosmos DB", "NoSQL records + native vector search in one serverless store."]]],
    ["DELIVERY", [[I.ms, "Microsoft Graph", "Calendar panel, Teams adaptive cards & Outlook digests."]]],
  ];
  let gx = 0.85;
  groups.forEach(([label, items]) => {
    s.addText(label, { x: gx, y: 2.55, w: 2.8, h: 0.3, fontFace: HF, bold: true, color: C.TEAL, fontSize: 12, charSpacing: 2, margin: 0 });
    const [ic, h, b] = items[0];
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: gx, y: 2.95, w: 2.85, h: 2.9, fill: { color: C.PANEL }, line: { type: "none" }, rectRadius: 0.1 });
    s.addShape(p.shapes.OVAL, { x: gx + 0.3, y: 3.25, w: 0.95, h: 0.95, fill: { color: C.WHITE }, line: { type: "none" }, shadow: sh() });
    s.addImage({ data: ic.teal, x: gx + 0.53, y: 3.48, w: 0.49, h: 0.49 });
    s.addText(h, { x: gx + 0.28, y: 4.35, w: 2.4, h: 0.6, fontFace: HF, bold: true, color: C.INK, fontSize: 15, margin: 0 });
    s.addText(b, { x: gx + 0.28, y: 4.95, w: 2.4, h: 0.8, fontFace: BF, color: C.BODY, fontSize: 11.5, margin: 0 });
    gx += 3.12;
  });
  // build line
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.85, y: 6.2, w: 11.95, h: 0.62, fill: { color: C.DARK }, line: { type: "none" }, rectRadius: 0.1 });
  s.addText([{ text: "Shipped on  ", options: { color: C.ICE } }, { text: "Next.js 16", options: { bold: true, color: C.WHITE } },
    { text: "  ·  full-stack monolith deployed on  ", options: { color: C.ICE } }, { text: "Vercel", options: { bold: true, color: C.WHITE } },
    { text: "  (Serverless + Edge)", options: { color: C.ICE } }],
    { x: 0.85, y: 6.2, w: 11.95, h: 0.62, align: "center", valign: "middle", fontFace: HF, fontSize: 13.5, margin: 0 });
  footer(s, 8, false);

  // ============================================================ 9 — IMPACT + CTA (dark)
  s = p.addSlide(); s.background = { color: C.DARK };
  s.addShape(p.shapes.OVAL, { x: -1.6, y: 4.4, w: 5, h: 5, fill: { color: C.TEAL, transparency: 82 }, line: { type: "none" } });
  kicker(s, "The Payoff", C.MINT);
  s.addText("From cost center to resolution engine.", { x: 0.58, y: 0.92, w: 12, h: 0.9, fontFace: HF, bold: true, color: C.WHITE, fontSize: 33, margin: 0 });

  const stats = [
    ["₱104 → ₱22", "cost per ticket", "≈79% lower"],
    ["≥30%", "tickets resolved", "zero-touch"],
    ["24/7", "always on", "3 languages"],
  ];
  let px2 = 0.85;
  stats.forEach((st) => {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: px2, y: 2.2, w: 3.75, h: 2.05, fill: { color: C.DARK2 }, line: { color: C.TEALD, width: 1 }, rectRadius: 0.1 });
    s.addText(st[0], { x: px2 + 0.2, y: 2.42, w: 3.35, h: 0.9, align: "center", fontFace: HF, bold: true, color: C.AMBER, fontSize: 34, margin: 0 });
    s.addText(st[1], { x: px2 + 0.2, y: 3.35, w: 3.35, h: 0.35, align: "center", fontFace: BF, color: C.WHITE, fontSize: 14, margin: 0 });
    s.addText(st[2], { x: px2 + 0.2, y: 3.7, w: 3.35, h: 0.35, align: "center", fontFace: HF, bold: true, color: C.MINT, fontSize: 12, charSpacing: 1, margin: 0 });
    px2 += 4.0;
  });

  // CTA / QR
  s.addText("Try Archon", { x: 0.85, y: 4.85, w: 6, h: 0.6, fontFace: HF, bold: true, color: C.WHITE, fontSize: 24, margin: 0 });
  s.addText("Scan to open the live app on your phone.", { x: 0.87, y: 5.5, w: 6, h: 0.4, fontFace: BF, color: C.ICE, fontSize: 14, margin: 0 });
  s.addImage({ path: LOGO, x: 0.87, y: 6.05, w: 0.7, h: 0.7 });
  s.addText("Team Axon Enjin", { x: 1.7, y: 6.05, w: 5, h: 0.35, fontFace: HF, bold: true, color: C.WHITE, fontSize: 13, margin: 0 });
  s.addText("Dela Torre · Sales Jr. · Tiu", { x: 1.7, y: 6.4, w: 5, h: 0.35, fontFace: BF, color: C.ICE, fontSize: 11.5, margin: 0 });
  // QR placeholder
  const qx = 10.0, qy = 4.8;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: qx, y: qy, w: 2.3, h: 2.3, fill: { color: C.WHITE }, line: { type: "none" }, rectRadius: 0.08, shadow: sh() });
  s.addImage({ data: I.qr.dark, x: qx + 0.5, y: qy + 0.42, w: 1.3, h: 1.3 });
  s.addText("link your Vercel URL", { x: qx, y: qy + 1.8, w: 2.3, h: 0.35, align: "center", fontFace: BF, italic: true, color: C.MUTED, fontSize: 9.5, margin: 0 });

  await p.writeFile({ fileName: path.join(__dirname, "Archon-KPMG-Pitch.pptx") });
  console.log("OK wrote Archon-KPMG-Pitch.pptx");
})();
