import { describe, expect, it } from 'vitest'
import { useSanitizer } from './useSanitizer'

describe('useSanitizer', () => {
  const { sanitize } = useSanitizer()

  it('keeps the supported HN markup and hardens external links', () => {
    const result = sanitize('<p>Hello <strong>world</strong> <a href="https://example.com/path">source</a></p>')

    expect(result).toContain('<strong>world</strong>')
    expect(result).toContain('href="https://example.com/path"')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="nofollow noopener noreferrer"')
  })

  it.each([
    'javascript:alert(1)',
    'java&#x73;cript:alert(1)',
    'javascript&colon;alert(1)',
    'data:text/html,<script>alert(1)</script>',
  ])('rejects unsafe link protocol %s', (href) => {
    const result = sanitize(`<p><a href="${href}">unsafe</a></p>`)

    expect(result).not.toContain('href=')
    expect(result).not.toContain('javascript:')
    expect(result).not.toContain('data:text/html')
    expect(result).toContain('unsafe')
  })

  it('removes executable and embedded content', () => {
    const result = sanitize('<script>alert(1)</script><iframe src="https://example.com"></iframe><p>Safe</p>')

    expect(result).toBe('<p>Safe</p>')
  })

  it('does not autolink URLs inside code or existing links', () => {
    const result = sanitize('<p><code>https://example.com/code</code> <a href="https://example.com">https://example.com</a></p>')

    expect(result.match(/<a\b/g)).toHaveLength(1)
    expect(result).toContain('<code>https://example.com/code</code>')
  })

  it('formats tightly paired single asterisks as semantic emphasis', () => {
    const result = sanitize('<p>It is *a* natural endpoint, not *the* natural endpoint.</p>')

    expect(result).toBe('<p>It is <em>a</em> natural endpoint, not <em>the</em> natural endpoint.</p>')
  })

  it('keeps ambiguous and literal asterisk patterns unchanged', () => {
    const result = sanitize([
      '<p>**bold**</p>',
      '<p>question*</p>',
      '<p>* footnote</p>',
      '<p>separator</p>',
      '<p>* laugh track *</p>',
      '<p>2 * 3 * 4</p>',
      '<p>src/*/index and foo*bar*baz</p>',
      '<p>*unmatched</p>',
      '<p><em>*native*</em> <code>*code*</code> <a href="https://example.com">*link*</a></p>',
      '<p>*before <i>middle</i> after*</p>',
    ].join(''))

    expect(result).toContain('<p>**bold**</p>')
    expect(result).toContain('<p>question*</p>')
    expect(result).toContain('<p>* footnote</p>')
    expect(result).toContain('<p>* laugh track *</p>')
    expect(result).toContain('<p>2 * 3 * 4</p>')
    expect(result).toContain('<p>src/*/index and foo*bar*baz</p>')
    expect(result).toContain('<p>*unmatched</p>')
    expect(result).toContain('<em>*native*</em>')
    expect(result).toContain('<code>*code*</code>')
    expect(result).toContain('>*link*</a>')
    expect(result).toContain('<p>*before <i>middle</i> after*</p>')
    expect(result).not.toContain('<strong>')
  })

  it('formats tightly paired inline backticks outside existing links and code', () => {
    const result = sanitize(
      '<p>Use `undefined`, `https://example.com/code`, <code>`native`</code>, and <a href="https://example.com">`linked`</a>.</p>',
    )

    expect(result).toContain('<code>undefined</code>')
    expect(result).toContain('<code>https://example.com/code</code>')
    expect(result).toContain('<code>`native`</code>')
    expect(result).toContain('>`linked`</a>')
    expect(result.match(/<a\b/g)).toHaveLength(1)
  })

  it('keeps ambiguous inline backtick patterns and native code blocks unchanged', () => {
    const result = sanitize([
      '<p>Keep ``double``, ` padded `, and `unmatched.</p>',
      '<pre><code>`native`</code></pre>',
    ].join(''))

    expect(result).toBe([
      '<p>Keep ``double``, ` padded `, and `unmatched.</p>',
      '<pre><code>`native`</code></pre>',
    ].join(''))
  })

  it('groups compatible manual list runs into semantic lists', () => {
    const result = sanitize([
      '<p>Before</p>',
      '<p>- first with *emphasis*</p>',
      '<p>- second with `code`</p>',
      '<p>Between</p>',
      '<p>1. one</p>',
      '<p>2. two</p>',
      '<p>After</p>',
    ].join(''))

    expect(result).toBe([
      '<p>Before</p>',
      '<ul><li>first with <em>emphasis</em></li><li>second with <code>code</code></li></ul>',
      '<p>Between</p>',
      '<ol><li>one</li><li>two</li></ol>',
      '<p>After</p>',
    ].join(''))
  })

  it.each([
    {
      input: '<p>* first</p><p>* second</p>',
      output: '<ul><li>first</li><li>second</li></ul>',
    },
    {
      input: '<p>+ first</p><p>+ second</p>',
      output: '<ul><li>first</li><li>second</li></ul>',
    },
    {
      input: '<p>1) first</p><p>2) second</p>',
      output: '<ol><li>first</li><li>second</li></ol>',
    },
  ])('supports compatible $input list markers', ({ input, output }) => {
    expect(sanitize(input)).toBe(output)
  })

  it.each([
    {
      input: '<p>- first</p><p>prose</p><p>- second</p>',
      output: '<p>- first</p><p>prose</p><p>- second</p>',
    },
    {
      input: '<p>- first</p><p>+ second</p>',
      output: '<p>- first</p><p>+ second</p>',
    },
    {
      input: '<p>1. first</p><p>3. third</p>',
      output: '<p>1. first</p><p>3. third</p>',
    },
    {
      input: '<p>1. https://example.com/reference</p>',
      output: '<p>1. <a href="https://example.com/reference" target="_blank" rel="nofollow noopener noreferrer">https://example.com/reference</a></p>',
    },
    {
      input: '<p>* footnote</p>',
      output: '<p>* footnote</p>',
    },
  ])('keeps non-list paragraph sequence %# unchanged', ({ input, output }) => {
    expect(sanitize(input)).toBe(output)
  })

  it('preserves surrounding prose, quotes, and native lists in order', () => {
    const result = sanitize([
      '<p>Intro</p>',
      '<p>- first</p>',
      '<p>- second</p>',
      '<p>&gt; quoted text</p>',
      '<ul><li>native</li></ul>',
      '<p>Outro</p>',
    ].join(''))

    expect(result).toBe([
      '<p>Intro</p>',
      '<ul><li>first</li><li>second</li></ul>',
      '<blockquote><p>quoted text</p></blockquote>',
      '<ul><li>native</li></ul>',
      '<p>Outro</p>',
    ].join(''))
  })

  it('formats quote blocks and links matching footnote references', () => {
    const result = sanitize(
      '<p>&gt; quoted text</p><p>See [1]</p><p>[1] - https://example.com/reference</p>',
      'comment-42',
    )

    expect(result).toContain('<blockquote><p>quoted text</p></blockquote>')
    expect(result).toContain('href="#comment-42-ref-1"')
    expect(result).toContain('id="comment-42-ref-1"')
  })
})
