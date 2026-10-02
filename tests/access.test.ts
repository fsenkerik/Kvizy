import { describe, expect, it } from "vitest";
import { accessFor } from "@/lib/db/access";

const group = { teacherId: "vlastnik" };

describe("accessFor", () => {
  it("vlastník má plný přístup", () => {
    expect(accessFor(group, "vlastnik")).toEqual({ role: "owner", canEdit: true, isOwner: true });
  });
  it("cizí učitel bez sdílení nemá přístup", () => {
    expect(accessFor(group, "kolega")).toBeNull();
    expect(accessFor(group, "kolega", null)).toBeNull();
  });
  it("sdílení s právem úprav umožní editaci, ale ne vlastnictví", () => {
    expect(accessFor(group, "kolega", { role: "edit" })).toEqual({ role: "edit", canEdit: true, isOwner: false });
  });
  it("sdílení jen pro prohlížení neumožní editaci", () => {
    expect(accessFor(group, "kolega", { role: "view" })).toEqual({ role: "view", canEdit: false, isOwner: false });
  });
  it("vlastníka sdílení neomezí", () => {
    expect(accessFor(group, "vlastnik", { role: "view" })).toEqual({ role: "owner", canEdit: true, isOwner: true });
  });
});
