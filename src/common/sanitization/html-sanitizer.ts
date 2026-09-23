const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'i',
  'li',
  'ol',
  'p',
  's',
  'span',
  'strong',
  'u',
  'ul',
]);

const ALLOWED_ATTRIBUTES = new Set(['class', 'href', 'rel', 'style', 'target']);
const ALLOWED_STYLE_PROPERTIES = new Set(['color', 'font-size', 'font-weight']);

export function sanitizeRichTextHtml(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g,
      (fullTag: string, tagName: string, rawAttributes: string) => {
        const tag = tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) return '';
        if (fullTag.startsWith('</')) return `</${tag}>`;
        if (tag === 'br') return '<br>';

        const attributes = sanitizeAttributes(tag, rawAttributes);
        return attributes ? `<${tag} ${attributes}>` : `<${tag}>`;
      },
    )
    .trim();
}

function sanitizeAttributes(tag: string, rawAttributes: string): string {
  const attributes: string[] = [];
  const attrRegex = /([^\s"'<>/=]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(rawAttributes)) !== null) {
    const name = match[1].toLowerCase();
    if (!ALLOWED_ATTRIBUTES.has(name)) continue;
    if (name.startsWith('on') || name === 'srcset' || name === 'formaction') {
      continue;
    }

    const value = match[3] ?? match[4] ?? match[5] ?? '';
    if (name === 'href') {
      if (tag !== 'a' || !isSafeHref(value)) continue;
      attributes.push(`href="${escapeAttribute(value)}"`);
      continue;
    }

    if (name === 'target') {
      if (tag !== 'a' || !['_blank', '_self'].includes(value)) continue;
      attributes.push(`target="${value}"`);
      continue;
    }

    if (name === 'rel') {
      if (tag !== 'a') continue;
      attributes.push('rel="noopener noreferrer"');
      continue;
    }

    if (name === 'style') {
      const style = sanitizeStyle(value);
      if (style) attributes.push(`style="${escapeAttribute(style)}"`);
      continue;
    }

    if (name === 'class') {
      const className = value
        .split(/\s+/)
        .filter((item) => /^[a-zA-Z0-9_-]+$/.test(item))
        .join(' ');
      if (className) attributes.push(`class="${escapeAttribute(className)}"`);
    }
  }

  if (tag === 'a' && attributes.some((attr) => attr.startsWith('href='))) {
    const hasRel = attributes.some((attr) => attr.startsWith('rel='));
    if (!hasRel) attributes.push('rel="noopener noreferrer"');
  }

  return attributes.join(' ');
}

function sanitizeStyle(value: string): string {
  return value
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const separatorIndex = rule.indexOf(':');
      if (separatorIndex < 1) return undefined;
      const property = rule.slice(0, separatorIndex).trim().toLowerCase();
      const rawValue = rule.slice(separatorIndex + 1).trim();
      if (!ALLOWED_STYLE_PROPERTIES.has(property)) return undefined;
      if (/url\s*\(|expression\s*\(|javascript:/i.test(rawValue)) {
        return undefined;
      }
      return `${property}: ${rawValue}`;
    })
    .filter((rule): rule is string => Boolean(rule))
    .join('; ');
}

function isSafeHref(value: string): boolean {
  return /^(https?:|mailto:)/i.test(value.trim());
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
