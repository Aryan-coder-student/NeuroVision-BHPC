class ProviderRegistryError(Exception):
    code = "provider_registry_error"
    public_message = "The requested inference operation could not be completed."


class ModelNotFound(ProviderRegistryError):
    code = "model_not_found"
    public_message = "The selected model is not registered for this capability."


class ProviderNotConfigured(ProviderRegistryError):
    code = "provider_not_configured"
    public_message = "The selected model provider is not configured."


class ProviderTimeout(ProviderRegistryError):
    code = "provider_timeout"
    public_message = "The model provider timed out before returning a result."


class ProviderUnavailable(ProviderRegistryError):
    code = "provider_unavailable"
    public_message = "The model provider is currently unavailable."


class ProviderRejectedRequest(ProviderRegistryError):
    code = "provider_rejected_request"
    public_message = "The model provider rejected the inference request."


class ProviderProtocolError(ProviderRegistryError):
    code = "provider_protocol_error"
    public_message = "The model provider returned an invalid response."
