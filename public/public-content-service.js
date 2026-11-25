import { publishedContent } from './published-content.js?v=20261105-dead-water';

export function setupPublicContent() {
  if (!globalThis.portfolioGallery) globalThis.portfolioGallery = Object.freeze({
    subscribe(callback) {
      callback({ items: structuredClone(publishedContent.items), layouts: structuredClone(publishedContent.layouts), canEdit: false, loading: false, error: '' });
      return () => {};
    },
    async getImage(id) {
      const image = publishedContent.images[id];
      if (!image) throw new Error('Published media unavailable.');
      return { ...image };
    },
  });
  if (!globalThis.portfolioAbout) globalThis.portfolioAbout = Object.freeze({
    subscribe(callback) {
      callback({ content: { ...publishedContent.about }, canEdit: false, loading: false, error: '' });
      return () => {};
    },
  });
}
