# Yoyo personal portfolio

Public portfolio with projects, art, writing, About, interests, album, and interactive playgrounds. Visitors can open the site without an account.

## Preview and deploy

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
npm run build
npm test
npm run preview
npm run deploy
```

The source preview is http://localhost:4173. The production preview is http://localhost:4174. Firebase Hosting serves `dist` at https://yoyo-personal-portfolio.web.app, in project `yoyo-personal-portfolio`.

`npm run build` produces ordinary HTML, CSS, JavaScript, and media. It does not include the private-preview shell, encryption keys, Google sign-in, account records, or database editing APIs. `npm run deploy` builds and publishes Hosting only; it does not deploy database rules or publish access keys.

## Published content

`public/published-content.js` stores a read-only snapshot of the visible gallery items, saved layouts, media references, and About content. Associated uploaded media are stored as `public/assets/published-*`. Hidden artworks and unused uploaded media are excluded.

To refresh this snapshot after an authorized content change in Firestore, sign in to Firebase CLI as the owner and run `npm run export:public`, then build, test, and deploy. The exporter only reads visible portfolio content; it never changes records or permissions. Layout gaps and removals are preserved.

Other portfolio metadata lives in `public/project-portfolio.js` and `public/portfolio-artworks.js`. About presentation is in `public/design-pages.js` and `public/gallery.css`. Visitors have no editing controls or database write access.

The album references its original public VSCO image URLs. Embedded videos, self-portrait, and p5.js also rely on their external providers.

## Custom domain

In the Firebase Hosting console, add `ziyoutang.com`, then enter the exact verification and website records provided by Firebase into the domain provider's DNS settings. Add `www.ziyoutang.com` as a redirect to the apex domain if desired. Firebase provisions HTTPS after verification. Domain registration and DNS access are managed separately from this repository.

## Public source copy

This is a source snapshot of the portfolio’s `yoyo-changes` branch. It includes the current public site and source needed to build it. Private Git history, local credentials, and ignored private files are not included.

## Legacy private preview

The old authenticated preview source and Firestore rules are retained for recovery. `npm run build:private` builds that legacy version explicitly; it is not part of the normal deployment. Private keys remain in ignored `.private/` files. Public deployment does not weaken database rules or expose allowlists or encryption keys.
