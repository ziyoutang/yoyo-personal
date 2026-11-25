import { portfolioWorks } from './portfolio-artworks.js?v=20261105-dead-water';

const asset = name => globalThis.portfolioAsset?.(name) ?? `/assets/${name}`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function artworkImageGroup(work) {
  return `<span class="artwork-image-group artwork-group-${work.slug}">${work.imageCollection.map((file,index) => {
    const crop = work.imageCrops?.[index];
    const style = crop ? ` style="width:${100/crop[2]}%;left:${-100*crop[0]/crop[2]}%;top:${-100*crop[1]*4/3/crop[2]}%"` : '';
    return `<span><img src="${asset(file)}" alt="${escape(work.title)} — painting ${index+1}"${style}></span>`;
  }).join('')}</span>`;
}

export function artReturn() {
  return '<footer class="detail-return"><a href="#/art">← Back to Art</a></footer>';
}

export function artVideo(videoId, title, id = 'art-documentation-0') {
  return `<section class="aether-screen aether-presentation" id="${id}" aria-label="${escape(title)} video"><iframe class="art-video-embed" src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0" title="${escape(title)} — video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></section>`;
}

export function artDetailPage(slug) {
  const work = portfolioWorks.find(work => work.slug === slug);
  if (!work) return `<section class="art-detail-missing"><h1 class="page-title">Art</h1><p>This artwork is unavailable.</p>${artReturn()}</section>`;
  const singleImage = ['Paintings','Illustrations'].includes(work.category);
  const photography = work.category === 'Paintings';
  const documentation = singleImage ? [] : work.documentation;
  const links = work.links.map(url => `<a class="detail-video" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${url.includes('youtu') ? (work.category === 'Film' ? 'Watch the film' : 'Watch the video') : 'Explore the interactive work'} ↗</a>`).join('');
  const portraitLink = work.slug === 'self-portrait' ? '<a class="detail-video" href="#/self-portrait/art">Explore the interactive self-portrait ↗</a>' : '';
  const sourceLink = work.sourceUrl ? `<a class="detail-video" href="${escape(work.sourceUrl)}" target="_blank" rel="noopener noreferrer">View on GitHub ↗</a>` : '';
  const videoHTML = work.videoFile
    ? `<section class="aether-screen aether-presentation" id="art-documentation-0" aria-label="${escape(work.title)} video"><video class="art-video-player" src="${asset(work.videoFile)}" poster="${asset(work.cover)}" controls playsinline preload="none" aria-label="${escape(work.title)} — full conceptual video"></video></section>`
    : work.videoEmbedId ? artVideo(work.videoEmbedId, work.title) : '';
  const documentationHTML = singleImage ? '' : videoHTML + documentation.map((file,index) => {
      const [width,height] = singleImage ? [work.width,work.height] : work.documentationSizes?.[index] || [1600,800];
      const label = singleImage ? 'full artwork' : `documentation ${index+1}`;
      return `<section class="aether-screen aether-presentation" id="art-documentation-${index + (videoHTML ? 1 : 0)}" aria-label="${escape(work.title)} ${label}"><img${file === 'art-lost-victory-pair.webp' ? ' class="art-full-width"' : ''} src="${asset(file)}" alt="${escape(work.title)} — ${label}" loading="lazy" width="${width}" height="${height}"></section>`;
    }).join('');
  const hero = work.imageCollection ? artworkImageGroup(work) : `<img class="aether-hero" src="${asset(work.cover)}" alt="${escape(work.title)}" width="${work.width}" height="${work.height}">`;
  const titleHTML = work.slug === 'fruits-alive' ? escape(work.title).replace(' came alive','<br>came alive') : work.slug === 'poets-diary-web' ? escape(work.title).replace(' — web art','<br>— web art') : escape(work.title);
  const fullscreenButton = singleImage ? `<button type="button" class="photo-fullscreen-button" data-photo-fullscreen data-photo-src="${asset(work.fullImage || work.cover)}" data-photo-title="${escape(work.title)}"${work.imageCollection ? ` data-image-group="${work.slug}"` : ''} aria-label="View full-screen ${photography ? 'photograph' : 'artwork'}">⛶ Full screen</button>` : '';
  return `<article class="aether-screens art-screens${work.slug === 'the-herd' ? ' the-herd-detail' : ''}${work.slug === 'puncture' ? ' puncture-detail' : ''}${work.slug === 'maturity' ? ' maturity-detail' : ''}${work.slug === 'portraits' ? ' portraits-detail' : ''}${singleImage ? ' photography-detail' : ''}${singleImage && work.height > work.width ? ' photography-portrait-detail' : ''}" style="--artwork-color:${work.accentColor}">
    <section class="aether-screen aether-intro" aria-label="${escape(work.title)} overview">
      <h1 class="page-title"><a href="#/art">${photography ? 'Photography' : escape(work.category)}</a></h1>
      <div class="detail-intro-content"><div class="project-overview-stage"><div class="aether-overview">
        ${singleImage && !work.imageCollection ? `<div class="photography-detail-image" style="--photo-ratio:${work.width/work.height}">${hero}</div>` : hero}
        <div class="aether-copy"><h2${work.title.length > 25 ? ' class="art-detail-long-title"' : ''}>${titleHTML}</h2>${work.year ? `<p>${escape(work.year)}</p>` : ''}<p>${escape(work.medium)}</p>${work.videoFile ? '<button type="button" class="detail-video art-watch-video" data-scroll="art-documentation-0">Watch the video ↓</button>' : ''}${portraitLink}${links}${sourceLink}<div class="aether-description">${work.description.split('\n\n').map(text => `<p>${escape(text)}</p>`).join('')}</div>${fullscreenButton}</div>
      </div></div>
      ${singleImage ? artReturn() : '<button type="button" class="aether-scroll-cue" data-scroll="art-documentation-0">Scroll to explore the work ↓</button>'}</div>
    </section>
    ${documentationHTML}
    ${work.processImages ? `<section class="aether-screen aether-presentation" aria-label="${escape(work.title)} production process"><div class="art-process-grid">${work.processImages.map((file,index) => `<img src="${asset(file)}" alt="${escape(work.title)} — ${index === 0 ? 'Nomad Sculpt 3D model' : 'production process ' + index}" loading="lazy">`).join('')}</div></section>` : ''}
    ${work.poem ? `<section class="art-poem" aria-label="${escape(work.title)} poem"${work.poemTitle ? ' lang="zh-Hans"' : ''}><h2>${escape(work.poemTitle || work.title)}</h2>${work.poemAuthor ? `<p>${escape(work.poemAuthor)}</p>` : ''}<div>${escape(work.poem)}</div></section>` : ''}
    ${singleImage ? '' : artReturn()}
  </article>`;
}
