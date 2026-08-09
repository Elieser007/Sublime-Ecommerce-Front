/**
 * Promo Editor — local store tests (TDD RED).
 *
 * The store holds a working copy of the section + promotions. Every edit is
 * local-only; Guardar commits one batch PUT built by toSavePayload. Refs:
 * PM-3 (local state/single commit), PM-5 (image lifecycle), AD "Undo
 * granularity" (one history entry per completed interaction, cap 50) and
 * "Batch response sync" (applySavedResponse maps server truth to state).
 */

import { describe, it, expect } from "vitest";
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
  type EditorSection,
  type EditorPromotion,
  type PromoEditorState,
  type EditorHistory,
} from "../lib/promo-editor";

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

  it("snaps a pointer above the first item to index 0", () => {
    expect(stripHoverIndex(items, -10)).toBe(0);
  });

  it("snaps a pointer below the last item to the last index", () => {
    expect(stripHoverIndex(items, 500)).toBe(2);
  });

  it("returns -1 for an empty strip", () => {
    expect(stripHoverIndex([], 50)).toBe(-1);
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

  it("leaves the state unchanged when the grid is full", () => {
    const full: Record<string, unknown>[] = [];
    for (let i = 0; i < 8 * 4; i++) {
      full.push(serverPromo({ id: `p${i}`, position: i % 8, posY: Math.floor(i / 8), tileCols: 1, tileRows: 1 }));
    }
    const state = createEditorState(section, full);
    expect(state.promotions).toHaveLength(32);
    const duped = duplicatePromotion(state, "p0");
    expect(duped.promotions).toHaveLength(full.length);
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
