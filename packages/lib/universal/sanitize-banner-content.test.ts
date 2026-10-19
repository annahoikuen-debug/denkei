import { describe, expect, it } from 'vitest';

import { sanitizeBannerContent } from './sanitize-banner-content';

describe('sanitizeBannerContent', () => {
  describe('empty / invalid input', () => {
    it('空文字を返す（空文字入力）', () => {
      expect(sanitizeBannerContent('')).toBe('');
    });

    it('空文字を返す（whitespace only）', () => {
      expect(sanitizeBannerContent('   \n\t  ')).toBe('');
    });

    it('null 相当の入力を空文字にする', () => {
      expect(sanitizeBannerContent(null as unknown as string)).toBe('');
    });

    it('undefined 相当の入力を空文字にする', () => {
      expect(sanitizeBannerContent(undefined as unknown as string)).toBe('');
    });
  });

  describe('plain text', () => {
    it('プレーンテキストをそのまま返す', () => {
      expect(sanitizeBannerContent('お知らせ：メンテナンスのお知らせです')).toBe(
        'お知らせ：メンテナンスのお知らせです',
      );
    });

    it('特殊文字をエスケープせずそのまま返す', () => {
      expect(sanitizeBannerContent('100% > 50% & < 200%')).toBe('100% > 50% & < 200%');
    });
  });

  describe('script tag removal', () => {
    it('<script> タグとその内容を除去する', () => {
      const result = sanitizeBannerContent('hello<script>alert(1)</script>world');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toBe('helloworld');
    });

    it('<script> タグに属性があっても除去する', () => {
      const result = sanitizeBannerContent('<script src="https://evil.com/x.js">alert(1)</script>');
      expect(result).toBe('');
    });

    it('大文字小文字混在の <SCRIPT> を除去する', () => {
      const result = sanitizeBannerContent('<ScRiPt>alert(1)</ScRiPt>');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });
  });

  describe('iframe / object / embed removal', () => {
    it('<iframe> を除去する', () => {
      const result = sanitizeBannerContent('<iframe src="https://evil.com"></iframe>');
      expect(result).toBe('');
    });

    it('<object> を除去する', () => {
      const result = sanitizeBannerContent('<object data="evil.swf"></object>');
      expect(result).toBe('');
    });

    it('<embed> を除去する', () => {
      const result = sanitizeBannerContent('<embed src="evil.swf">');
      expect(result).toBe('');
    });

    it('<applet> を除去する', () => {
      const result = sanitizeBannerContent('<applet code="Evil.class"></applet>');
      expect(result).toBe('');
    });

    it('<link> を除去する', () => {
      const result = sanitizeBannerContent('<link rel="stylesheet" href="evil.css">');
      expect(result).toBe('');
    });

    it('<meta> を除去する', () => {
      const result = sanitizeBannerContent('<meta http-equiv="refresh" content="0;url=https://evil.com">');
      expect(result).toBe('');
    });
  });

  describe('style tag removal', () => {
    it('<style> タグとその内容を除去する', () => {
      const result = sanitizeBannerContent('text<style>body{background:red;}</style>more');
      expect(result).not.toContain('<style');
      expect(result).not.toContain('background');
      expect(result).toBe('textmore');
    });
  });

  describe('form element removal', () => {
    it('<form> を除去する', () => {
      expect(sanitizeBannerContent('<form action="/evil"></form>')).toBe('');
    });

    it('<input> を除去する', () => {
      expect(sanitizeBannerContent('<input type="text">')).toBe('');
    });

    it('<button> を除去する', () => {
      expect(sanitizeBannerContent('<button onclick="alert(1)">X</button>')).toBe('');
    });
  });

  describe('event handler attribute removal', () => {
    it('onerror 属性を除去する', () => {
      const result = sanitizeBannerContent('<img src="x" onerror="alert(1)">');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('onclick 属性を除去する', () => {
      const result = sanitizeBannerContent('<div onclick="alert(1)">click</div>');
      expect(result).not.toContain('onclick');
      expect(result).toContain('click');
    });

    it('onload 属性を除去する', () => {
      const result = sanitizeBannerContent('<body onload="alert(1)">');
      expect(result).not.toContain('onload');
    });

    it('複数のイベントハンドラを除去する', () => {
      const result = sanitizeBannerContent('<div onclick="a()" onmouseover="b()" onerror="c()">text</div>');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
      expect(result).not.toContain('onerror');
      expect(result).toContain('text');
    });

    it('シングルクォート囲みのイベントハンドラを除去する', () => {
      const result = sanitizeBannerContent(`<img src='x' onerror='alert(1)'>`);
      expect(result).not.toContain('onerror');
    });
  });

  describe('dangerous URL scheme removal', () => {
    it('javascript: スキームを href から除去する', () => {
      const result = sanitizeBannerContent('<a href="javascript:alert(1)">リンク</a>');
      expect(result).not.toContain('javascript:');
      expect(result).toContain('リンク');
    });

    it('vbscript: スキームを除去する', () => {
      const result = sanitizeBannerContent('<a href="vbscript:msgbox(1)">リンク</a>');
      expect(result).not.toContain('vbscript:');
    });

    it('data: スキームを除去する', () => {
      const result = sanitizeBannerContent('<img src="data:text/html,<script>alert(1)</script>">');
      expect(result).not.toContain('data:');
    });
  });

  describe('HTML comment removal', () => {
    it('HTML コメントを除去する', () => {
      const result = sanitizeBannerContent('text<!--<script>alert(1)</script>-->more');
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('alert');
      expect(result).toBe('textmore');
    });
  });

  describe('safe tags preserved', () => {
    it('<b> <strong> <i> <em> <u> <br> を保持する', () => {
      const result = sanitizeBannerContent(
        '<b>太字</b> <strong>強調</strong> <i>斜体</i> <em>強調</em> <u>下線</u> <br>',
      );
      expect(result).toContain('<b>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<i>');
      expect(result).toContain('<em>');
      expect(result).toContain('<u>');
      expect(result).toContain('<br>');
    });

    it('<p> <span> <div> <h1>-<h6> を保持する', () => {
      const result = sanitizeBannerContent(
        '<p>段落</p><span>スパン</span><div>ディブ</div><h1>見出し</h1><h6>小見出し</h6>',
      );
      expect(result).toContain('<p>');
      expect(result).toContain('<span>');
      expect(result).toContain('<div>');
      expect(result).toContain('<h1>');
      expect(result).toContain('<h6>');
    });

    it('<ul> <ol> <li> を保持する', () => {
      const result = sanitizeBannerContent('<ul><li>アイテム1</li></ul><ol><li>アイテム2</li></ol>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>');
    });
  });

  describe('mixed safe and dangerous content', () => {
    it('安全なコンテンツを保持しつつ危険な部分を除去する', () => {
      const input = '<p>お知らせ</p><script>alert(1)</script><b>重要</b><iframe src="evil"></iframe>';
      const result = sanitizeBannerContent(input);
      expect(result).toContain('<p>');
      expect(result).toContain('お知らせ');
      expect(result).toContain('<b>');
      expect(result).toContain('重要');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).not.toContain('<iframe');
    });
  });

  describe('bypass vectors (regression)', () => {
    const AMP = String.fromCharCode(38);

    it('引用符なしのイベントハンドラを除去する', () => {
      expect(sanitizeBannerContent('<img src=x onerror=alert(1)>')).toBe('');
      expect(sanitizeBannerContent('<p onclick=alert(1)>text</p>')).toBe('<p>text</p>');
    });

    it('スラッシュ区切りの属性を持つタグを除去する', () => {
      expect(sanitizeBannerContent('<img/onerror=alert(1) src=x>')).toBe('');
    });

    it('svg / math などの許可リスト外タグを中身ごと除去する', () => {
      expect(sanitizeBannerContent('<svg onload=alert(1)>')).toBe('');
      expect(sanitizeBannerContent('<math href="javascript:alert(1)">x</math>')).toBe('');
    });

    it('ネストしたタグ構築による再合成を防ぐ', () => {
      const result = sanitizeBannerContent(
        '<scr' + '<script>x</script>' + 'ipt>alert(1)</scr' + '<script>x</script>' + 'ipt>',
      );
      expect(result).not.toMatch(/<script/i);
      expect(result).toBe('');
    });

    it('数値文字参照でエンコードした javascript: スキームを防ぐ', () => {
      const payload = `<a href="java${AMP}#106;avascript:alert(1)">x</a>`;
      const result = sanitizeBannerContent(payload);
      expect(result).toBe('<a>x</a>');
    });

    it('タブを挿入した javascript: スキームを防ぐ', () => {
      const result = sanitizeBannerContent('<a href="java\tscript:alert(1)">x</a>');
      expect(result).toBe('<a>x</a>');
    });

    it('名前付き文字参照によるスキーム偽装を防ぐ', () => {
      const payload = `<a href="java${AMP}colon;script:alert(1)">x</a>`;
      const result = sanitizeBannerContent(payload);
      expect(result).toBe('<a>x</a>');
    });

    it('エンティティを使った属性値からの脱出を防ぐ', () => {
      const payload = `<a href="x${AMP}#34; onmouseover=alert(1)">y</a>`;
      const result = sanitizeBannerContent(payload);
      expect(result).not.toMatch(/"\s*onmouseover/);
      expect(result).toContain('href="x');
      expect(result).toContain('y</a>');
    });

    it('許可リスト外の属性（data-* 等）を除去する', () => {
      const result = sanitizeBannerContent('<p data-x="1" style="color:red" class="c">t</p>');
      expect(result).toBe('<p style="color:red" class="c">t</p>');
    });

    it('target="_blank" に rel="noopener noreferrer" を付与する', () => {
      const result = sanitizeBannerContent('<a href="https://example.com" target="_blank">x</a>');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('安全な URL（https・相対・アンカー・mailto）は保持する', () => {
      expect(sanitizeBannerContent('<a href="https://example.com/a?b=1">x</a>')).toBe(
        '<a href="https://example.com/a?b=1">x</a>',
      );
      expect(sanitizeBannerContent('<a href="/docs">x</a>')).toBe('<a href="/docs">x</a>');
      expect(sanitizeBannerContent('<a href="#sec-1">x</a>')).toBe('<a href="#sec-1">x</a>');
      expect(sanitizeBannerContent('<a href="mailto:i@example.com">x</a>')).toBe(
        '<a href="mailto:i@example.com">x</a>',
      );
    });

    it('サニタイズ結果を再サニタイズしても同一（冪等性）', () => {
      const input =
        '<p class="c">a<b>b</b></p><a href="/x" target="_blank">l</a><img src=x onerror=alert(1)><!-- c -->';
      const once = sanitizeBannerContent(input);
      expect(sanitizeBannerContent(once)).toBe(once);
    });
  });
});
