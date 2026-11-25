import { albumPhotos } from './album-photos.js?v=20261123-kaoru-concise';
import { projectWorks } from './project-portfolio.js?v=20261123-kaoru-concise';
import { artReturn, artVideo } from './art-detail.js?v=20261105-dead-water';
const asset = name => globalThis.portfolioAsset?.(name) ?? `/assets/${name}`;
const image = (file, alt, x, y, width, height, extra = '') => `<img class="design-image ${extra}" src="${asset(file)}" alt="${alt}" style="left:${x}px;top:${y - 110}px;width:${width}px;height:${height}px">`;
const title = text => `<span class="gallery-title-glow" aria-hidden="true"></span><h1 class="gallery-page-title">${text}</h1>`;

export const aboutDefaults = {
  heading: 'Yoyo (Ziyou) Tang',
  body: 'I am an UI/UX Designer & Studio Artist based in Hong Kong & New York.\n\nWhile my art, ranging from human-size installations to web art, uses emotional resonation to address relationship tensions, the technology and design I am involved with address such tensity through digital mediums and inventions. Captivated by User Experience and spatial designs, my work integrates digital imagery into products, applications, and stage design.'
};

export function aboutDesign() {
  return `${title('About')}<div class="about-content"><div class="about-biography"><h2 data-about-heading>${aboutDefaults.heading}</h2><div class="about-pronouns"><em>she/her</em><img src="${asset('figma-1315-7-imgEmojioneMonotoneFlagForHongKongSarChina.svg')}" alt="Hong Kong"><span class="about-us-flag" style="mask-image:url('${asset('figma-1315-7-imgGroup.svg')}')"><img src="${asset('figma-1315-7-imgGroup1.svg')}" alt="United States"></span></div><div class="about-copy" data-about-body>${aboutDefaults.body}</div><a class="about-interests-link" href="${asset('ziyou-tang-resume.pdf')}" target="_blank" rel="noopener">her resume</a><a class="about-interests-link" href="#/interests">her interests</a><a class="about-interests-link" href="#/album">her album (casual!)</a></div>
  <a class="about-portrait-link" href="#/self-portrait" title="Click to view experimental self-portrait" aria-label="View multi-media self-portrait">
    <img class="design-image about-landscape" src="${asset('figma-1315-7-imgScreenshot20240809At22110Pm1.png')}" alt="Multi-media self-portrait landscape">
    <img class="design-image about-portrait" src="${asset('figma-1315-7-imgImg17341.png')}" alt="Yoyo Tang">
    <span class="portrait-caption">check out my multi-media<br>self-portrait</span>
  </a></div>`;
}

export function interestsPage() {
  return `<section class="gallery-page interests-page" aria-labelledby="interests-title"><span class="gallery-title-glow" aria-hidden="true"></span><h1 id="interests-title" class="gallery-page-title">Her interests</h1><div class="coming-soon-content interests-preview"><div class="yoyo-scene" data-yoyo-scene tabindex="0" role="group" aria-label="Silver 3D yo-yo. Drag or use arrow keys to rotate."></div><div class="yoyo-pull" data-yoyo-pull><svg class="yoyo-string" viewBox="0 0 100 230" aria-hidden="true"><path d="M50 0 C38 65 62 115 50 180"/></svg><button class="yoyo-pull-handle" type="button" aria-label="Pull string to explore interests. Use Down arrow for restaurants, then books." data-yoyo-handle><span></span></button></div><p class="yoyo-hint">pull string slowly to explore many interests!</p><aside class="yoyo-food-photos" data-food-photos aria-label="Food photographs" hidden>${['Rye by Martin Auer', 'Morgenstern’s Finest Ice Cream', 'Bridges', 'FASAN', 'FASAN', 'FASAN'].map((name,index) => `<figure><img src="${asset(`interests-food-${index+1}.jpg`)}" alt="${name}" loading="lazy"><figcaption>${name}</figcaption></figure>`).join('')}</aside><aside class="yoyo-book-covers" data-book-covers aria-label="Book covers" hidden>${['Perfume: The Story of a Murderer', 'Gone with the Wind', 'Kokoro', 'The Book of Disquiet', 'To the Lighthouse'].map((name,index) => `<figure><img src="${asset(`interests-book-${index+1}.jpg`)}" alt="${name} book cover" loading="lazy"><figcaption>${name}</figcaption></figure>`).join('')}</aside><aside class="yoyo-book-covers yoyo-movie-posters" data-movie-posters aria-label="Movie posters" hidden>${['Fallen Angels','Dead Poets Society','All About Lily Chou-Chou','April Story','Dreams'].map((name,index) => `<figure><img src="${asset(`interests-movie-${index+1}.jpg`)}" alt="${name} movie poster" loading="lazy"><figcaption>${name}</figcaption></figure>`).join('')}</aside><aside class="yoyo-interest-panel" data-interest-panel aria-live="polite" hidden><button type="button" data-interest-reset aria-label="Rewind string">↶ Reset</button><h2 data-interest-heading></h2><div class="yoyo-interest-list" data-interest-copy tabindex="0" aria-label="Interest list"></div></aside><a href="#/about">← Back to About</a></div></section>`;
}

function camsProjectLink(work) {
  if (work.category !== 'CAMS') return '';
  return work.slug === 'cams-website'
    ? '<a href="#/project/cams">Next: Prototype →</a>'
    : '<a href="#/project/cams-website">← Previous: CAMS Website</a>';
}

export function projectsPage() {
  const slug = location.hash.split('/')[2] || 'depth';
  const work = projectWorks.find(work => work.slug === slug) || projectWorks[0];
  const selected = work.category;
  const poemCollection = work.slug === 'poem-collection';
  const graphicWorks = selected === 'Graphic Works';
  const cams = selected === 'CAMS';
  const centeredPreview = graphicWorks || selected === 'Case Studies';
  const hasSubnav = centeredPreview || cams;
  const imageOnly = graphicWorks && !poemCollection;
  const previewTag = imageOnly ? 'button' : 'a';
  const previewAction = imageOnly ? `type="button" data-zoom="${asset(work.hero)}" data-caption="${work.title}"` : `href="${poemCollection ? '#/writing' : '#/project/' + work.slug}"`;
  const previewHint = imageOnly ? 'Click to view the full image' : poemCollection ? 'Read the collection in Writing' : 'Click into project for more detail!';
  const comparisonPreview = work.slug === 'wabi-sabi' || work.previewScreens;
  const previewImage = work.previewScreens
    ? `<span class="project-preview-pair">${work.previewScreens.map(({ file, label }) => `
        <span><span class="project-preview-label">${label}</span><img src="${asset(file)}" alt=""></span>
      `).join('')}</span>`
    : `<img src="${asset(work.hero)}" alt="${work.heroAlt || work.title}">`;
  const categories = [['Depth','depth'],['Kaoru','kaoru'],['CAMS','cams-website'],['Aether %','aether'],['Extrusion','extrusion'],['Yuan Fei Dian','yuan-fei-dian'],['Graphic Works','design-hour'],['Case Studies','wabi-sabi']];
  return `<section class="gallery-page projects-page${centeredPreview ? ' centered-project-page' : ''}${work.slug === 'poem-collection' ? ' poem-collection-page' : ''}" style="--project-accent:${work.accentColor}">${title('Projects')}
  <nav class="project-categories" aria-label="Project categories">${categories.map(([label,target]) => `<a href="#/projects/${target}" ${selected === label ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
  ${hasSubnav ? `<nav class="project-subnav" aria-label="${selected}">${projectWorks.filter(item => item.category === selected).map(item => `<a href="#/projects/${item.slug}" ${item === work ? 'aria-current="page"' : ''}>${item.slug === 'cams' ? 'CAMS Prototype' : item.title}</a>`).join('')}</nav>` : ''}
  <div class="project-feature"><${previewTag} ${previewAction} class="project-preview${work.slug === 'cams' ? ' cams-preview' : ''}${work.screenSize ? ' screen-preview' : ''}${comparisonPreview ? ' comparison-preview' : ''}${['depth','kaoru'].includes(work.slug) ? ' depth-preview' : ''}${work.portrait ? ' portrait-preview' : ''}" title="${previewHint}" aria-label="View ${work.title}${graphicWorks ? '' : ' project'}">${previewImage}</${previewTag}>
    <div class="project-caption"><div><h2>${work.title}</h2><p>${work.medium}</p>${work.slug === 'poem-collection' ? '<a class="project-writing-link" href="#/writing">Read the collection in Writing ↗</a>' : ''}</div><p>${work.description[0]}</p></div>
  </div>${centeredPreview ? '' : work.previews.map((file,index) => image(file,`${work.title} — related design ${index+1}`,1144,(index ? 480 : 224) + (cams ? 16 : 0),320,226,'project-peek')).join('')}
  </section>`;
}

export function newsReportPage() {
  const documentation = [
    ['figma-1421-2-imgTimeline101011520.png', 'Typing during the performance'],
    ['figma-1421-2-imgTimeline101024920.png', 'Hands on the typewriter'],
    ['figma-1421-2-imgTimeline101054916.png', 'Newspaper sculpture'],
    ['figma-1421-2-imgTimeline101044620.png', 'Installation performance detail'],
    ['figma-1421-2-imgScreenshot20241016At100248Am1.png', 'Performance close-up'],
    ['figma-1421-2-imgScreenshot20241016At100331Am1.png', 'Suspended sculpture detail'],
    ['art-pdf-page-30.webp', 'News report process drawings and installation model']
  ];
  return `<article class="aether-screens news-screens"><section class="aether-screen aether-intro" aria-label="News report overview"><h1 class="page-title"><a href="#/art">Installation</a></h1><div class="detail-intro-content"><div class="news-overview-stage"><div class="aether-overview"><img class="aether-hero" src="${asset('aa09b.png')}" alt="News report performance installation"><div class="aether-copy"><h2>news report</h2><p>2024</p><p>Performance/Installation</p><a class="detail-video" href="https://youtu.be/Lgku6UZJ8Us" target="_blank" rel="noopener noreferrer">Watch the performance ↗</a><div class="aether-description"><p>We constantly generate overwhelming amounts of information, including superfluous and propagandistic content that manipulates public opinion and fuels social tension.</p><p>In the piece, one person incessantly types propagandistic information on a typewriter, while another tears the papers apart and feeds them into an organic structure resembling intestines and blood vessels. The structure's inevitable rupture symbolizes how, even after propaganda is discarded, its irreversible influence on the public persists, accumulating pressure rather than being digested.</p></div></div></div></div><button type="button" class="aether-scroll-cue" data-scroll="news-video">Scroll to view the performance ↓</button></div></section>${artVideo('Lgku6UZJ8Us', 'news report', 'news-video')}${documentation.map(([file,alt],index) => `<section class="aether-screen aether-presentation" id="news-documentation-${index}" aria-label="${alt}">${index === 6 ? `<div class="news-process-panel"><img src="${asset(file)}" alt="${alt}"><img class="news-process-detail" src="${asset('art-news-process-02.webp')}" alt="Suspended installation detail"></div>` : `<img src="${asset(file)}" alt="${alt}">`}</section>`).join('')}${artReturn()}</article>`;
}

export function projectDetailPage(slug) {
  const work = projectWorks.find(work => work.slug === slug) || projectWorks[0];
  const screenSize = work.screenSize ? ` width="${work.screenSize[0]}" height="${work.screenSize[1]}"` : '';
  const documentation = work.documentation.map((entry, index) => {
    const { file, label, caption, paragraphs, alt } = typeof entry === 'string' ? { file: entry } : entry;
    const description = label || `${work.title} — design documentation ${index + 1}`;
    const heading = label ? `<h3>${label}</h3>` : '';
    return `<section class="aether-screen aether-presentation${label ? ' project-documentation' : ''}${paragraphs ? ' project-study-section' : ''}" id="project-documentation-${index}" aria-label="${description}">
      ${paragraphs ? `<div class="project-study-copy">${heading}${paragraphs.map(text => `<p>${text}</p>`).join('')}</div>` : heading}
      ${caption ? `<p>${caption}</p>` : ''}
      ${file ? `<img src="${asset(file)}" alt="${alt || description}" loading="lazy"${label ? '' : screenSize}>` : ''}
    </section>`;
  }).join('');
  const essayLink = className => work.essay ? `<a${className ? ` class="${className}"` : ''} href="${asset(work.essay)}" target="_blank" rel="noopener">Read the full essay (PDF) ↗</a>` : '';
  const { file: hero, alt: heroAlt, size } = work.detailImage || { file: work.hero, alt: work.heroAlt || work.title, size: work.screenSize };
  const heroSize = size ? ` width="${size[0]}" height="${size[1]}"` : '';
  const overviewImage = `<img class="aether-hero" src="${asset(hero)}" alt="${heroAlt}"${heroSize}>`;
  return `<article class="aether-screens project-screens${work.portrait ? ' portrait-project' : ''}"><section class="aether-screen aether-intro" aria-label="${work.title} overview"><h1 class="page-title">Project</h1><div class="detail-intro-content"><div class="project-overview-stage"><div class="aether-overview">${overviewImage}<div class="aether-copy"><h2>${work.title}</h2>${work.year ? `<p>${work.year}</p>` : ''}<p>${work.medium}</p>${essayLink('detail-video')}${(work.links || []).map(([label,url]) => `<a class="detail-video" href="${url}" ${url.startsWith('https:') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${label} ↗</a>`).join('')}<div class="aether-description">${work.description.map(text => `<p>${text}</p>`).join('')}</div></div></div></div><button type="button" class="aether-scroll-cue" data-scroll="project-documentation-0">Scroll to explore the design ↓</button></div></section>${documentation}<footer class="detail-return"><a href="#/projects/${work.slug}">← Back to Projects</a>${essayLink()}${camsProjectLink(work)}</footer></article>`;
}

export function selfPortraitPage(returnTo = '#/about') {
  return `<section class="self-portrait-page" aria-label="Multi-media self-portrait"><iframe class="self-portrait-live" src="https://ziyoutang.github.io/portfolio%201/web%20test.html" title="Experimental self-portrait — Type to dissect Y-O-Y-O" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin"></iframe><a class="portrait-back" href="${returnTo}"><img src="${asset('figma-1423-71-imgHouse2.png')}" alt="">Back</a></section>`;
}

export function albumPage() {
  const photos = [...albumPhotos];
  photos.splice(2,0,photos.splice(photos.findIndex(photo => photo.id === '6ad6e7d0877cf42b9eb25a74'),1)[0]);
  return `<section class="gallery-page album-page" aria-labelledby="album-title"><span class="gallery-title-glow" aria-hidden="true"></span><h1 id="album-title" class="gallery-page-title">Her album (casual!)</h1><div class="album-grid" tabindex="0" aria-label="Casual photo album"><div class="album-track">${photos.map((photo,index) => `<figure><img src="${photo.src}" alt="Casual album photo ${index+1}" decoding="async"></figure>`).join('')}</div></div><a class="album-back" href="#/about">← Back to About</a></section>`;
}
