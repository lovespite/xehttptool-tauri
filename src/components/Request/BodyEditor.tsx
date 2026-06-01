import type { RequestBody, BodyType } from '../../types';
import KeyValueTable from '../common/KeyValueTable';
import CodeEditor from '../common/CodeEditor';
import styles from './Request.module.css';

interface Props {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
}

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'text', label: 'Text' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'x-www-form-urlencoded', label: 'URL-Encoded' },
];

function getLanguage(type: BodyType): 'json' | 'xml' | 'text' {
  switch (type) {
    case 'json': return 'json';
    case 'xml': return 'xml';
    default: return 'text';
  }
}

export default function BodyEditor({ body, onChange }: Props) {
  const handleTypeChange = (type: BodyType) => {
    onChange({ ...body, type });
  };

  if (body.type === 'none') {
    return (
      <div className={styles.bodyEditor}>
        <div className={styles.bodyTypeBar}>
          {BODY_TYPES.map((bt) => (
            <button
              key={bt.value}
              className={`${styles.bodyTypeBtn} ${body.type === bt.value ? styles.bodyTypeActive : ''}`}
              onClick={() => handleTypeChange(bt.value)}
            >
              {bt.label}
            </button>
          ))}
        </div>
        <div className={styles.bodyNone}>This request does not have a body</div>
      </div>
    );
  }

  if (body.type === 'form-data' || body.type === 'x-www-form-urlencoded') {
    return (
      <div className={styles.bodyEditor}>
        <div className={styles.bodyTypeBar}>
          {BODY_TYPES.map((bt) => (
            <button
              key={bt.value}
              className={`${styles.bodyTypeBtn} ${body.type === bt.value ? styles.bodyTypeActive : ''}`}
              onClick={() => handleTypeChange(bt.value)}
            >
              {bt.label}
            </button>
          ))}
        </div>
        <KeyValueTable
          items={body.formData ?? []}
          onChange={(items) => onChange({ ...body, formData: items })}
          keyPlaceholder="Key"
          valuePlaceholder="Value"
        />
      </div>
    );
  }

  return (
    <div className={styles.bodyEditor}>
      <div className={styles.bodyTypeBar}>
        {BODY_TYPES.map((bt) => (
          <button
            key={bt.value}
            className={`${styles.bodyTypeBtn} ${body.type === bt.value ? styles.bodyTypeActive : ''}`}
            onClick={() => handleTypeChange(bt.value)}
          >
            {bt.label}
          </button>
        ))}
      </div>
      <CodeEditor
        value={body.raw ?? ''}
        onChange={(raw) => onChange({ ...body, raw })}
        language={getLanguage(body.type)}
        placeholder={`Enter ${body.type.toUpperCase()} content here...`}
        minHeight="200px"
      />
    </div>
  );
}
