(function () {
  if (window.__azArticleSchema) return;
  window.__azArticleSchema = true;
  if (!/^\/tpost\//.test(location.pathname)) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  function run() {

  var ORG_URL = 'https://xn----7sbabhlyjaog8ag2de4i4a.xn--p1ai/';
  var ORG_NAME = 'Адвокатское бюро Свердловской области «Защитник»';

  function text(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  var h1 = document.querySelector('h1');
  var headline = text(h1);
  if (!headline) return;

  var canonicalEl = document.querySelector('link[rel="canonical"]');
  var url = canonicalEl ? canonicalEl.href : location.href.split(/[?#]/)[0];

  var dateEl = document.querySelector('.t-feed__post-popup__date');
  var datePublished = null;
  if (dateEl) {
    var m = text(dateEl).match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (m) datePublished = m[3] + '-' + m[2] + '-' + m[1];
  }

  var articleContainer = document.querySelector('.t-redactor__text') ||
    document.querySelector('.t-feed__post-popup__text-wrapper') || document.body;

  // Статьи этого потока смешивают форматы: где-то плоский текст с <br> и
  // <strong>, где-то настоящие <p>/<li> (иногда и то и другое в одной
  // статье — интро-абзацы плоским текстом, дальше <ul><li> список).
  // getLines() рекурсивно проходит дерево: <br> и границы P/H1-4/LI
  // закрывают текущую "строку", инлайновые теги (STRONG/B/A и т.п.)
  // остаются частью строки, а обёртки (DIV/UL/OL/SECTION...) просто
  // раскрываются вглубь, не будучи сами по себе строкой.
  var LINE_TAGS = /^(P|H1|H2|H3|H4|LI)$/;
  var INLINE_TAGS = /^(STRONG|B|EM|I|A|SPAN|U|S|SMALL|MARK|SUB|SUP)$/;

  function getLines(root) {
    var lines = [];
    var buf = [];
    function flush() {
      if (!buf.length) return;
      var t = buf.map(function (n) { return n.textContent; }).join('').replace(/\s+/g, ' ').trim();
      if (t) {
        var fullyBold = buf.length === 1 && buf[0].nodeType === 1 &&
          /^(STRONG|B)$/.test(buf[0].tagName) && text(buf[0]) === t;
        lines.push({ text: t, fullyBold: fullyBold });
      }
      buf = [];
    }
    function walk(node) {
      var children = node.childNodes;
      for (var i = 0; i < children.length; i++) {
        var n = children[i];
        if (n.nodeType === 3) { buf.push(n); continue; }
        if (n.nodeType !== 1) continue;
        if (n.tagName === 'BR') { flush(); continue; }
        if (LINE_TAGS.test(n.tagName)) { flush(); walk(n); flush(); continue; }
        if (INLINE_TAGS.test(n.tagName)) { buf.push(n); continue; }
        flush(); walk(n);
      }
    }
    walk(root);
    flush();
    return lines;
  }

  var lines = getLines(articleContainer);

  // Meta-описание: у части статей (партия авг-сен 2026) поле SEO-описания
  // в Tilda пустое, платформа подставляет первую строку текста поста —
  // на практике строку "Дата публикации: ДД.ММ.ГГГГ". Чиним подстановкой
  // первой содержательной (не жирной, не короткой) строки.
  var metaDesc = document.querySelector('meta[name="description"]');
  var descText = metaDesc ? metaDesc.content.trim() : '';
  var isBadDesc = !descText || descText.length < 20 || /^дата публикации/i.test(descText);

  if (isBadDesc) {
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].text;
      if (t.length > 40 && !lines[i].fullyBold && !/^дата публикации/i.test(t)) { descText = t; break; }
    }
    if (descText.length > 300) descText = descText.slice(0, 297) + '…';
    if (descText) {
      if (metaDesc) metaDesc.setAttribute('content', descText);
      var ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', descText);
    }
  }

  // Автор статьи упоминается обычным текстом в блоке "Автор" в конце поста
  // (не отдельное поле Tilda) — определяем по полному ФИО в тексте.
  var bodyText = text(articleContainer);
  var author = { '@type': 'Organization', name: ORG_NAME, url: ORG_URL };
  if (/Иванникова Ольга Николаевна/.test(bodyText)) {
    author = { '@type': 'Person', name: 'Иванникова Ольга Николаевна' };
  } else if (/Паченков Сергей Михайлович/.test(bodyText)) {
    author = { '@type': 'Person', name: 'Паченков Сергей Михайлович' };
  }

  var articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: headline,
    description: descText || headline,
    url: url,
    mainEntityOfPage: url,
    author: author,
    publisher: { '@type': 'Organization', name: ORG_NAME, url: ORG_URL }
  };
  if (datePublished) {
    articleLd.datePublished = datePublished;
    articleLd.dateModified = datePublished;
  }
  var ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg && ogImg.content) articleLd.image = ogImg.content;

  var s1 = document.createElement('script');
  s1.type = 'application/ld+json';
  s1.id = 'az-article-ld';
  s1.textContent = JSON.stringify(articleLd);
  document.head.appendChild(s1);

  // FAQPage — только для статей по обновлённому промту (PROMPT_statyi_tilda.md
  // в ivannikova-site-status): строка ровно "Частые вопросы", каждый вопрос —
  // отдельная жирная строка на "?", сразу после неё — строка-ответ.
  var faqStart = -1;
  for (var hi = 0; hi < lines.length; hi++) {
    if (lines[hi].text === 'Частые вопросы' || lines[hi].text === 'Вопросы и ответы') { faqStart = hi; break; }
  }

  if (faqStart >= 0) {
    var qa = [];
    var pendingQuestion = null;
    for (var j = faqStart + 1; j < lines.length; j++) {
      var L = lines[j];
      if (L.fullyBold && /\?\s*$/.test(L.text)) {
        pendingQuestion = L.text;
      } else if (pendingQuestion) {
        qa.push({ q: pendingQuestion, a: L.text });
        pendingQuestion = null;
      }
    }
    if (qa.length) {
      var faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: qa.map(function (item) {
          return { '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } };
        })
      };
      var s2 = document.createElement('script');
      s2.type = 'application/ld+json';
      s2.id = 'az-faq-ld';
      s2.textContent = JSON.stringify(faqLd);
      document.head.appendChild(s2);
    }
  }

  }
})();
