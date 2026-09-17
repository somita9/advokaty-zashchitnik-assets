(function () {
  if (window.__azArticleSchema) return;
  window.__azArticleSchema = true;
  if (!/^\/tpost\//.test(location.pathname)) return;

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

  var articleContainer = document.querySelector('.t-feed__post-popup__text-wrapper') || document.body;
  var paragraphs = [].slice.call(articleContainer.querySelectorAll('p'));

  // Meta-описание: у части статей (партия авг-сен 2026) поле SEO-описания
  // в Tilda пустое, платформа подставляет первую строку текста поста —
  // на практике это строка "Дата публикации: ДД.ММ.ГГГГ". Чиним подстановкой
  // первого содержательного абзаца — и в meta description/og:description
  // (на случай, если поисковик их всё же учтёт), и в JSON-LD ниже.
  var metaDesc = document.querySelector('meta[name="description"]');
  var descText = metaDesc ? metaDesc.content.trim() : '';
  var isBadDesc = !descText || descText.length < 20 || /^дата публикации/i.test(descText);

  if (isBadDesc) {
    for (var i = 0; i < paragraphs.length; i++) {
      var t = text(paragraphs[i]);
      if (t.length > 40 && !/^дата публикации/i.test(t)) { descText = t; break; }
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

  // FAQPage — только для статей, написанных по обновлённому промту
  // (PROMPT_statyi_tilda.md в ivannikova-site-status): заголовок ровно
  // "Частые вопросы", каждый вопрос — отдельный жирный абзац на "?",
  // сразу за ним — абзац-ответ. У существующих статей на сайте такого
  // единообразного блока нет (проверено выборочно), поэтому для старого
  // контента FAQPage просто не добавится — это ожидаемо, не баг.
  var headings = [].slice.call(articleContainer.querySelectorAll('h1,h2,h3,h4'));
  var faqHeading = null;
  for (var hi = 0; hi < headings.length; hi++) {
    var ht = text(headings[hi]);
    if (ht === 'Частые вопросы' || ht === 'Вопросы и ответы') { faqHeading = headings[hi]; break; }
  }

  if (faqHeading) {
    var qa = [];
    var node = faqHeading.nextElementSibling;
    var pendingQuestion = null;
    while (node && !/^H[1-4]$/.test(node.tagName)) {
      var nt = text(node);
      if (nt) {
        var boldChild = node.querySelector('b,strong');
        var isBoldWholeLine = boldChild && text(boldChild) === nt;
        if (/\?\s*$/.test(nt) && (isBoldWholeLine || /^(B|STRONG)$/.test(node.tagName))) {
          pendingQuestion = nt;
        } else if (pendingQuestion) {
          qa.push({ q: pendingQuestion, a: nt });
          pendingQuestion = null;
        }
      }
      node = node.nextElementSibling;
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
})();
