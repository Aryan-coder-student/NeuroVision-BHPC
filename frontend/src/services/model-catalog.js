export function configuredModels(models, capability) {
  if (!Array.isArray(models)) return [];
  return models.filter(model => (
    model.is_configured
    && (!capability || model.capability === capability)
  ));
}

export function modelLabel(model) {
  return `${model.name} · v${model.version}`;
}
