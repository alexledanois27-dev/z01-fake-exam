const markedLib = typeof window !== "undefined" ? window.marked : undefined;

if (markedLib) {
  markedLib.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false,
  });
}

function fallbackMarkdownToHtml(md) {
  if (!md) return "";

  if (/<[a-z][\s\S]*>/i.test(md)) return md.trim();

  const codeBlocks = [];
  let processed = md.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
    const id = `@@CODE${codeBlocks.length}@@`;
    codeBlocks.push({ lang: lang || "", code });
    return id;
  });

  const lines = processed.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${escapeHtml(h[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (line.trim().match(/^[-*+]\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].trim().match(/^[-*+]\s+/)) {
        items.push(escapeHtml(lines[i].trim().replace(/^[-*+]\s+/, "")));
        i++;
      }
      out.push("<ul>" + items.map((it) => `<li>${it}</li>`).join("") + "</ul>");
      continue;
    }

    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "") {
      para.push(lines[i]);
      i++;
    }
    let paragraph = para.join(" ");
    paragraph = paragraph.replace(
      /`([^`]+)`/g,
      (m, c) => `<code>${escapeHtml(c)}</code>`,
    );
    out.push(
      "<p>" +
        escapeHtml(paragraph).replace(
          /&lt;code&gt;(.*?)&lt;\/code&gt;/g,
          "<code>$1</code>",
        ) +
        "</p>",
    );
  }

  let html = out.join("\n");

  html = html.replace(/@@CODE(\d+)@@/g, (m, idx) => {
    const cb = codeBlocks[Number(idx)];
    if (!cb) return "";
    const codeEsc = escapeHtml(cb.code);
    return `<pre><code${cb.lang ? ` data-lang="${cb.lang}"` : ""}>${codeEsc}</code></pre>`;
  });

  return html;
}

// Imported statements are documents, never application controls or page styles.
const markdownSanitizeOptions = {
  FORBID_TAGS: [
    "style",
    "form",
    "input",
    "button",
    "textarea",
    "select",
    "option",
  ],
  FORBID_ATTR: ["style", "autofocus"],
};

function markdownToHtml(md) {
  if (!md) return "";
  if (typeof DOMPurify === "undefined" || !DOMPurify.isSupported)
    return escapeHtml(md);
  if (markedLib && typeof markedLib.parse === "function") {
    return DOMPurify.sanitize(markedLib.parse(md), markdownSanitizeOptions);
  }
  return DOMPurify.sanitize(
    fallbackMarkdownToHtml(md),
    markdownSanitizeOptions,
  );
}

function highlightMarkdownCode(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll('a[href^="https://"], a[href^="http://"]').forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
  const blocks = containerEl.querySelectorAll("pre code");
  blocks.forEach((codeEl) => {
    const raw = codeEl.textContent || "";
    const html = highlightGo(raw);
    codeEl.innerHTML = html + (raw.endsWith("\n") ? "\n" : "");
  });
}
