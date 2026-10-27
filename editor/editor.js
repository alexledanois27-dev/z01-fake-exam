import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  StreamLanguage,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { javascript } from "@codemirror/lang-javascript";
import { go } from "@codemirror/legacy-modes/mode/go";
import { rust } from "@codemirror/legacy-modes/mode/rust";
import { java } from "@codemirror/legacy-modes/mode/clike";
import { oneDark } from "@codemirror/theme-one-dark";

const languages = {
  go: StreamLanguage.define(go),
  rust: StreamLanguage.define(rust),
  java: StreamLanguage.define(java),
  js: javascript(),
};
const words = {
  go: [
    "func",
    "return",
    "package",
    "import",
    "var",
    "const",
    "for",
    "range",
    "if",
    "else",
    "switch",
    "case",
    "append",
    "len",
    "make",
    "string",
    "int",
    "bool",
    "fmt.Println",
    "fmt.Print",
  ],
  js: [
    "function",
    "return",
    "const",
    "let",
    "for",
    "if",
    "else",
    "map",
    "filter",
    "reduce",
    "console.log",
  ],
  rust: [
    "fn",
    "let",
    "mut",
    "return",
    "impl",
    "struct",
    "match",
    "for",
    "if",
    "else",
    "String",
    "Vec",
    "println!",
  ],
  java: [
    "public",
    "class",
    "static",
    "void",
    "return",
    "new",
    "String",
    "int",
    "for",
    "if",
    "else",
    "System.out.println",
  ],
};

export function create({
  parent,
  onChange,
  onRun,
  onPosition,
  ariaLabel = "Éditeur de code",
}) {
  const language = new Compartment();
  const indentation = new Compartment();
  const access = new Compartment();
  let readOnly = false;
  let identity = "";
  let track = "go";
  let view;
  const states = new Map();
  const completion = (context) => {
    const word = context.matchBefore(/[\w.]+/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    const found = new Set(words[track] || []);
    for (const match of context.state.doc
      .toString()
      .matchAll(/\b[A-Za-z_]\w{2,}\b/g))
      found.add(match[0]);
    return {
      from: word.from,
      options: [...found].map((label) => ({ label, type: "text" })),
      validFor: /[\w.]*/,
    };
  };
  const extensions = () => [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    oneDark,
    language.of(languages[track] || languages.go),
    autocompletion({ override: [completion] }),
    keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          onRun();
          return true;
        },
      },
      indentWithTab,
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
    ]),
    access.of([
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
    ]),
    EditorState.tabSize.of(4),
    indentation.of(indentUnit.of(track === "go" ? "\t" : "    ")),
    EditorState.phrases.of({
      Find: "Rechercher",
      Replace: "Remplacer",
      next: "suivant",
      previous: "précédent",
      all: "tout",
      "match case": "respecter la casse",
      regexp: "expression régulière",
      "by word": "mot entier",
      replace: "remplacer",
      "replace all": "tout remplacer",
      close: "fermer",
      "No diagnostics": "Aucun diagnostic",
    }),
    EditorView.contentAttributes.of({
      "aria-label": ariaLabel,
      spellcheck: "false",
    }),
    EditorView.theme({
      "&": { height: "100%", backgroundColor: "#11151d" },
      ".cm-scroller": {
        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
        fontSize: "var(--code-size, 13px)",
        lineHeight: "1.7",
        overflow: "auto",
      },
      ".cm-content": { padding: "18px 0" },
      ".cm-line": { padding: "0 16px" },
      ".cm-gutters": {
        backgroundColor: "#11151d",
        border: "none",
        color: "#626d82",
      },
      ".cm-activeLine": { backgroundColor: "#ffffff04" },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent",
        color: "#ced6e6",
      },
      "&.cm-focused": { outline: "none" },
      ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
        backgroundColor: "#34446a",
      },
      ".cm-tooltip": {
        border: "1px solid #36415a",
        borderRadius: "8px",
        backgroundColor: "#202838",
      },
      ".cm-panels": { backgroundColor: "#1a2130", color: "#e4e9f2" },
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange(update.state.doc.toString());
      if (onPosition && (update.docChanged || update.selectionSet)) {
        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        onPosition({ line: line.number, column: head - line.from + 1 });
      }
    }),
  ];
  const state = (doc) => EditorState.create({ doc, extensions: extensions() });
  view = new EditorView({ state: state(""), parent });
  return {
    setDocument(code, key, nextTrack) {
      track = nextTrack;
      if (key !== identity) {
        if (identity) states.set(identity, view.state);
        identity = key;
        const saved = states.get(key);
        view.setState(
          saved && saved.doc.toString() === code ? saved : state(code),
        );
        view.dispatch({
          effects: [
            language.reconfigure(languages[track] || languages.go),
            indentation.reconfigure(
              indentUnit.of(track === "go" ? "\t" : "    "),
            ),
            access.reconfigure([
              EditorState.readOnly.of(readOnly),
              EditorView.editable.of(!readOnly),
            ]),
          ],
        });
      } else if (view.state.doc.toString() !== code) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: code },
        });
      }
      if (onPosition) {
        const head = view.state.selection.main.head;
        const line = view.state.doc.lineAt(head);
        onPosition({ line: line.number, column: head - line.from + 1 });
      }
    },
    setReadOnly(value) {
      if (readOnly === !!value) return;
      readOnly = !!value;
      view.dispatch({
        effects: access.reconfigure([
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
        ]),
      });
    },
    getCode: () => view.state.doc.toString(),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
