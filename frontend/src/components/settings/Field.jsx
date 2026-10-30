import { cloneElement, isValidElement, useId } from "react";

function labelFirstControl(node, id, labelledBy) {
  if (!isValidElement(node)) return node;
  if (["input", "textarea", "select"].includes(node.type)) {
    return cloneElement(node, { id, "aria-labelledby": labelledBy });
  }
  if (!node.props.children) return node;
  return cloneElement(
    node,
    {},
    Array.isArray(node.props.children)
      ? node.props.children.map((child) => labelFirstControl(child, id, labelledBy))
      : labelFirstControl(node.props.children, id, labelledBy),
  );
}

export default function Field({ label, children, hint }) {
  const id = useId();
  return (
    <div className="field">
      <label id={`${id}-label`} htmlFor={id} className="label">
        {label}
      </label>
      {labelFirstControl(children, id, `${id}-label`)}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
