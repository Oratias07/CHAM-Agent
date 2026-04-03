import React from 'react';

interface CodeBlockWithLineNumbersProps {
  code: string;
  maxHeight?: string;
}

const CodeBlockWithLineNumbers: React.FC<CodeBlockWithLineNumbersProps> = ({ code, maxHeight = '400px' }) => {
  const lines = code?.split('\n') || [''];

  return (
    <div
      style={{
        background: '#0f0f1a',
        borderRadius: '8px',
        overflow: 'auto',
        maxHeight,
        direction: 'ltr',
        textAlign: 'left',
      }}
    >
      <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' }}>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              <td
                style={{
                  padding: '0 12px',
                  color: '#475569',
                  textAlign: 'right',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  borderRight: '1px solid #1e293b',
                  verticalAlign: 'top',
                  width: '1px',
                }}
              >
                {i + 1}
              </td>
              <td
                style={{
                  padding: '0 16px',
                  color: '#a5f3fc',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {line || '\u00A0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CodeBlockWithLineNumbers;
