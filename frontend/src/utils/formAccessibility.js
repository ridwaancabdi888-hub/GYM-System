export function mergeDescribedBy(...values) {
  return [...new Set(values.flatMap((value) => String(value || '').split(/\s+/)).filter(Boolean))].join(' ') || undefined;
}

export function getFieldControlProps(props, field) {
  if (!field) return {};

  const hasError = Boolean(field.error);
  return {
    id: props.id || field.controlId,
    'aria-describedby': mergeDescribedBy(
      props['aria-describedby'],
      hasError ? field.errorId : undefined,
    ),
    'aria-invalid': props['aria-invalid'] ?? (hasError ? true : undefined),
  };
}
