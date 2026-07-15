import { useEffect, useRef } from 'react';
import { EditorView, placeholder as placeholderExt } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { basicSetup } from 'codemirror';
import { createPmAutocomplete } from '../../utils/pmAutocomplete';
import { catppuccinMocha, catppuccinHighlight } from '../../utils/editorTheme';

interface Props {
  value: string;
  onChange: (value: string) => void;
  language: 'javascript' | 'json' | 'xml' | 'text';
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
  lineWrapping?: boolean;
}

export default function CodeEditor({ value, onChange, language, placeholder, minHeight = '150px', readOnly = false, lineWrapping = false }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [basicSetup, catppuccinMocha, catppuccinHighlight];

    if (!readOnly) {
      extensions.push(EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }));
    }

    if (readOnly) {
      extensions.push(EditorView.editable.of(false));
    }

    if (lineWrapping) {
      extensions.push(EditorView.lineWrapping);
    }

    if (placeholder) {
      extensions.push(placeholderExt(placeholder));
    }

    if (language === 'javascript') {
      extensions.push(javascript());
      extensions.push(createPmAutocomplete());
    } else if (language === 'json') {
      extensions.push(json());
    } else if (language === 'xml') {
      extensions.push(xml());
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only recreate editor when language/placeholder changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, placeholder]);

  // Sync external value changes to editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      style={{
        minHeight,
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    />
  );
}
