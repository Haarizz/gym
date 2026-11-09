import { describe, expect, it } from "vitest";
import { staffFreezeDays, freezeUntilForApi } from "../StaffFreezeOptions";

// Freeze dates follow old GymBios: From → To, where To is the day the member is active again.
describe("staff freeze dates", () => {
  it("counts From → To days like old GymBios (3 → 13 Nov = 10 days)", () => {
    expect(staffFreezeDays(new Date(2026, 10, 3), new Date(2026, 10, 13))).toBe(10);
    expect(staffFreezeDays(new Date(2026, 10, 3), new Date(2026, 10, 4))).toBe(1);
    expect(staffFreezeDays(new Date(2026, 10, 3), new Date(2026, 10, 3))).toBe(0);
    expect(staffFreezeDays(undefined, new Date(2026, 10, 13))).toBe(0);
  });

  it("sends the API the last frozen day (To − 1), which it stores as ending on To", () => {
    expect(freezeUntilForApi(new Date(2026, 10, 13))).toBe("2026-11-12T00:00:00Z");
    expect(freezeUntilForApi(new Date(2026, 11, 1))).toBe("2026-11-30T00:00:00Z");
  });
});
