import { cn } from "./utils";

describe("cn utility", () => {
  it("combines class names correctly", () => {
    const result = cn("text-red-500", "bg-blue-500");
    expect(result).toBe("text-red-500 bg-blue-500");
  });

  it("handles conditional classes and falsy values", () => {
    const isHidden = false;
    const isVisible = true;
    const result = cn(
      "base-class",
      isHidden && "hidden",
      isVisible && "block",
      null,
      undefined
    );
    expect(result).toBe("base-class block");
  });

  it("resolves Tailwind conflicts using tailwind-merge", () => {
    const result = cn("p-4", "p-8");
    expect(result).toBe("p-8");
  });
});
