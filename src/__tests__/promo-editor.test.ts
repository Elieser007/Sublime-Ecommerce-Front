/**
 * Promo Editor — local store tests (TDD RED).
 *
 * The store holds a working copy of the section + promotions. Every edit is
 * local-only; Guardar commits one batch PUT built by toSavePayload. Refs:
 * PM-3 (local state/single commit), PM-5 (image lifecycle), AD "Undo
 * granularity" (one history entry per completed interaction, cap 50) and
 * "Batch response sync" (applySavedResponse maps server truth to state).
 */

import { describe, it, expect, vi } from "vitest";
import {
  createEditorState,
  createSnapshot,
  isDirty,
  revert,
  toSavePayload,
  applySavedResponse,
  movePromotion,
  removePromotion,
  duplicatePromotion,
  addPromotion,
  updatePromotion,
  setSection,
  createHistory,
  pushHistory,
  undoEditor,
  redoEditor,
  shouldWarnBeforeUnload,
  validatePromotionsForSave,
  extractFilename,
  localKey,
  nextLocalId,
  stripHoverIndex,
  isPromoEditorRoute,
  setLocalImage,
  clearLocalImage,
  resolvePromoImage,
  orphanedDraftUrls,
  draftUrlReferenced,
  historyDraftUrls,
  revokeDraftUrlsOnce,
  survivingImageReferences,
  HISTORY_LIMIT,
  type EditorSection,
  type EditorPromotion,
  type PromoEditorState,
  type EditorHistory,
  type SavedPromotionsResponse,
} from "../lib/promo-editor";
import { renumberOrder } from "../lib/promo-grid";

const section: EditorSection = {
  id: "sec-1",
  name: "Home Top",
  slug: "home-top",
  gridCols: 8,
  gridRows: 4,
  displayType: "tiles",
};

/** Server-shaped promotion row as returned by GET /api/promotions. */
function serverPromo(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "p1",
    title: "Summer Sale",
    subtitle: "50% off",
    imageUrl: "https://media.sublimepy.store/promo1.webp",
    link: "/products/remera",
    position: 2,
    tileCols: 2,
    tileRows: 1,
    ...overrides,
  };
}

describe("createEditorState", () => {
  it("maps server promotions to editor promotions (position→posX, tileCols→width)", () => {
    const state = createEditorState(section, [serverPromo()]);
    expect(state.section).toEqual(section);
    expect(state.promotions).toHaveLength(1);
    expect(state.promotions[0]).toMatchObject({
      id: "p1",
      title: "Summer Sale",
      subtitle: "50% off",
      imageUrl: "https://media.sublimepy.store/promo1.webp",
      localImageUrl: null,
      link: "/products/remera",
      posX: 2,
      posY: 0,
      width: 2,
      height: 1,
      isActive: true,
      imageId: null,
      imageBlob: null,
      previousImageUrl: null,
    });
  });

  it("maps posY from the server response when present", () => {
    const state = createEditorState(section, [serverPromo({ posY: 3 })]);
    expect(state.promotions[0].posY).toBe(3);
  });

  it("starts with empty deletedIds and empty deletedImageUrls", () => {
    const state = createEditorState(section, []);
    expect(state.deletedIds).toEqual([]);
    expect(state.deletedImageUrls).toEqual([]);
  });
});

describe("isDirty", () => {
  it("is false for a fresh state vs its snapshot", () => {
    const state = createEditorState(section, [serverPromo()]);
    const snap = createSnapshot(state);
    expect(isDirty(state, snap)).toBe(false);
  });

  it("is true after a move edit", () => {
    let state = createEditorState(section, [serverPromo({ id: "a" }), serverPromo({ id: "b" })]);
    const snap = createSnapshot(state);
    state = movePromotion(state, 0, 1);
    expect(isDirty(state, snap)).toBe(true);
  });

  it("is true after a title edit", () => {
    let state = createEditorState(section, [serverPromo()]);
    const snap = createSnapshot(state);
    state = updatePromotion(state, "p1", { title: "New Title" });
    expect(isDirty(state, snap)).toBe(true);
  });

  it("is true when an image blob is pending", () => {
    let state = createEditorState(section, [serverPromo()]);
    const snap = createSnapshot(state);
    state = updatePromotion(state, "p1", { imageBlob: new Blob(["x"], { type: "image/webp" }) });
    expect(isDirty(state, snap)).toBe(true);
  });

  it("projects any non-null imageBlob to the same marker (no false dirt from blob identity)", () => {
    const stateA = createEditorState(section, [serverPromo()]);
    const stateB = createEditorState(section, [serverPromo()]);
    // Different Blob instances represent the same pending state → not dirty.
    const withBlobA = updatePromotion(stateA, "p1", { imageBlob: new Blob(["a"]) });
    const withBlobB = updatePromotion(stateB, "p1", { imageBlob: new Blob(["b"]) });
    expect(isDirty(withBlobA, withBlobB)).toBe(false);
  });
});

describe("revert", () => {
  it("restores the snapshot copy", () => {
    let state = createEditorState(section, [serverPromo()]);
    const snap = createSnapshot(state);
    state = updatePromotion(state, "p1", { title: "Changed" });
    state = removePromotion(state, "p1");
    const reverted = revert(state, snap);
    expect(reverted).toEqual(snap);
    expect(reverted).not.toBe(snap); // copy, not same reference
  });

  it("does not mutate the snapshot when the reverted state is edited", () => {
    let state = createEditorState(section, [serverPromo()]);
    const snap = createSnapshot(state);
    const reverted = revert(state, snap);
    reverted.promotions[0].title = "Mutated";
    expect(snap.promotions[0].title).toBe("Summer Sale");
  });
});

describe("toSavePayload", () => {
  it("shapes the batch payload from local state", () => {
    const state = createEditorState(section, [serverPromo()]);
    const payload = toSavePayload(state);
    expect(payload).toEqual({
      gridCols: 8,
      gridRows: 4,
      displayType: "tiles",
      promotions: [
        {
          id: "p1",
          title: "Summer Sale",
          subtitle: "50% off",
          imageUrl: "https://media.sublimepy.store/promo1.webp",
          link: "/products/remera",
          posX: 2,
          posY: 0,
          width: 2,
          height: 1,
          isActive: true,
        },
      ],
      deletePromotionIds: [],
    });
  });

  it("includes deletePromotionIds from removed server promos", () => {
    let state = createEditorState(section, [serverPromo()]);
    state = removePromotion(state, "p1");
    const payload = toSavePayload(state);
    expect(payload.deletePromotionIds).toEqual(["p1"]);
    expect(payload.promotions).toEqual([]);
  });

  it("re-keys imageUrl through resolvedUrls by promo id", () => {
    let state = createEditorState(section, [serverPromo()]);
    state = updatePromotion(state, "p1", { imageBlob: new Blob(["x"]) });
    const payload = toSavePayload(state, {
      p1: "https://media.sublimepy.store/uploaded.webp",
    });
    expect(payload.promotions[0].imageUrl).toBe("https://media.sublimepy.store/uploaded.webp");
  });

  it("keeps imageUrl null for a new promo whose blob has no resolved URL yet", () => {
    let state = createEditorState(section, [serverPromo({ id: "temp-1" })]);
    state = updatePromotion(state, "temp-1", {
      imageUrl: null,
      imageBlob: new Blob(["x"]),
      previousImageUrl: "https://media.sublimepy.store/old.webp",
    });
    const payload = toSavePayload(state);
    expect(payload.promotions[0].imageUrl).toBeNull();
  });

  it("omits id for brand-new promotions", () => {
    let state = createEditorState(section, []);
    state = addPromotion(state, { title: "Brand New", subtitle: null, imageUrl: null, link: "/products/x" });
    const payload = toSavePayload(state);
    expect(payload.promotions[0].id).toBeUndefined();
    expect(payload.promotions[0].title).toBe("Brand New");
    expect(payload.promotions[0].posX).toBe(0);
  });
});

describe("applySavedResponse", () => {
  it("re-keys temp ids with server ids and clears pending state", () => {
    let state = createEditorState(section, []);
    state = addPromotion(state, {
      title: "Fresh",
      subtitle: null,
      imageUrl: "https://media.sublimepy.store/fresh.webp",
      link: "/products/fresh",
    });
    expect(state.promotions[0].id).toBeNull();

    const res = {
      section: { ...section, gridCols: 8, gridRows: 4, displayType: "tiles" },
      promotions: [
        {
          id: "server-1",
          title: "Fresh",
          subtitle: null,
          imageUrl: "https://media.sublimepy.store/fresh.webp",
          link: "/products/fresh",
          position: 0,
          posY: 0,
          tileCols: 1,
          tileRows: 1,
        },
      ],
    };
    const synced = applySavedResponse(state, res);
    expect(synced.promotions[0].id).toBe("server-1");
    expect(synced.promotions[0].imageBlob).toBeNull();
    expect(synced.promotions[0].previousImageUrl).toBeNull();
    expect(synced.deletedIds).toEqual([]);
    expect(synced.deletedImageUrls).toEqual([]);
  });

  it("replaces the whole promotion list with server truth", () => {
    const state = createEditorState(section, [serverPromo()]);
    const res = {
      section,
      promotions: [
        {
          id: "p2",
          title: "Only Server Promo",
          subtitle: null,
          imageUrl: "https://media.sublimepy.store/p2.webp",
          link: "/products/p2",
          position: 0,
          posY: 1,
          tileCols: 1,
          tileRows: 1,
        },
      ],
    };
    const synced = applySavedResponse(state, res);
    expect(synced.promotions).toHaveLength(1);
    expect(synced.promotions[0].id).toBe("p2");
  });

  it("preserves gridRows from the saved response (C2)", () => {
    const state = createEditorState(section, []);
    const synced = applySavedResponse(state, {
      section: { ...section, gridRows: 3 },
      promotions: [],
    });
    expect(synced.section.gridRows).toBe(3);
  });

  it("keeps the current section identity when the response section is null (F8)", () => {
    const state = createEditorState(section, [serverPromo()]);
    const synced = applySavedResponse(state, { section: null, promotions: [] });
    expect(synced.section.id).toBe("sec-1");
    expect(synced.section.gridRows).toBe(4);
    expect(synced.promotions).toEqual([]);
    expect(synced.deletedImageUrls).toEqual([]);
  });
});

describe("movePromotion", () => {
  it("moves an item from one index to another", () => {
    const state = createEditorState(section, [
      serverPromo({ id: "a" }),
      serverPromo({ id: "b" }),
      serverPromo({ id: "c" }),
    ]);
    const moved = movePromotion(state, 2, 0); // c to front
    expect(moved.promotions.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  it("returns a new state array without mutating the input", () => {
    const state = createEditorState(section, [
      serverPromo({ id: "a" }),
      serverPromo({ id: "b" }),
    ]);
    const moved = movePromotion(state, 0, 1);
    expect(state.promotions.map((p) => p.id)).toEqual(["a", "b"]);
    expect(moved.promotions.map((p) => p.id)).toEqual(["b", "a"]);
  });
});

describe("strip reorder keeps pure order semantics", () => {
  function stripReorder(s: PromoEditorState, from: number, to: number): PromoEditorState {
    const reordered = movePromotion(s, from, to);
    return { ...reordered, promotions: renumberOrder(reordered.promotions) };
  }

  it("keeps distinct posX 0..n-1 in the new order even with a full-grid tile", () => {
    const state = createEditorState(section, [
      serverPromo({ id: "hero", position: 0, tileCols: 8, tileRows: 4 }),
      serverPromo({ id: "b", position: 1 }),
      serverPromo({ id: "c", position: 2 }),
    ]);
    const reordered = stripReorder(state, 2, 0);
    expect(reordered.promotions.map((p) => p.id)).toEqual(["c", "hero", "b"]);
    expect(reordered.promotions.map((p) => p.posX)).toEqual([0, 1, 2]);
  });

  it("moves the middle item to the top and posX matches the new order", () => {
    const state = createEditorState(section, [
      serverPromo({ id: "a", position: 0 }),
      serverPromo({ id: "b", position: 1 }),
      serverPromo({ id: "c", position: 2 }),
    ]);
    const reordered = stripReorder(state, 1, 0);
    expect(reordered.promotions.map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(reordered.promotions.map((p) => p.posX)).toEqual([0, 1, 2]);
  });

  it("save payload emits the new posX sequence after a strip reorder", () => {
    const state = createEditorState(section, [
      serverPromo({ id: "a", position: 0 }),
      serverPromo({ id: "b", position: 1 }),
      serverPromo({ id: "c", position: 2 }),
    ]);
    const reordered = stripReorder(state, 2, 0);
    const payload = toSavePayload(reordered);
    expect(payload.promotions.map((p) => p.id)).toEqual(["c", "a", "b"]);
    expect(payload.promotions.map((p) => p.posX)).toEqual([0, 1, 2]);
  });
});

describe("addPromotion on a full grid", () => {
  const fullSection: EditorSection = { ...section, gridCols: 8, gridRows: 2 };

  const fullState = createEditorState(fullSection, [
    serverPromo({ id: "a", position: 0, posY: 0, tileCols: 4, tileRows: 2 }),
    serverPromo({ id: "b", position: 4, posY: 0, tileCols: 4, tileRows: 2 }),
  ]);

  it("still creates the tile, overlapping at the last row-major cell", () => {
    const added = addPromotion(fullState, { title: "Overlap", link: "/overlap" });
    expect(added.promotions).toHaveLength(3);
    const promo = added.promotions[2];
    expect(promo.title).toBe("Overlap");
    expect(promo.posX).toBe(7);
    expect(promo.posY).toBe(1);
    expect(promo.width).toBe(1);
    expect(promo.height).toBe(1);
  });

  it("clamps an oversized span to the grid", () => {
    const added = addPromotion(fullState, { title: "Big", link: "/big", width: 99, height: 99 });
    const promo = added.promotions[2];
    expect(promo.posX).toBe(0);
    expect(promo.posY).toBe(0);
    expect(promo.width).toBe(8);
    expect(promo.height).toBe(2);
  });

  it("still uses the first free cell when space exists (regression)", () => {
    const partial = createEditorState(fullSection, [
      serverPromo({ id: "a", position: 0, posY: 0, tileCols: 4, tileRows: 2 }),
    ]);
    const added = addPromotion(partial, { title: "Fit", link: "/fit" });
    expect(added.promotions[1].posX).toBe(4);
    expect(added.promotions[1].posY).toBe(0);
  });
});

describe("removePromotion", () => {
  it("removes the promo and records its id for deletion", () => {
    let state = createEditorState(section, [serverPromo({ id: "p1", imageUrl: "https://media.sublimepy.store/promo1.webp" })]);
    state = removePromotion(state, "p1");
    expect(state.promotions).toHaveLength(0);
    expect(state.deletedIds).toEqual(["p1"]);
  });

  it("records the removed promo image URL for R2 cleanup", () => {
    let state = createEditorState(section, [serverPromo({ id: "p1", imageUrl: "https://media.sublimepy.store/delete-me.webp" })]);
    state = removePromotion(state, "p1");
    expect(state.deletedImageUrls).toEqual(["https://media.sublimepy.store/delete-me.webp"]);
  });

  it("does not add a local-only promo to deletedIds", () => {
    let state = createEditorState(section, []);
    state = addPromotion(state, { title: "X", link: "/x" });
    state = removePromotion(state, localKey(state.promotions[0]));
    expect(state.deletedIds).toEqual([]);
    expect(state.promotions).toHaveLength(0);
  });

  it("removes an unsaved promo keyed by its localKey (F3)", () => {
    let state = createEditorState(section, []);
    state = addPromotion(state, { title: "X", link: "/x", imageUrl: "https://media.sublimepy.store/x.webp" });
    state = removePromotion(state, localKey(state.promotions[0]));
    expect(state.promotions).toHaveLength(0);
    expect(state.deletedIds).toEqual([]);
    // The unsaved promo's image URL still enters the R2 cleanup set.
    expect(state.deletedImageUrls).toEqual(["https://media.sublimepy.store/x.webp"]);
  });

  it("records the replaced-away image URL when a promo with previousImageUrl is removed (F6)", () => {
    let state = createEditorState(section, [serverPromo({ id: "p1" })]);
    state = updatePromotion(state, "p1", {
      imageUrl: "https://media.sublimepy.store/new.webp",
      previousImageUrl: "https://media.sublimepy.store/old.webp",
    });
    state = removePromotion(state, "p1");
    expect(state.deletedImageUrls).toContain("https://media.sublimepy.store/old.webp");
    expect(state.deletedIds).toEqual(["p1"]);
  });
});

describe("removePromotion — removedDraftUrls", () => {
  const draft = "blob:https://example.com/removed-draft";

  it("records the removed promo's localImageUrl for later revocation", () => {
    let state = createEditorState(section, [serverPromo({ id: "p1" })]);
    state = updatePromotion(state, "p1", { localImageUrl: draft });
    state = removePromotion(state, "p1");
    expect(state.promotions).toHaveLength(0);
    expect(state.removedDraftUrls).toEqual([draft]);
  });

  it("records nothing when the removed promo has no draft", () => {
    let state = createEditorState(section, [serverPromo({ id: "p1", imageUrl: "https://media.sublimepy.store/x.webp" })]);
    state = removePromotion(state, "p1");
    expect(state.removedDraftUrls).toEqual([]);
  });

  it("does not mutate the input state", () => {
    let state = createEditorState(section, [serverPromo({ id: "p1" })]);
    state = updatePromotion(state, "p1", { localImageUrl: draft });
    const before = createSnapshot(state);
    removePromotion(state, "p1");
    expect(state.removedDraftUrls).toEqual([]);
    expect(state.promotions).toHaveLength(1);
    expect(before.promotions[0].localImageUrl).toBe(draft);
  });

  it("resets removedDraftUrls when a saved response is applied", () => {
    let state = createEditorState(section, [serverPromo({ id: "p1" })]);
    state = updatePromotion(state, "p1", { localImageUrl: draft });
    state = removePromotion(state, "p1");
    expect(state.removedDraftUrls).toEqual([draft]);
    const synced = applySavedResponse(state, { section, promotions: [] });
    expect(synced.removedDraftUrls).toEqual([]);
  });

  it("undo restores a clean removedDraftUrls (pre-removal snapshot)", () => {
    let state = createEditorState(section, [serverPromo({ id: "p1" })]);
    state = updatePromotion(state, "p1", { localImageUrl: draft });
    const history = pushHistory(createHistory(), state);
    state = removePromotion(state, "p1");
    expect(state.removedDraftUrls).toEqual([draft]);
    const undone = undoEditor(history, state)!;
    expect(undone.state.removedDraftUrls).toEqual([]);
  });
});

describe("updatePromotion", () => {
  it("updates an unsaved promo by its localKey (F5)", () => {
    let state = createEditorState(section, []);
    state = addPromotion(state, { title: "Draft", link: "/draft" });
    const key = localKey(state.promotions[0]);
    state = updatePromotion(state, key, { title: "Edited Draft" });
    expect(state.promotions).toHaveLength(1);
    expect(state.promotions[0].title).toBe("Edited Draft");
  });
});

describe("draft image lifecycle (localImageUrl)", () => {
  it("addPromotion starts with no local image", () => {
    const state = createEditorState(section, []);
    const added = addPromotion(state, { title: "Draft", link: "/draft" });
    expect(added.promotions[0].localImageUrl).toBeNull();
  });

  it("setLocalImage returns a new promo with the object URL and no mutation", () => {
    const state = createEditorState(section, [serverPromo()]);
    const promo = state.promotions[0];
    const updated = setLocalImage(promo, "blob:https://example.com/draft");
    expect(updated).not.toBe(promo);
    expect(updated.localImageUrl).toBe("blob:https://example.com/draft");
    expect(promo.localImageUrl).toBeNull();
  });

  it("clearLocalImage returns a new promo with localImageUrl null and no mutation", () => {
    const state = createEditorState(section, [serverPromo()]);
    const promo = setLocalImage(state.promotions[0], "blob:https://example.com/draft");
    const cleared = clearLocalImage(promo);
    expect(cleared).not.toBe(promo);
    expect(cleared.localImageUrl).toBeNull();
    expect(promo.localImageUrl).toBe("blob:https://example.com/draft");
  });

  it("resolvePromoImage prefers the local object URL over the server image URL", () => {
    const state = createEditorState(section, [serverPromo()]);
    const promo = setLocalImage(state.promotions[0], "blob:https://example.com/draft");
    expect(resolvePromoImage(promo)).toBe("blob:https://example.com/draft");
  });

  it("resolvePromoImage falls back to the server image URL", () => {
    const state = createEditorState(section, [serverPromo()]);
    expect(resolvePromoImage(state.promotions[0])).toBe(
      "https://media.sublimepy.store/promo1.webp"
    );
  });

  it("resolvePromoImage falls back to the placeholder when nothing is available", () => {
    const state = createEditorState(section, [serverPromo({ imageUrl: null })]);
    expect(resolvePromoImage(state.promotions[0])).toBe("/placeholder-product.svg");
  });

  it("applySavedResponse clears a pending local image (server response has no local field)", () => {
    let state = createEditorState(section, []);
    state = addPromotion(state, { title: "Fresh", link: "/products/fresh" });
    state = updatePromotion(state, localKey(state.promotions[0]), {
      localImageUrl: "blob:https://example.com/draft",
    });
    const synced = applySavedResponse(state, {
      section: { ...section, gridCols: 8, gridRows: 4, displayType: "tiles" },
      promotions: [
        {
          id: "server-1",
          title: "Fresh",
          subtitle: null,
          imageUrl: "https://media.sublimepy.store/fresh.webp",
          link: "/products/fresh",
          position: 0,
          posY: 0,
          tileCols: 1,
          tileRows: 1,
        },
      ],
    });
    expect(synced.promotions[0].localImageUrl).toBeNull();
  });

  it("duplicatePromotion copies the source's local image so both show the same draft", () => {
    let state = createEditorState(section, [
      serverPromo({ id: "p1", position: 0, posY: 0, tileCols: 2, tileRows: 1 }),
    ]);
    state = updatePromotion(state, "p1", {
      localImageUrl: "blob:https://example.com/draft",
    });
    const duped = duplicatePromotion(state, "p1");
    const copy = duped.promotions.find((p) => p.id === null)!;
    expect(copy.localImageUrl).toBe("blob:https://example.com/draft");
  });
});

describe("orphanedDraftUrls", () => {
  it("returns object URLs present before but not after", () => {
    const before = [
      { localImageUrl: "blob:a" },
      { localImageUrl: "blob:b" },
      { localImageUrl: null },
    ];
    const after = [{ localImageUrl: "blob:b" }];
    expect(orphanedDraftUrls(before, after)).toEqual(["blob:a"]);
  });

  it("keeps a URL another promo still references (duplicate safety)", () => {
    const before = [
      { localImageUrl: "blob:d" },
      { localImageUrl: "blob:d" },
    ];
    const after = [{ localImageUrl: "blob:d" }];
    expect(orphanedDraftUrls(before, after)).toEqual([]);
  });

  it("returns an empty array when nothing changed", () => {
    const before = [{ localImageUrl: "blob:a" }];
    const after = [{ localImageUrl: "blob:a" }];
    expect(orphanedDraftUrls(before, after)).toEqual([]);
  });

  it("dedupes repeated orphaned URLs", () => {
    const before = [
      { localImageUrl: "blob:x" },
      { localImageUrl: "blob:x" },
    ];
    expect(orphanedDraftUrls(before, [])).toEqual(["blob:x"]);
  });

  it("ignores promos with no draft in the after state", () => {
    const before = [{ localImageUrl: "blob:y" }];
    expect(orphanedDraftUrls(before, [{ localImageUrl: null }])).toEqual(["blob:y"]);
  });
});

describe("orphanedDraftUrls (history-aware)", () => {
  const draftUrl = "blob:https://example.com/history-draft";

  function stateWithDraft(): PromoEditorState {
    let state = createEditorState(section, [
      serverPromo({ id: "p1", position: 0, posY: 0, tileCols: 2, tileRows: 1 }),
    ]);
    state = updatePromotion(state, "p1", { localImageUrl: draftUrl });
    return state;
  }

  it("keeps a draft referenced by a history snapshot (undo can restore it)", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      const history: EditorHistory = {
        past: [createSnapshot(stateWithDraft())],
        future: [],
      };
      const orphans = orphanedDraftUrls([{ localImageUrl: draftUrl }], [], history);
      orphans.forEach((u) => URL.revokeObjectURL(u));
      expect(orphans).toEqual([]);
      expect(revoke).not.toHaveBeenCalled();
    } finally {
      revoke.mockRestore();
    }
  });

  it("orphans the draft once the redo future that referenced it is cleared", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      const future: EditorHistory = {
        past: [],
        future: [createSnapshot(stateWithDraft())],
      };
      expect(orphanedDraftUrls([{ localImageUrl: draftUrl }], [], future)).toEqual([]);
      const cleared = pushHistory(createHistory(), createEditorState(section, []));
      const orphans = orphanedDraftUrls([{ localImageUrl: draftUrl }], [], cleared);
      orphans.forEach((u) => URL.revokeObjectURL(u));
      expect(orphans).toEqual([draftUrl]);
      expect(revoke).toHaveBeenCalledWith(draftUrl);
    } finally {
      revoke.mockRestore();
    }
  });

  it("orphans current-state-only drafts when removed", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      const orphans = orphanedDraftUrls(
        [{ localImageUrl: "blob:https://example.com/current" }],
        [],
        createHistory()
      );
      orphans.forEach((u) => URL.revokeObjectURL(u));
      expect(orphans).toEqual(["blob:https://example.com/current"]);
      expect(revoke).toHaveBeenCalledWith("blob:https://example.com/current");
    } finally {
      revoke.mockRestore();
    }
  });

  it("keeps the source draft alive while its duplicate also references it", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      const state = stateWithDraft();
      const duped = duplicatePromotion(state, "p1");
      const orphans = orphanedDraftUrls([state.promotions[0]], duped.promotions, createHistory());
      orphans.forEach((u) => URL.revokeObjectURL(u));
      expect(orphans).toEqual([]);
      expect(revoke).not.toHaveBeenCalled();
    } finally {
      revoke.mockRestore();
    }
  });
});

describe("draftUrlReferenced", () => {
  const draft = "blob:https://example.com/d1";
  const alt = "blob:https://example.com/a";

  function promoStateWith(localImageUrl: string | null): PromoEditorState {
    let state = createEditorState(section, [
      serverPromo({ id: "p1", position: 0, posY: 0, tileCols: 2, tileRows: 1 }),
    ]);
    state = updatePromotion(state, "p1", { localImageUrl });
    return state;
  }

  it("returns true when the current state references the URL", () => {
    const state = promoStateWith(draft);
    expect(draftUrlReferenced(draft, state.promotions, createHistory(), [])).toBe(true);
  });

  it("returns true when a past snapshot references the URL", () => {
    const history: EditorHistory = { past: [createSnapshot(promoStateWith(draft))], future: [] };
    expect(draftUrlReferenced(draft, promoStateWith(alt).promotions, history, [])).toBe(true);
  });

  it("returns true when a future snapshot references the URL", () => {
    const history: EditorHistory = { past: [], future: [createSnapshot(promoStateWith(draft))] };
    expect(draftUrlReferenced(draft, promoStateWith(alt).promotions, history, [])).toBe(true);
  });

  it("returns true when the pending snapshot (about to be pushed) references the URL", () => {
    const pending = promoStateWith(draft);
    expect(draftUrlReferenced(draft, promoStateWith(alt).promotions, createHistory(), [pending])).toBe(true);
  });

  it("returns false when nothing references the URL", () => {
    expect(draftUrlReferenced(draft, promoStateWith(alt).promotions, createHistory(), [])).toBe(false);
  });
});

describe("history-aware draft revocation (W-UNDO-REVOKED)", () => {
  const draft = "blob:https://example.com/d1";
  const alt = "blob:https://example.com/a";

  function promoStateWith(localImageUrl: string | null): PromoEditorState {
    let state = createEditorState(section, [
      serverPromo({ id: "p1", position: 0, posY: 0, tileCols: 2, tileRows: 1 }),
    ]);
    state = updatePromotion(state, "p1", { localImageUrl });
    return state;
  }

  it("keeps D1 live across pick→submit→pick→submit when a history snapshot references it", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      // edit P, pick D1, submit → history.past holds a snapshot referencing D1.
      let state = promoStateWith(draft);
      let history = pushHistory(createHistory(), state);
      // edit P again, pick A, submit → the submit guard must NOT revoke D1.
      const prev = state;
      state = updatePromotion(state, "p1", { localImageUrl: alt });
      const replacedDraft = draft;
      if (replacedDraft && !draftUrlReferenced(replacedDraft, state.promotions, history, [prev])) {
        URL.revokeObjectURL(replacedDraft);
      }
      expect(revoke).not.toHaveBeenCalledWith(draft);
      history = pushHistory(history, prev);
      // Undo twice: the tile must still show the live D1 object URL each time.
      const undone1 = undoEditor(history, state)!;
      expect(undone1.state.promotions[0].localImageUrl).toBe(draft);
      const undone2 = undoEditor(undone1.history, undone1.state)!;
      expect(undone2.state.promotions[0].localImageUrl).toBe(draft);
      expect(revoke).not.toHaveBeenCalledWith(draft);
    } finally {
      revoke.mockRestore();
    }
  });

  it("keeps the removed promo's draft live so undo restores it, then doSave revokes it", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      let state = promoStateWith(draft);
      let history = createHistory();
      // doRemove: the orphan scan sees the would-be history (prev included).
      const prev = state;
      const before = state.promotions;
      const next = removePromotion(state, "p1");
      const nextHistory = pushHistory(history, prev);
      orphanedDraftUrls(before, next.promotions, nextHistory).forEach((u) => URL.revokeObjectURL(u));
      expect(revoke).not.toHaveBeenCalledWith(draft);
      history = nextHistory;
      state = next;
      // First Ctrl+Z restores the tile with the live draft URL.
      const undone = undoEditor(history, state)!;
      expect(undone.state.promotions[0].localImageUrl).toBe(draft);
      // After doSave (history cleared), the post-save scan revokes the draft.
      const preSavePromotions = undone.state.promotions;
      const saved = applySavedResponse(undone.state, {
        section,
        promotions: [
          {
            id: "p1",
            title: "Summer Sale",
            subtitle: null,
            imageUrl: "https://media.sublimepy.store/saved.webp",
            link: "/products/remera",
            position: 0,
            posY: 0,
            tileCols: 2,
            tileRows: 1,
          },
        ],
      });
      orphanedDraftUrls(preSavePromotions, saved.promotions, createHistory()).forEach((u) => URL.revokeObjectURL(u));
      expect(revoke).toHaveBeenCalledWith(draft);
    } finally {
      revoke.mockRestore();
    }
  });

  it("revokes the replaced draft at submit when nothing references it (history evicted)", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      let history: EditorHistory = createHistory();
      for (let i = 0; i < HISTORY_LIMIT; i++) {
        history = pushHistory(history, promoStateWith(alt));
      }
      const state = promoStateWith(alt);
      const prev = state;
      expect(draftUrlReferenced(draft, state.promotions, history, [prev])).toBe(false);
      if (!draftUrlReferenced(draft, state.promotions, history, [prev])) {
        URL.revokeObjectURL(draft);
      }
      expect(revoke).toHaveBeenCalledWith(draft);
    } finally {
      revoke.mockRestore();
    }
  });

  it("doSave revokes the removed promo's draft exactly once, and only at save (LEAK)", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      let state = promoStateWith(draft);
      let history = createHistory();
      // doRemove: the history snapshot keeps the draft live (undo can restore).
      const prev = state;
      const before = state.promotions;
      const next = removePromotion(state, "p1");
      const nextHistory = pushHistory(history, prev);
      orphanedDraftUrls(before, next.promotions, nextHistory).forEach((u) => URL.revokeObjectURL(u));
      expect(revoke).not.toHaveBeenCalledWith(draft);
      history = nextHistory;
      state = next;
      // doSave: history cleared, then the removed draft becomes unreferenced.
      const preSavePromotions = state.promotions;
      const removedDraftUrls = [...state.removedDraftUrls];
      state = applySavedResponse(state, { section, promotions: [] });
      history = createHistory();
      orphanedDraftUrls(preSavePromotions, state.promotions).forEach((u) => URL.revokeObjectURL(u));
      for (const u of new Set(removedDraftUrls)) {
        if (!draftUrlReferenced(u, preSavePromotions)) URL.revokeObjectURL(u);
      }
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith(draft);
    } finally {
      revoke.mockRestore();
    }
  });

  it("remove → undo → save keeps the restored draft live until save revokes it once", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      let state = promoStateWith(draft);
      let history = createHistory();
      const prev = state;
      const before = state.promotions;
      const next = removePromotion(state, "p1");
      const nextHistory = pushHistory(history, prev);
      orphanedDraftUrls(before, next.promotions, nextHistory).forEach((u) => URL.revokeObjectURL(u));
      expect(revoke).not.toHaveBeenCalledWith(draft);
      history = nextHistory;
      state = next;
      // Undo restores the promo WITH its draft URL still live.
      const undone = undoEditor(history, state)!;
      state = undone.state;
      history = undone.history;
      expect(state.promotions[0].localImageUrl).toBe(draft);
      expect(revoke).not.toHaveBeenCalledWith(draft);
      // Save: the restored promo's draft is superseded by server truth.
      const preSavePromotions = state.promotions;
      const removedDraftUrls = [...state.removedDraftUrls];
      state = applySavedResponse(state, {
        section,
        promotions: [
          {
            id: "p1",
            title: "Summer Sale",
            subtitle: null,
            imageUrl: "https://media.sublimepy.store/saved.webp",
            link: "/products/remera",
            position: 0,
            posY: 0,
            tileCols: 2,
            tileRows: 1,
          },
        ],
      });
      history = createHistory();
      orphanedDraftUrls(preSavePromotions, state.promotions).forEach((u) => URL.revokeObjectURL(u));
      for (const u of new Set(removedDraftUrls)) {
        if (!draftUrlReferenced(u, preSavePromotions)) URL.revokeObjectURL(u);
      }
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith(draft);
    } finally {
      revoke.mockRestore();
    }
  });

  it("doSave does not revoke the removed draft while a duplicate still references it (dedupe-safe)", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      let state = promoStateWith(draft);
      state = duplicatePromotion(state, "p1");
      // Remove the source; the duplicate keeps the same draft URL.
      state = removePromotion(state, "p1");
      expect(state.removedDraftUrls).toEqual([draft]);
      expect(state.promotions.some((p) => p.localImageUrl === draft)).toBe(true);
      // doSave with a surviving duplicate referencing the URL.
      const preSavePromotions = state.promotions;
      const removedDraftUrls = [...state.removedDraftUrls];
      state = applySavedResponse(state, { section, promotions: [] });
      orphanedDraftUrls(preSavePromotions, state.promotions).forEach((u) => URL.revokeObjectURL(u));
      for (const u of new Set(removedDraftUrls)) {
        if (!draftUrlReferenced(u, preSavePromotions)) URL.revokeObjectURL(u);
      }
      // The duplicate's draft is released once by the post-save scan; the
      // removedDraftUrls pass skips it because the duplicate references it.
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith(draft);
    } finally {
      revoke.mockRestore();
    }
  });

  it("doRevert revokes the removed promo's draft once the working copy is discarded", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      const snap = createSnapshot(createEditorState(section, [serverPromo({ id: "p1" })]));
      let state = promoStateWith(draft);
      let history = createHistory();
      const prev = state;
      const before = state.promotions;
      const next = removePromotion(state, "p1");
      const nextHistory = pushHistory(history, prev);
      orphanedDraftUrls(before, next.promotions, nextHistory).forEach((u) => URL.revokeObjectURL(u));
      expect(revoke).not.toHaveBeenCalledWith(draft);
      history = nextHistory;
      state = next;
      // doRevert: discard the working copy, history gone → draft unreferenced.
      const revertBefore = state.promotions;
      const removedDrafts = [...state.removedDraftUrls];
      state = revert(state, snap);
      orphanedDraftUrls(revertBefore, state.promotions).forEach((u) => URL.revokeObjectURL(u));
      for (const u of new Set(removedDrafts)) {
        if (!draftUrlReferenced(u, revertBefore)) URL.revokeObjectURL(u);
      }
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith(draft);
    } finally {
      revoke.mockRestore();
    }
  });

  it("doRevert with a surviving duplicate revokes the shared draft exactly once", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      const snap = createSnapshot(createEditorState(section, [serverPromo({ id: "p1" })]));
      let state = promoStateWith(draft);
      state = duplicatePromotion(state, "p1");
      let history = createHistory();
      const prev = state;
      const before = state.promotions;
      const next = removePromotion(state, "p1");
      const nextHistory = pushHistory(history, prev);
      orphanedDraftUrls(before, next.promotions, nextHistory).forEach((u) => URL.revokeObjectURL(u));
      history = nextHistory;
      state = next;
      // The discarded working copy still holds the duplicate with the draft:
      // the orphan scan releases it, the removedDraftUrls pass must skip it.
      const revertBefore = state.promotions;
      const removedDrafts = [...state.removedDraftUrls];
      state = revert(state, snap);
      orphanedDraftUrls(revertBefore, state.promotions).forEach((u) => URL.revokeObjectURL(u));
      for (const u of new Set(removedDrafts)) {
        if (!draftUrlReferenced(u, revertBefore)) URL.revokeObjectURL(u);
      }
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith(draft);
    } finally {
      revoke.mockRestore();
    }
  });

  it("selectSection revokes the removed promo's draft when switching sections", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      let state = promoStateWith(draft);
      let history = createHistory();
      const prev = state;
      const before = state.promotions;
      const next = removePromotion(state, "p1");
      const nextHistory = pushHistory(history, prev);
      orphanedDraftUrls(before, next.promotions, nextHistory).forEach((u) => URL.revokeObjectURL(u));
      expect(revoke).not.toHaveBeenCalledWith(draft);
      history = nextHistory;
      state = next;
      // selectSection: outgoing working copy is discarded, history reset.
      const outgoing = state;
      const otherSection: EditorSection = { ...section, id: "sec-2", slug: "home-bottom" };
      const nextState = createEditorState(otherSection, []);
      orphanedDraftUrls(outgoing.promotions, nextState.promotions, { past: [], future: [] }).forEach((u) => URL.revokeObjectURL(u));
      for (const u of new Set(outgoing.removedDraftUrls)) {
        if (!draftUrlReferenced(u, outgoing.promotions)) URL.revokeObjectURL(u);
      }
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith(draft);
    } finally {
      revoke.mockRestore();
    }
  });
});

describe("history discard revocation (W-HISTORY-LEAK)", () => {
  const draft = "blob:https://example.com/d1";
  const alt = "blob:https://example.com/a";

  function stateWithPromo(): PromoEditorState {
    return createEditorState(section, [serverPromo({ id: "p1" })]);
  }

  function submitPick(
    history: EditorHistory,
    state: PromoEditorState,
    url: string
  ): { state: PromoEditorState; history: EditorHistory } {
    const prev = state;
    return { state: updatePromotion(state, "p1", { localImageUrl: url }), history: pushHistory(history, prev) };
  }

  function savedResponse(): SavedPromotionsResponse {
    return {
      section,
      promotions: [
        {
          id: "p1",
          title: "Summer Sale",
          subtitle: null,
          imageUrl: "https://media.sublimepy.store/saved.webp",
          link: "/products/remera",
          position: 0,
          posY: 0,
          tileCols: 2,
          tileRows: 1,
        },
      ],
    };
  }

  it("doSave revokes the superseded history-only draft once, and the live draft once", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      // pick U, submit → the pushed snapshot keeps U referenced.
      let state = stateWithPromo();
      let history = createHistory();
      ({ state, history } = submitPick(history, state, draft));
      // pick V, submit → U is deferred: still referenced by the past stack.
      const prevV = state;
      ({ state, history } = submitPick(history, state, alt));
      expect(draftUrlReferenced(draft, state.promotions, history, [prevV])).toBe(true);
      expect(revoke).not.toHaveBeenCalled();
      // doSave: server truth replaces the working copy, stacks are discarded.
      const preSavePromotions = state.promotions;
      const removedDraftUrls = [...state.removedDraftUrls];
      const discardedDrafts = historyDraftUrls(history);
      state = applySavedResponse(state, savedResponse());
      history = createHistory();
      revokeDraftUrlsOnce(
        [...discardedDrafts, ...removedDraftUrls, ...orphanedDraftUrls(preSavePromotions, state.promotions)],
        state.promotions
      );
      // U was reachable only through history: released exactly once. V, the
      // current draft, is released once by the orphan scan, never twice.
      expect(revoke).toHaveBeenCalledTimes(2);
      expect(revoke).toHaveBeenCalledWith(draft);
      expect(revoke).toHaveBeenCalledWith(alt);
    } finally {
      revoke.mockRestore();
    }
  });

  it("doRevert revokes the superseded history-only draft once when the working copy is discarded", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      let state = stateWithPromo();
      let history = createHistory();
      ({ state, history } = submitPick(history, state, draft));
      ({ state, history } = submitPick(history, state, alt));
      const before = state.promotions;
      const discardedDrafts = [
        ...historyDraftUrls(history),
        ...orphanedDraftUrls(before, createSnapshot(stateWithPromo()).promotions),
        ...state.removedDraftUrls,
      ];
      state = revert(state, createSnapshot(stateWithPromo()));
      history = createHistory();
      revokeDraftUrlsOnce(discardedDrafts, state.promotions);
      expect(revoke).toHaveBeenCalledTimes(2);
      expect(revoke).toHaveBeenCalledWith(draft);
      expect(revoke).toHaveBeenCalledWith(alt);
    } finally {
      revoke.mockRestore();
    }
  });

  it("selectSection revokes the superseded history-only draft once when switching sections", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      let state = stateWithPromo();
      let history = createHistory();
      ({ state, history } = submitPick(history, state, draft));
      ({ state, history } = submitPick(history, state, alt));
      const outgoing = state;
      const otherSection: EditorSection = { ...section, id: "sec-2", slug: "home-bottom" };
      const nextState = createEditorState(otherSection, []);
      const discardedDrafts = [
        ...historyDraftUrls(history),
        ...orphanedDraftUrls(outgoing.promotions, nextState.promotions, { past: [], future: [] }),
        ...outgoing.removedDraftUrls,
      ];
      revokeDraftUrlsOnce(discardedDrafts, nextState.promotions);
      expect(revoke).toHaveBeenCalledTimes(2);
      expect(revoke).toHaveBeenCalledWith(draft);
      expect(revoke).toHaveBeenCalledWith(alt);
    } finally {
      revoke.mockRestore();
    }
  });

  it("undo-to-U then save keeps U live until the last reference dies", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      let state = stateWithPromo();
      let history = createHistory();
      ({ state, history } = submitPick(history, state, draft));
      ({ state, history } = submitPick(history, state, alt));
      // Ctrl+Z back to U: the undo scan keeps U (state + history reference it).
      const undone = undoEditor(history, state)!;
      orphanedDraftUrls(state.promotions, undone.state.promotions, undone.history).forEach((u) => URL.revokeObjectURL(u));
      state = undone.state;
      history = undone.history;
      expect(state.promotions[0].localImageUrl).toBe(draft);
      expect(revoke).not.toHaveBeenCalled();
      // Save: server truth kills the last reference → U revoked exactly once.
      const preSavePromotions = state.promotions;
      const discardedDrafts = historyDraftUrls(history);
      state = applySavedResponse(state, savedResponse());
      history = createHistory();
      revokeDraftUrlsOnce(
        [...discardedDrafts, ...state.removedDraftUrls, ...orphanedDraftUrls(preSavePromotions, state.promotions)],
        state.promotions
      );
      expect(revoke).toHaveBeenCalledTimes(2);
      expect(revoke).toHaveBeenCalledWith(draft);
      expect(revoke).toHaveBeenCalledWith(alt);
    } finally {
      revoke.mockRestore();
    }
  });

  it("duplicate sharing U across history and removedDraftUrls is not double-revoked at save", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      let state = stateWithPromo();
      let history = createHistory();
      ({ state, history } = submitPick(history, state, draft));
      // Duplicate shares U; remove the source → U lands in removedDraftUrls.
      state = duplicatePromotion(state, "p1");
      history = pushHistory(history, state);
      state = removePromotion(state, "p1");
      expect(state.removedDraftUrls).toEqual([draft]);
      expect(state.promotions.some((p) => p.localImageUrl === draft)).toBe(true);
      // doSave: U is a candidate from the history stacks AND removedDraftUrls.
      const preSavePromotions = state.promotions;
      const removedDraftUrls = [...state.removedDraftUrls];
      const discardedDrafts = historyDraftUrls(history);
      state = applySavedResponse(state, savedResponse());
      history = createHistory();
      revokeDraftUrlsOnce(
        [...discardedDrafts, ...removedDraftUrls, ...orphanedDraftUrls(preSavePromotions, state.promotions)],
        state.promotions
      );
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith(draft);
    } finally {
      revoke.mockRestore();
    }
  });

  it("revokeDraftUrlsOnce skips URLs the post-swap state still references, revoking each candidate once", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      const live = [{ localImageUrl: alt }];
      revokeDraftUrlsOnce([draft, alt, draft], live);
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith(draft);
      expect(revoke).not.toHaveBeenCalledWith(alt);
    } finally {
      revoke.mockRestore();
    }
  });
});

describe("localKey / localId uniqueness (FIX2)", () => {
  it("assigns every unsaved promo a unique stable localId at creation", () => {
    let state = createEditorState(section, []);
    state = addPromotion(state, { title: "A", link: "/a" });
    state = addPromotion(state, { title: "B", link: "/b" });
    const a = state.promotions[0];
    const b = state.promotions[1];
    expect(a.id).toBeNull();
    expect(b.id).toBeNull();
    expect(a.localId).toBeTruthy();
    expect(b.localId).toBeTruthy();
    expect(a.localId).not.toBe(b.localId);
    expect(localKey(a)).not.toBe(localKey(b));
  });

  it("duplicated promos get a fresh localId distinct from the source", () => {
    let state = createEditorState(section, [serverPromo({ id: "p1" })]);
    const duped = duplicatePromotion(state, "p1");
    const copy = duped.promotions.find((p) => p.id === null)!;
    expect(copy.localId).toBeTruthy();
    expect(copy.localId).not.toBe(localKey(duped.promotions[0]));
  });

  it("the localKey of an unsaved promo is stable when it moves (position-independent)", () => {
    let state = createEditorState(section, []);
    state = addPromotion(state, { title: "A", link: "/a" });
    const keyBefore = localKey(state.promotions[0]);
    state = updatePromotion(state, keyBefore, { posX: 5, posY: 2 });
    expect(localKey(state.promotions[0])).toBe(keyBefore);
  });

  it("edits and removes overlapping unsaved promos independently (FIX2)", () => {
    let state = createEditorState(section, []);
    state = addPromotion(state, { title: "A", link: "/a" });
    state = addPromotion(state, { title: "B", link: "/b" });
    const keyA = localKey(state.promotions[0]);
    const keyB = localKey(state.promotions[1]);
    // Park both on the same cell — overlap is warn-only, allowed.
    state = updatePromotion(state, keyA, { posX: 0, posY: 0 });
    state = updatePromotion(state, keyB, { posX: 0, posY: 0 });
    expect(localKey(state.promotions[0])).toBe(keyA);
    expect(localKey(state.promotions[1])).toBe(keyB);

    state = updatePromotion(state, keyA, { title: "A edited" });
    expect(state.promotions[0].title).toBe("A edited");
    expect(state.promotions[1].title).toBe("B");

    state = removePromotion(state, keyA);
    expect(state.promotions).toHaveLength(1);
    expect(state.promotions[0].title).toBe("B");
    expect(state.deletedIds).toEqual([]);
  });

  it("server promos keep id-based keys and ignore localId", () => {
    const state = createEditorState(section, [serverPromo({ id: "p1" })]);
    expect(localKey(state.promotions[0])).toBe("p1");
  });
});

describe("nextLocalId", () => {
  it("returns distinct values across calls", () => {
    const a = nextLocalId();
    const b = nextLocalId();
    expect(a).not.toBe(b);
  });
});

describe("stripHoverIndex (FIX1)", () => {
  const items = [
    { top: 0, bottom: 40 },
    { top: 44, bottom: 84 },
    { top: 88, bottom: 128 },
  ];

  it("returns the index whose vertical span contains the pointer Y", () => {
    expect(stripHoverIndex(items, 20)).toBe(0);
    expect(stripHoverIndex(items, 60)).toBe(1);
    expect(stripHoverIndex(items, 100)).toBe(2);
  });

  it("returns the containing index for a pointer in an item's upper half", () => {
    expect(stripHoverIndex(items, 30)).toBe(0);
    expect(stripHoverIndex(items, 70)).toBe(1);
  });

  it("snaps a pointer above the first item to index 0", () => {
    expect(stripHoverIndex(items, -10)).toBe(0);
  });

  it("snaps a pointer below the last item to the last index", () => {
    expect(stripHoverIndex(items, 500)).toBe(2);
  });

  it("snaps a middle-gap drop to the gap's nearest slot, never the strip end", () => {
    const five = [
      { top: 0, bottom: 40 },
      { top: 44, bottom: 84 },
      { top: 88, bottom: 128 },
      { top: 132, bottom: 172 },
      { top: 176, bottom: 216 },
    ];
    // Gap between items 2 and 3 spans (128, 132); its midpoint is 130.
    expect(stripHoverIndex(five, 129)).toBe(2);
    expect(stripHoverIndex(five, 131)).toBe(3);
    expect(stripHoverIndex(five, 130)).not.toBe(4);
  });

  it("keeps a single-item strip anchored to index 0 on either side", () => {
    const single = [{ top: 10, bottom: 60 }];
    expect(stripHoverIndex(single, 0)).toBe(0);
    expect(stripHoverIndex(single, 35)).toBe(0);
    expect(stripHoverIndex(single, 1000)).toBe(0);
  });

  it("returns -1 for an empty strip", () => {
    expect(stripHoverIndex([], 50)).toBe(-1);
  });
});

describe("isPromoEditorRoute", () => {
  it("matches the promotions editor page path", () => {
    expect(isPromoEditorRoute("/admin/promotions")).toBe(true);
    expect(isPromoEditorRoute("/admin/promotions/")).toBe(true);
  });

  it("rejects other admin routes", () => {
    expect(isPromoEditorRoute("/admin")).toBe(false);
    expect(isPromoEditorRoute("/admin/products")).toBe(false);
    expect(isPromoEditorRoute("/")).toBe(false);
  });
});

describe("validatePromotionsForSave", () => {
  it("returns null when every promo has a title", () => {
    const state = createEditorState(section, [serverPromo()]);
    expect(validatePromotionsForSave(state.promotions)).toBeNull();
  });

  it("names the offending tile when a promo title is blank (F10)", () => {
    let state = createEditorState(section, [serverPromo({ id: "p1", title: "Ok" })]);
    state = addPromotion(state, { title: "", link: "/x" });
    const error = validatePromotionsForSave(state.promotions);
    expect(error).not.toBeNull();
    expect(error!).toContain("celda 1,1");
  });
});

describe("duplicatePromotion", () => {
  it("adds a copy on the first free cell with a new id", () => {
    const state = createEditorState(section, [serverPromo({ id: "p1", position: 0, posY: 0, tileCols: 2, tileRows: 1 })]);
    const duped = duplicatePromotion(state, "p1");
    expect(duped.promotions).toHaveLength(2);
    const copy = duped.promotions.find((p) => p.id !== "p1")!;
    expect(copy).toBeDefined();
    expect(copy.title).toBe("Summer Sale");
    expect(copy.width).toBe(2);
    expect(copy.height).toBe(1);
    // First free cell after (0,0,2,1) row-major is (2,0).
    expect(copy.posX).toBe(2);
    expect(copy.posY).toBe(0);
  });

  it("still adds a copy, overlapping at the last row-major cell, when the grid is full", () => {
    const full: Record<string, unknown>[] = [];
    for (let i = 0; i < 8 * 4; i++) {
      full.push(serverPromo({ id: `p${i}`, position: i % 8, posY: Math.floor(i / 8), tileCols: 1, tileRows: 1 }));
    }
    const state = createEditorState(section, full);
    expect(state.promotions).toHaveLength(32);
    const duped = duplicatePromotion(state, "p0");
    expect(duped.promotions).toHaveLength(full.length + 1);
    const copy = duped.promotions[duped.promotions.length - 1];
    expect(copy.posX).toBe(7);
    expect(copy.posY).toBe(3);
    expect(copy.width).toBe(1);
    expect(copy.height).toBe(1);
  });

  it("duplicates an unsaved tile by its local key into two independent working copies", () => {
    let state = createEditorState(section, []);
    state = addPromotion(state, {
      title: "Draft",
      link: "/draft",
      localImageUrl: "blob:draft-1",
    });
    const source = state.promotions[0];
    const duped = duplicatePromotion(state, localKey(source));
    expect(duped.promotions).toHaveLength(2);
    const [orig, copy] = duped.promotions;
    expect(orig).toEqual(source);
    expect(copy.id).toBeNull();
    expect(copy.title).toBe("Draft");
    expect(copy.link).toBe("/draft");
    expect(copy.localImageUrl).toBe("blob:draft-1");
    expect(copy.localId).toBeTruthy();
    expect(copy.localId).not.toBe(orig.localId);
    expect(localKey(copy)).not.toBe(localKey(orig));
  });
});

describe("setSection", () => {
  it("merges a patch into the section", () => {
    const state = createEditorState(section, []);
    const patched = setSection(state, { gridCols: 4, displayType: "carousel" });
    expect(patched.section.gridCols).toBe(4);
    expect(patched.section.displayType).toBe("carousel");
    expect(patched.section.id).toBe("sec-1");
  });
});

describe("history (push/undo/redo)", () => {
  it("pushes states into the past and caps at 50 (oldest evicted)", () => {
    let history: EditorHistory = createHistory();
    for (let i = 0; i < 60; i++) {
      history = pushHistory(history, createEditorState(section, [serverPromo({ title: `S${i}` })]));
    }
    expect(history.past).toHaveLength(50);
    // Oldest evicted: the surviving head is S10 (the 11th pushed state).
    expect(history.past[0].promotions[0].title).toBe("S10");
    expect(history.past[49].promotions[0].title).toBe("S59");
  });

  it("undo returns null at the start of history", () => {
    const state = createEditorState(section, [serverPromo()]);
    expect(undoEditor(createHistory(), state)).toBeNull();
  });

  it("undo restores the previous state and enables redo", () => {
    let state = createEditorState(section, [serverPromo({ title: "Original" })]);
    const before = createSnapshot(state);
    state = updatePromotion(state, "p1", { title: "Edited" });
    let history = pushHistory(createHistory(), before);

    const undone = undoEditor(history, state);
    expect(undone).not.toBeNull();
    expect(undone!.state.promotions[0].title).toBe("Original");
    expect(undone!.history.future).toHaveLength(1);
    expect(undone!.history.past).toHaveLength(0);

    const redone = redoEditor(undone!.history, undone!.state);
    expect(redone).not.toBeNull();
    expect(redone!.state.promotions[0].title).toBe("Edited");
  });

  it("redo returns null when there is no future", () => {
    const state = createEditorState(section, [serverPromo()]);
    expect(redoEditor(createHistory(), state)).toBeNull();
  });
});

describe("shouldWarnBeforeUnload", () => {
  it("warns when dirty and not when clean", () => {
    const state = createEditorState(section, [serverPromo()]);
    const snap = createSnapshot(state);
    expect(shouldWarnBeforeUnload(state, snap)).toBe(false);
    const edited = updatePromotion(state, "p1", { title: "Changed" });
    expect(shouldWarnBeforeUnload(edited, snap)).toBe(true);
  });
});

describe("extractFilename", () => {
  it("extracts the R2 filename from a bucket-domain URL", () => {
    expect(extractFilename("https://media.sublimepy.store/123-abc.webp")).toBe("123-abc.webp");
  });

  it("extracts the filename from a local upload-proxy URL", () => {
    expect(extractFilename("http://localhost:8787/api/upload/123-abc.webp")).toBe("123-abc.webp");
  });

  it("returns null for URLs without a filename path", () => {
    expect(extractFilename("https://example.com/not-an-upload")).toBeNull();
    expect(extractFilename("")).toBeNull();
  });
});

describe("survivingImageReferences (FIX1)", () => {
  const X = "https://media.sublimepy.store/shared.webp";
  const Y = "https://media.sublimepy.store/other.webp";

  function promo(
    id: string | null,
    imageUrl: string | null,
    extra: Partial<EditorPromotion> = {}
  ): EditorPromotion {
    return {
      id,
      localId: null,
      title: "T",
      subtitle: null,
      imageUrl,
      localImageUrl: null,
      link: "/",
      posX: 0,
      posY: 0,
      width: 1,
      height: 1,
      isActive: true,
      imageId: null,
      imageBlob: null,
      previousImageUrl: null,
      ...extra,
    };
  }

  it("collects the imageUrl of every surviving promo", () => {
    const refs = survivingImageReferences([promo("a", X), promo(null, Y)]);
    expect(refs.has(X)).toBe(true);
    expect(refs.has(Y)).toBe(true);
  });

  it("uses the resolved upload URL for an existing promo with a pending blob", () => {
    const refs = survivingImageReferences(
      [promo("a", null, { imageBlob: new Blob(["x"]) })],
      { a: Y }
    );
    expect(refs.has(Y)).toBe(true);
    expect(refs.has(X)).toBe(false);
  });

  it("considers the previousImageUrl of surviving promos a reference", () => {
    const refs = survivingImageReferences([promo("a", Y, { previousImageUrl: X })]);
    expect(refs.has(X)).toBe(true);
  });

  it("ignores promos with no image at all", () => {
    const refs = survivingImageReferences([promo("a", null)]);
    expect(refs.size).toBe(0);
  });
});

describe("doSave R2 cleanup reference check (FIX1)", () => {
  const X = "https://media.sublimepy.store/shared.webp";
  const Y = "https://media.sublimepy.store/other.webp";
  const U = "https://media.sublimepy.store/unique.webp";

  function promo(
    id: string | null,
    imageUrl: string | null,
    extra: Partial<EditorPromotion> = {}
  ): EditorPromotion {
    return {
      id,
      localId: null,
      title: "T",
      subtitle: null,
      imageUrl,
      localImageUrl: null,
      link: "/",
      posX: 0,
      posY: 0,
      width: 1,
      height: 1,
      isActive: true,
      imageId: null,
      imageBlob: null,
      previousImageUrl: null,
      ...extra,
    };
  }

  function runCleanup(
    preSave: EditorPromotion[],
    removedImageUrls: string[],
    resolvedUrls: Record<string, string | null> = {}
  ): string[] {
    const cleanupTargets = new Set<string>(removedImageUrls);
    for (const p of preSave) {
      if (p.previousImageUrl && p.previousImageUrl !== p.imageUrl) {
        cleanupTargets.add(p.previousImageUrl);
      }
    }
    const refs = survivingImageReferences(preSave, resolvedUrls);
    const deleted: string[] = [];
    for (const url of cleanupTargets) {
      if (refs.has(url)) continue;
      const filename = extractFilename(url);
      if (filename) deleted.push(filename);
    }
    return deleted;
  }

  it("(a) duplicate + delete original: shared URL NOT deleted", () => {
    const duplicate = promo(null, X);
    expect(runCleanup([duplicate], [X])).toEqual([]);
  });

  it("(b) replace image on one of two sharing promos: old URL NOT deleted", () => {
    const untouched = promo("a", X);
    const replaced = promo("b", null, {
      imageBlob: new Blob(["x"]),
      previousImageUrl: X,
    });
    expect(runCleanup([untouched, replaced], [], { b: Y })).toEqual([]);
  });

  it("(c) delete both sharing promos: URL deleted once", () => {
    expect(runCleanup([], [X, X])).toEqual(["shared.webp"]);
  });

  it("(d) normal delete of a unique image: still deleted", () => {
    expect(runCleanup([], [U])).toEqual(["unique.webp"]);
  });

  it("deletes a removed promo's unique URL when the survivor has a different image", () => {
    const survivor = promo("a", Y);
    expect(runCleanup([survivor], [X])).toEqual(["shared.webp"]);
  });
});
