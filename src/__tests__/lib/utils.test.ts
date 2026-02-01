import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names correctly", () => {
      const result = cn("text-base", "text-lg");
      expect(result).toBe("text-lg");
    });

    it("should handle conditional classes", () => {
      const result = cn("base-class", true && "conditional-class", false && "ignored-class");
      expect(result).toContain("base-class");
      expect(result).toContain("conditional-class");
      expect(result).not.toContain("ignored-class");
    });

    it("should merge tailwind classes without conflicts", () => {
      const result = cn("px-2 py-1", "px-4");
      expect(result).toContain("px-4");
      expect(result).not.toContain("px-2");
      expect(result).toContain("py-1");
    });
  });
});
