# tiny-react-sandbox

To start development with HMR and live reload via SSE:

```bash
yarn dev
```

# adding new page

checklist, for `/example.html`

```
- [ ] Create new page `www/example.html`
- [ ] Create new react entrypoint `pages/example.tsx`
- [ ] In `dev.mjs`, edit `entryPoints` array to include `./pages/example.tsx`
- [ ] In `dev.mjs`, add reference to page in `console.log` of `setTimeout`
```
