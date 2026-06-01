import { EditorView } from '@codemirror/view';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Catppuccin Mocha syntax colors
const bg = '#1e1e2e';
const pink = '#f5c2e7';
const mauve = '#cba6f7';
const red = '#f38ba8';
const peach = '#fab387';
const yellow = '#f9e2af';
const green = '#a6e3a1';
const blue = '#89b4fa';
const sky = '#89dceb';
const lavender = '#b4befe';
const text = '#cdd6f4';
const subtext0 = '#a6adc8';
const overlay0 = '#6c7086';
const surface0 = '#9e9ea7';

const catppuccinHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: mauve },
  { tag: [tags.definitionKeyword, tags.modifier], color: mauve },
  { tag: [tags.atom, tags.bool, tags.null], color: peach },
  { tag: tags.number, color: peach },
  { tag: tags.string, color: green },
  { tag: [tags.escape, tags.regexp], color: green },
  { tag: tags.variableName, color: text },
  { tag: [tags.self, tags.definition(tags.variableName)], color: blue },
  { tag: tags.propertyName, color: blue },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: blue },
  { tag: tags.definition(tags.function(tags.variableName)), color: blue },
  { tag: tags.function(tags.name), color: blue },
  { tag: tags.comment, color: overlay0, fontStyle: 'italic' },
  { tag: tags.typeName, color: yellow },
  { tag: tags.className, color: yellow },
  { tag: tags.tagName, color: mauve },
  { tag: tags.attributeName, color: blue },
  { tag: tags.attributeValue, color: green },
  { tag: tags.operator, color: sky },
  { tag: tags.punctuation, color: subtext0 },
  { tag: tags.separator, color: surface0 },
  { tag: tags.bracket, color: text },
  { tag: tags.meta, color: pink },
  { tag: tags.labelName, color: blue },
  { tag: tags.changed, color: peach },
  { tag: tags.deleted, color: red },
  { tag: tags.inserted, color: green },
  { tag: tags.link, color: sky, textDecoration: 'underline' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.heading, color: mauve, fontWeight: 'bold' },
  { tag: tags.processingInstruction, color: pink },
  { tag: tags.namespace, color: yellow },
  { tag: tags.escape, color: pink },
]);

export const catppuccinHighlight = syntaxHighlighting(catppuccinHighlightStyle);

export const catppuccinMocha = EditorView.theme({
  '&': {
    backgroundColor: bg,
    color: text,
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
    fontSize: '13px',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    caretColor: lavender,
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: lavender,
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(137, 180, 250, 0.25)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(137, 180, 250, 0.06)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(137, 180, 250, 0.15)',
  },
  '.cm-gutters': {
    backgroundColor: '#181825',
    color: overlay0,
    border: 'none',
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
    fontSize: '12px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(137, 180, 250, 0.08)',
  },
  '.cm-foldGutter .cm-gutterElement': {
    cursor: 'pointer',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(137, 180, 250, 0.2)',
    outline: '1px solid rgba(137, 180, 250, 0.4)',
  },
  '.cm-nonmatchingBracket': {
    backgroundColor: 'rgba(243, 139, 168, 0.2)',
    outline: '1px solid rgba(243, 139, 168, 0.4)',
  },
  '.cm-placeholder': {
    color: overlay0,
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
    fontSize: '13px',
  },
  '.cm-tooltip': {
    backgroundColor: '#181825',
    border: '1px solid #313244',
    color: text,
  },
  '.cm-tooltip.cm-tooltip-autocomplete ul li': {
    color: text,
    fontFamily: "'Cascadia Code', 'Fira Code', monospace",
    fontSize: '12px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'rgba(137, 180, 250, 0.15)',
    color: text,
  },
  '.cm-scroller': {
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  },
}, { dark: true });
