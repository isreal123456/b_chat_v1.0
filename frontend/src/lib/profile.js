export const CATEGORIES = [
  {
    value: "developer",
    label: "Developer",
    description: "Engineers, makers, and technical builders.",
  },
  {
    value: "designer",
    label: "Designer",
    description: "Product, brand, and interface designers.",
  },
];

export function categoryLabel(value) {
  return CATEGORIES.find((category) => category.value === value)?.label || "";
}
