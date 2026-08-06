# Spec: Wishlist

## Requirement: Wishlist storage library

`src/lib/wishlist.js` MUST expose pure functions `getWishlist`, `addToWishlist`, `removeFromWishlist`, `isInWishlist`, `getWishlistCount`, `updateWishlistBadge`, key `wishlist`, items `{id, slug, name, price, image}`, dedupe by `id`, no size cap. Mutations MUST dispatch `storage`; consumers MAY dispatch `wishlist-updated`. `updateWishlistBadge` MUST write `#wishlist-count`, hidden at 0, capped at "99+".

- GIVEN empty storage WHEN `getWishlist()` THEN `[]`
- GIVEN `addToWishlist(product)` called twice with the same id THEN stored once
- GIVEN `removeFromWishlist(id)` THEN item removed and `storage` dispatched
- GIVEN `isInWishlist(id)` THEN true only for stored ids
- GIVEN 100 items WHEN `updateWishlistBadge()` THEN text is "99+"
- GIVEN zero items WHEN `updateWishlistBadge()` THEN badge is hidden

## Requirement: Wishlist page

`src/pages/wishlist.astro` MUST render on `astro:page-load` from storage: skeleton, then empty state (icon, title, copy, CTA to `/`) or rows (image, name, `formatPrice()` price, aria-labeled remove, add-to-cart). MUST work logged out and listen to `storage` and `wishlist-updated`.

- GIVEN an empty wishlist WHEN opening `/wishlist` THEN the empty state with CTA is shown
- GIVEN two stored items WHEN opening `/wishlist` THEN rows show image, name, formatted price, remove
- GIVEN remove is clicked THEN the row disappears (empty state after last removal)
- GIVEN add-to-cart is clicked THEN the item is added via existing cart helpers
- GIVEN no session WHEN opening `/wishlist` THEN the page renders

## Requirement: Header badge and link

The header wishlist link MUST point to `/wishlist` and `#wishlist-count` MUST be wired via `storage`/`wishlist-updated` listeners calling `updateWishlistBadge`. The button MUST remain hidden below 768px.

- GIVEN header load WHEN the wishlist has items THEN the badge shows the count
- GIVEN wishlist changes in another tab WHEN `storage` fires THEN the badge syncs
- GIVEN a viewport under 768px THEN the wishlist button is hidden

## Requirement: Wishlist tests

`src/lib/wishlist.test.ts` MUST cover the library (mirroring `cart.test.ts` mocks); `e2e/wishlist.spec.ts` MUST seed via `addInitScript` and assert rendering and badge.

- GIVEN `wishlist.test.ts` WHEN running `pnpm test` THEN all library scenarios pass
- GIVEN seeded storage WHEN running the wishlist E2E spec THEN rows render and the badge updates
