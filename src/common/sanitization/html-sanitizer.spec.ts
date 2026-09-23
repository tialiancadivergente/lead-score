import { sanitizeRichTextHtml } from './html-sanitizer';

describe('sanitizeRichTextHtml', () => {
  it('removes scripts, event handlers and javascript links', () => {
    expect(
      sanitizeRichTextHtml(
        '<p onclick="alert(1)">Oi<script>alert(1)</script><a href="javascript:alert(1)">link</a></p>',
      ),
    ).toBe('<p>Oialert(1)<a>link</a></p>');
  });

  it('keeps allowed formatting and restricts style properties', () => {
    expect(
      sanitizeRichTextHtml(
        '<span style="color: #fff; font-weight: 700; background: red">Texto</span>',
      ),
    ).toBe('<span style="color: #fff; font-weight: 700">Texto</span>');
  });

  it('forces rel on safe links', () => {
    expect(
      sanitizeRichTextHtml('<a href="https://example.com" target="_blank">go</a>'),
    ).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">go</a>',
    );
  });
});
